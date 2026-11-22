import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { createNexconnGroup, issueAccessToken, nexconnConfigured } from "./nexconn";

type Db = Prisma.TransactionClient | typeof prisma;

const CLOSED = new Set(["COMPLETED", "CANCELLED", "CLOSED"]);

export async function syncRequestStatus(db: Db, requestId: string) {
  const request = await db.helpRequest.findUnique({ where: { id: requestId } });
  if (!request || CLOSED.has(request.status)) return request;
  const offers = await db.volunteerOffer.findMany({ where: { requestId } });
  const accepted = offers.filter((offer) => offer.status === "ACCEPTED").length;
  const pending = offers.filter((offer) => offer.status === "PENDING").length;
  let status: "OPEN" | "VOLUNTEER_INTERESTED" | "ASSIGNED" | "IN_PROGRESS" = "OPEN";
  if (accepted > 0 && request.status === "IN_PROGRESS") status = "IN_PROGRESS";
  else if (accepted > 0) status = "ASSIGNED";
  else if (pending > 0) status = "VOLUNTEER_INTERESTED";
  if (status === request.status) return request;
  return db.helpRequest.update({ where: { id: requestId }, data: { status } });
}

export async function notify(
  db: Db,
  input: {
    userId: string;
    type: "OFFER_RECEIVED" | "OFFER_ACCEPTED" | "OFFER_REJECTED" | "REQUEST_ASSIGNED" | "REQUEST_COMPLETED" | "ACTIVITY_JOINED" | "ACTIVITY_UPDATE" | "SYSTEM";
    title: string;
    body: string;
    link?: string;
  },
) {
  return db.notification.create({ data: input });
}

export async function blockedEitherWay(a: string, b: string) {
  const block = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return Boolean(block);
}

export async function blockedUserIds(userId: string) {
  const rows = await prisma.blockedUser.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
  });
  return rows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId));
}

export async function ensureChatUsers(users: { nexconnId: string; fullName: string; photoUrl: string | null }[]) {
  if (!nexconnConfigured()) return false;
  for (const user of users) {
    await issueAccessToken(user.nexconnId, user.fullName, user.photoUrl);
  }
  return true;
}

export async function provisionActivityGroup(activity: {
  id: string;
  title: string;
  description: string;
  nexconnGroupId: string;
  organizer: { nexconnId: string; fullName: string; photoUrl: string | null };
}) {
  if (!nexconnConfigured()) return false;
  await issueAccessToken(activity.organizer.nexconnId, activity.organizer.fullName, activity.organizer.photoUrl);
  const ok = await createNexconnGroup({
    channelId: activity.nexconnGroupId,
    name: activity.title,
    owner: activity.organizer.nexconnId,
    introduction: activity.description,
  });
  if (ok) {
    await prisma.communityActivity.update({ where: { id: activity.id }, data: { nexconnSynced: true } });
  }
  return ok;
}

export async function audit(input: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata,
    },
  });
}
