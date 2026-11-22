// @ts-nocheck

import type { Prisma, RequestStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/errors";
import { offerSchema, offerUpdateSchema, requestSchema, requestStatusSchema } from "../lib/validators";
import { categories, urgencies } from "../lib/validators";
import { canVolunteer, matchRequest, publicUser } from "../lib/present";
import { blockedEitherWay, blockedUserIds, ensureChatUsers, notify, syncRequestStatus } from "../lib/domain";
import { optionalUser, requireUser } from "../middleware";
import { z } from "zod";

import { Router } from "express";


export const requestsRouter = Router();

const ACTIVE: RequestStatus[] = ["OPEN", "VOLUNTEER_INTERESTED", "ASSIGNED", "IN_PROGRESS"];

function presentRequest(request: {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  city: string;
  locality: string;
  preferredDate: Date | null;
  preferredTime: string | null;
  urgency: string;
  volunteerCount: number;
  imageUrl: string | null;
  instructions: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  owner: Parameters<typeof publicUser>[0];
  _count?: { offers: number; connections: number };
}) {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    category: request.category,
    location: request.location,
    city: request.city,
    locality: request.locality,
    preferredDate: request.preferredDate,
    preferredTime: request.preferredTime,
    urgency: request.urgency,
    volunteerCount: request.volunteerCount,
    imageUrl: request.imageUrl,
    instructions: request.instructions,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    owner: publicUser(request.owner),
    offerCount: request._count?.offers ?? 0,
    connectionCount: request._count?.connections ?? 0,
  };
}

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.enum(categories).optional(),
  urgency: z.enum(urgencies).optional(),
  city: z.string().trim().max(80).optional(),
  status: z.string().optional(),
  sort: z.enum(["newest", "urgency"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(9),
});

requestsRouter.get(
  "/",
  optionalUser,
  asyncHandler(async (req, res) => {
    const query = listQuery.parse(req.query);
    const where: Prisma.HelpRequestWhereInput = {};
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.urgency) where.urgency = query.urgency;
    if (query.city) where.city = { contains: query.city, mode: "insensitive" };
    if (query.status && query.status !== "ALL") {
      const parsed = z.enum(["OPEN", "VOLUNTEER_INTERESTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "CLOSED"]).safeParse(query.status);
      if (!parsed.success) throw new HttpError(400, "Unknown status filter");
      where.status = parsed.data;
    } else if (!query.status) {
      where.status = { in: ACTIVE };
    }
    if (req.user) {
      const hidden = await blockedUserIds(req.user.id);
      if (hidden.length) where.ownerId = { notIn: hidden };
    }
    const orderBy: Prisma.HelpRequestOrderByWithRelationInput[] =
      query.sort === "urgency" ? [{ urgency: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];
    const [total, items] = await Promise.all([
      prisma.helpRequest.count({ where }),
      prisma.helpRequest.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { owner: true, _count: { select: { offers: true, connections: true } } },
      }),
    ]);
    res.json({
      ok: true,
      data: {
        items: items.map(presentRequest),
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    });
  }),
);

requestsRouter.get(
  "/recommended",
  requireUser,
  asyncHandler(async (req, res) => {
    if (!canVolunteer(req.user!.role)) {
      res.json({ ok: true, data: [] });
      return;
    }
    const hidden = await blockedUserIds(req.user!.id);
    const requests = await prisma.helpRequest.findMany({
      where: {
        ownerId: { not: req.user!.id, notIn: hidden },
        status: { in: ACTIVE },
        offers: { none: { volunteerId: req.user!.id } },
      },
      include: { owner: true, _count: { select: { offers: true, connections: true } } },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    const ranked = requests
      .map((request) => ({ request, ...matchRequest(req.user!, request) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((item) => ({ ...presentRequest(item.request), score: item.score, explanation: item.explanation }));
    res.json({ ok: true, data: ranked });
  }),
);

requestsRouter.get(
  "/mine",
  requireUser,
  asyncHandler(async (req, res) => {
    const items = await prisma.helpRequest.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { owner: true, _count: { select: { offers: true, connections: true } } },
    });
    res.json({ ok: true, data: items.map(presentRequest) });
  }),
);

requestsRouter.post(
  "/",
  requireUser,
  asyncHandler(async (req, res) => {
    const input = requestSchema.parse(req.body);
    const created = await prisma.helpRequest.create({
      data: {
        ownerId: req.user!.id,
        title: input.title,
        description: input.description,
        category: input.category,
        location: input.location,
        city: input.city,
        locality: input.locality,
        preferredDate: input.preferredDate ? new Date(`${input.preferredDate}T00:00:00.000Z`) : null,
        preferredTime: input.preferredTime || null,
        urgency: input.urgency,
        volunteerCount: input.volunteerCount,
        imageUrl: input.imageUrl || null,
        instructions: input.instructions || null,
      },
      include: { owner: true, _count: { select: { offers: true, connections: true } } },
    });
    res.status(201).json({ ok: true, data: presentRequest(created) });
  }),
);

requestsRouter.get(
  "/:id",
  optionalUser,
  asyncHandler(async (req, res) => {
    const request = await prisma.helpRequest.findUnique({
      where: { id: String(req.params.id) },
      include: {
        owner: true,
        _count: { select: { offers: true, connections: true } },
        offers: { include: { volunteer: true }, orderBy: { createdAt: "desc" } },
        connections: {
          include: {
            seeker: true,
            volunteer: true,
          },
        },
      },
    });
    if (!request) throw new HttpError(404, "Request not found");
    if (req.user && (await blockedEitherWay(req.user.id, request.ownerId)) && req.user.id !== request.ownerId) {
      throw new HttpError(404, "Request not found");
    }
    const isOwner = req.user?.id === request.ownerId;
    const isAdmin = req.user?.role === "ADMIN";
    const visibleOffers = request.offers.filter((offer) => isOwner || isAdmin || offer.volunteerId === req.user?.id);
    let explanation: string | null = null;
    if (req.user && canVolunteer(req.user.role) && req.user.id !== request.ownerId) {
      explanation = matchRequest(req.user, request).explanation;
    }
    res.json({
      ok: true,
      data: {
        ...presentRequest(request),
        explanation,
        offers: visibleOffers.map((offer) => ({
          id: offer.id,
          message: offer.message,
          status: offer.status,
          createdAt: offer.createdAt,
          volunteer: publicUser(offer.volunteer),
        })),
        connections: (isOwner || isAdmin || request.connections.some((item) => item.volunteerId === req.user?.id)
          ? request.connections
          : []
        ).map((connection) => ({
          id: connection.id,
          createdAt: connection.createdAt,
          seeker: publicUser(connection.seeker),
          volunteer: publicUser(connection.volunteer),
        })),
      },
    });
  }),
);

requestsRouter.patch(
  "/:id",
  requireUser,
  asyncHandler(async (req, res) => {
    const existing = await prisma.helpRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new HttpError(404, "Request not found");
    if (existing.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "You can only edit your own request");
    }
    if (["COMPLETED", "CANCELLED", "CLOSED"].includes(existing.status) && req.user!.role !== "ADMIN") {
      throw new HttpError(400, "This request can no longer be edited");
    }
    const input = requestSchema.partial().parse(req.body);
    const updated = await prisma.helpRequest.update({
      where: { id: existing.id },
      data: {
        ...input,
        preferredDate: input.preferredDate === undefined ? undefined : input.preferredDate ? new Date(`${input.preferredDate}T00:00:00.000Z`) : null,
        preferredTime: input.preferredTime === undefined ? undefined : input.preferredTime || null,
        imageUrl: input.imageUrl === undefined ? undefined : input.imageUrl || null,
        instructions: input.instructions === undefined ? undefined : input.instructions || null,
      },
      include: { owner: true, _count: { select: { offers: true, connections: true } } },
    });
    res.json({ ok: true, data: presentRequest(updated) });
  }),
);

requestsRouter.post(
  "/:id/status",
  requireUser,
  asyncHandler(async (req, res) => {
    const existing = await prisma.helpRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { connections: true, offers: true },
    });
    if (!existing) throw new HttpError(404, "Request not found");
    if (existing.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "You can only update your own request");
    }
    const { status } = requestStatusSchema.parse(req.body);
    if (req.user!.role !== "ADMIN" && !["IN_PROGRESS", "COMPLETED", "CANCELLED", "CLOSED"].includes(status)) {
      throw new HttpError(400, "That status change is not available");
    }
    if ((status === "IN_PROGRESS" || status === "COMPLETED") && !existing.connections.length && req.user!.role !== "ADMIN") {
      throw new HttpError(400, "Accept a volunteer before moving this request forward");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.helpRequest.update({
        where: { id: existing.id },
        data: { status },
        include: { owner: true, _count: { select: { offers: true, connections: true } } },
      });
      if (status === "COMPLETED" || status === "CANCELLED" || status === "CLOSED") {
        const recipients = new Set(existing.connections.map((item) => item.volunteerId));
        existing.offers.filter((offer) => offer.status === "PENDING").forEach((offer) => recipients.add(offer.volunteerId));
        for (const userId of recipients) {
          await notify(tx, {
            userId,
            type: status === "COMPLETED" ? "REQUEST_COMPLETED" : "SYSTEM",
            title: status === "COMPLETED" ? "Request completed" : "Request updated",
            body: `${existing.title} is now ${status.toLowerCase().replaceAll("_", " ")}.`,
            link: `/requests/${existing.id}`,
          });
        }
      }
      return request;
    });
    res.json({ ok: true, data: presentRequest(updated) });
  }),
);

requestsRouter.delete(
  "/:id",
  requireUser,
  asyncHandler(async (req, res) => {
    const existing = await prisma.helpRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { _count: { select: { connections: true } } },
    });
    if (!existing) throw new HttpError(404, "Request not found");
    if (existing.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "You can only delete your own request");
    }
    if (existing._count.connections > 0) {
      throw new HttpError(409, "Cancel this request instead. Volunteers are already connected.");
    }
    await prisma.helpRequest.delete({ where: { id: existing.id } });
    res.json({ ok: true, data: { deleted: true } });
  }),
);

requestsRouter.post(
  "/:id/offers",
  requireUser,
  asyncHandler(async (req, res) => {
    const input = offerSchema.parse(req.body);
    const request = await prisma.helpRequest.findUnique({ where: { id: String(req.params.id) }, include: { owner: true } });
    if (!request) throw new HttpError(404, "Request not found");
    if (!canVolunteer(req.user!.role)) throw new HttpError(403, "Switch your role to Volunteer or Both before offering help");
    if (request.ownerId === req.user!.id) throw new HttpError(400, "You cannot offer help on your own request");
    if (["CANCELLED", "CLOSED", "COMPLETED"].includes(request.status)) {
      throw new HttpError(400, "This request is not accepting offers");
    }
    if (await blockedEitherWay(req.user!.id, request.ownerId)) throw new HttpError(403, "You cannot offer help to this person");
    const accepted = await prisma.volunteerOffer.count({ where: { requestId: request.id, status: "ACCEPTED" } });
    if (accepted >= request.volunteerCount) throw new HttpError(409, "This request already has enough volunteers");
    try {
      const offer = await prisma.$transaction(async (tx) => {
        const created = await tx.volunteerOffer.create({
          data: { requestId: request.id, volunteerId: req.user!.id, message: input.message || "" },
          include: { volunteer: true },
        });
        await syncRequestStatus(tx, request.id);
        await notify(tx, {
          userId: request.ownerId,
          type: "OFFER_RECEIVED",
          title: "New volunteer offer",
          body: `${req.user!.fullName} offered to help with “${request.title}”.`,
          link: `/requests/${request.id}`,
        });
        return created;
      });
      res.status(201).json({
        ok: true,
        data: {
          id: offer.id,
          message: offer.message,
          status: offer.status,
          createdAt: offer.createdAt,
          volunteer: publicUser(offer.volunteer),
        },
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
        throw new HttpError(409, "You already offered help on this request");
      }
      throw error;
    }
  }),
);

requestsRouter.get(
  "/:id/offers",
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await prisma.helpRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!request) throw new HttpError(404, "Request not found");
    if (request.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "Only the request owner can view every offer");
    }
    const offers = await prisma.volunteerOffer.findMany({
      where: { requestId: request.id },
      include: { volunteer: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      ok: true,
      data: offers.map((offer) => ({
        id: offer.id,
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt,
        volunteer: publicUser(offer.volunteer),
      })),
    });
  }),
);

export const offersRouter = Router();

offersRouter.get(
  "/mine",
  requireUser,
  asyncHandler(async (req, res) => {
    const offers = await prisma.volunteerOffer.findMany({
      where: { volunteerId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { request: { include: { owner: true, _count: { select: { offers: true, connections: true } } } } },
    });
    res.json({
      ok: true,
      data: offers.map((offer) => ({
        id: offer.id,
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt,
        request: presentRequest(offer.request),
      })),
    });
  }),
);

offersRouter.patch(
  "/:id",
  requireUser,
  asyncHandler(async (req, res) => {
    const input = offerUpdateSchema.parse(req.body);
    const offer = await prisma.volunteerOffer.findUnique({
      where: { id: String(req.params.id) },
      include: { request: { include: { owner: true } }, volunteer: true },
    });
    if (!offer) throw new HttpError(404, "Offer not found");
    const isOwner = offer.request.ownerId === req.user!.id;
    const isVolunteer = offer.volunteerId === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";
    if (input.status === "WITHDRAWN" && !isVolunteer && !isAdmin) throw new HttpError(403, "You can only withdraw your own offer");
    if ((input.status === "ACCEPTED" || input.status === "REJECTED") && !isOwner && !isAdmin) {
      throw new HttpError(403, "Only the request owner can respond to an offer");
    }
    if (offer.status !== "PENDING" && !(isAdmin && input.status === "REJECTED")) {
      throw new HttpError(400, "This offer has already been resolved");
    }
    if (["CANCELLED", "CLOSED", "COMPLETED"].includes(offer.request.status)) {
      throw new HttpError(400, "This request is no longer open");
    }
    if (input.status === "ACCEPTED") {
      const accepted = await prisma.volunteerOffer.count({ where: { requestId: offer.requestId, status: "ACCEPTED" } });
      if (accepted >= offer.request.volunteerCount) throw new HttpError(409, "This request already has enough volunteers");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.volunteerOffer.update({ where: { id: offer.id }, data: { status: input.status } });
      if (input.status === "ACCEPTED") {
        await tx.helpConnection.create({
          data: {
            requestId: offer.requestId,
            offerId: offer.id,
            seekerId: offer.request.ownerId,
            volunteerId: offer.volunteerId,
          },
        });
        await notify(tx, {
          userId: offer.volunteerId,
          type: "OFFER_ACCEPTED",
          title: "Your offer was accepted",
          body: `${offer.request.owner.fullName} accepted your help for “${offer.request.title}”. You can message them now.`,
          link: `/requests/${offer.requestId}`,
        });
        await notify(tx, {
          userId: offer.request.ownerId,
          type: "REQUEST_ASSIGNED",
          title: "Volunteer assigned",
          body: `${offer.volunteer.fullName} is now connected on “${offer.request.title}”.`,
          link: `/messages`,
        });
      }
      if (input.status === "REJECTED") {
        await notify(tx, {
          userId: offer.volunteerId,
          type: "OFFER_REJECTED",
          title: "Offer not accepted",
          body: `Your offer on “${offer.request.title}” was not accepted.`,
          link: `/volunteering`,
        });
      }
      await syncRequestStatus(tx, offer.requestId);
      return next;
    });

    if (input.status === "ACCEPTED") {
      try {
        await ensureChatUsers([
          { nexconnId: offer.request.owner.nexconnId, fullName: offer.request.owner.fullName, photoUrl: offer.request.owner.photoUrl },
          { nexconnId: offer.volunteer.nexconnId, fullName: offer.volunteer.fullName, photoUrl: offer.volunteer.photoUrl },
        ]);
      } catch (error) {
        console.error("Nexconn user registration failed after offer acceptance", error);
      }
    }

    res.json({ ok: true, data: { id: updated.id, status: updated.status } });
  }),
);
