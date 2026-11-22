// @ts-nocheck

import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/errors";
import { Router } from "express";
import { profileSchema } from "../lib/validators";
import { canVolunteer, matchRequest, privateUser, profileCompletion, publicUser } from "../lib/present";
import { requireUser } from "../middleware";

export const usersRouter = Router();

usersRouter.get(
  "/me",
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [requestsCreated, offersMade, completedHelps, activitiesJoined] = await Promise.all([
      prisma.helpRequest.count({ where: { ownerId: user.id } }),
      prisma.volunteerOffer.count({ where: { volunteerId: user.id } }),
      prisma.helpConnection.count({ where: { volunteerId: user.id, request: { status: "COMPLETED" } } }),
      prisma.activityParticipant.count({ where: { userId: user.id } }),
    ]);
    res.json({
      ok: true,
      data: {
        ...privateUser(user),
        profileCompletion: profileCompletion(user),
        stats: { requestsCreated, offersMade, completedHelps, activitiesJoined },
      },
    });
  }),
);

usersRouter.patch(
  "/me",
  requireUser,
  asyncHandler(async (req, res) => {
    const input = profileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...input,
        phone: input.phone === undefined ? undefined : input.phone || null,
        photoUrl: input.photoUrl === undefined ? undefined : input.photoUrl || null,
      },
    });
    res.json({ ok: true, data: { ...privateUser(user), profileCompletion: profileCompletion(user) } });
  }),
);

usersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!user || user.suspended) throw new HttpError(404, "Person not found");
    const [requests, helps, activities, requestsCreated, completedHelps, activitiesJoined] = await Promise.all([
      prisma.helpRequest.findMany({
        where: { ownerId: user.id, status: { notIn: ["CANCELLED", "CLOSED"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, title: true, category: true, status: true, city: true, createdAt: true },
      }),
      prisma.helpConnection.findMany({
        where: { volunteerId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { request: { select: { id: true, title: true, status: true, category: true } } },
      }),
      prisma.activityParticipant.findMany({
        where: { userId: user.id },
        orderBy: { joinedAt: "desc" },
        take: 6,
        include: { activity: { select: { id: true, title: true, status: true, activityDate: true } } },
      }),
      prisma.helpRequest.count({ where: { ownerId: user.id } }),
      prisma.helpConnection.count({ where: { volunteerId: user.id, request: { status: "COMPLETED" } } }),
      prisma.activityParticipant.count({ where: { userId: user.id } }),
    ]);
    res.json({
      ok: true,
      data: {
        ...publicUser(user),
        stats: {
          requestsCreated,
          completedHelps,
          activitiesJoined,
        },
        recentRequests: requests,
        recentHelps: helps.map((help) => help.request),
        recentActivities: activities.map((row) => row.activity),
      },
    });
  }),
);

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [requestsCreated, activeRequests, offersMade, acceptedOffers, completedTasks, incomingPending, outgoingPending, notifications, connections, activities, openRequests] =
      await Promise.all([
        prisma.helpRequest.count({ where: { ownerId: user.id } }),
        prisma.helpRequest.count({
          where: { ownerId: user.id, status: { in: ["OPEN", "VOLUNTEER_INTERESTED", "ASSIGNED", "IN_PROGRESS"] } },
        }),
        prisma.volunteerOffer.count({ where: { volunteerId: user.id } }),
        prisma.volunteerOffer.count({ where: { volunteerId: user.id, status: "ACCEPTED" } }),
        prisma.helpRequest.count({ where: { ownerId: user.id, status: "COMPLETED" } }),
        prisma.volunteerOffer.count({ where: { status: "PENDING", request: { ownerId: user.id } } }),
        prisma.volunteerOffer.count({ where: { volunteerId: user.id, status: "PENDING" } }),
        prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.helpConnection.findMany({
          where: { OR: [{ seekerId: user.id }, { volunteerId: user.id }] },
          orderBy: { createdAt: "desc" },
          take: 4,
          include: {
            request: { select: { id: true, title: true } },
            seeker: { select: { id: true, fullName: true, photoUrl: true, nexconnId: true } },
            volunteer: { select: { id: true, fullName: true, photoUrl: true, nexconnId: true } },
          },
        }),
        prisma.communityActivity.findMany({
          where: { OR: [{ organizerId: user.id }, { participants: { some: { userId: user.id } } }] },
          orderBy: { activityDate: "asc" },
          take: 4,
          include: { _count: { select: { participants: true } } },
        }),
        canVolunteer(user.role)
          ? prisma.helpRequest.findMany({
              where: {
                ownerId: { not: user.id },
                status: { in: ["OPEN", "VOLUNTEER_INTERESTED", "ASSIGNED", "IN_PROGRESS"] },
                offers: { none: { volunteerId: user.id } },
              },
              include: { owner: true },
              take: 40,
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
      ]);

    const recommendations = openRequests
      .map((request) => ({ request, ...matchRequest(user, request) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => ({
        id: item.request.id,
        title: item.request.title,
        category: item.request.category,
        city: item.request.city,
        locality: item.request.locality,
        urgency: item.request.urgency,
        score: item.score,
        explanation: item.explanation,
      }));

    res.json({
      ok: true,
      data: {
        welcomeName: user.fullName,
        profileCompletion: profileCompletion(user),
        onboardingDone: user.onboardingDone,
        stats: {
          requestsCreated,
          activeRequests,
          offersMade,
          acceptedOffers,
          completedTasks,
          pendingActions: incomingPending + outgoingPending,
        },
        notifications,
        conversations: [
          ...connections.map((connection) => {
            const peer = connection.seekerId === user.id ? connection.volunteer : connection.seeker;
            return {
              kind: "direct" as const,
              id: connection.id,
              title: connection.request.title,
              requestId: connection.request.id,
              peer,
            };
          }),
          ...activities.map((activity) => ({
            kind: "group" as const,
            id: activity.id,
            title: activity.title,
            nexconnGroupId: activity.nexconnGroupId,
            nexconnSynced: activity.nexconnSynced,
            memberCount: activity._count.participants,
          })),
        ],
        recommendations,
      },
    });
  }),
);
