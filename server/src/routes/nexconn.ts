// server/src/routes/nexconn.ts
import { Router } from "express";
import { requireUser } from "../middleware";
import { asyncHandler } from "../lib/errors";
import { issueAccessToken, createNexconnGroup } from "../lib/nexconn";

export const nexconnRouter = Router();

// Issue a chat token for the currently authenticated user
nexconnRouter.post(
  "/token",
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const token = await issueAccessToken(user.id, user.fullName, user.photoUrl);
    res.json({ ok: true, data: { token } });
  })
);

// Example: create a group (used by front‑end when a community activity is created)
nexconnRouter.post(
  "/group",
  requireUser,
  asyncHandler(async (req, res) => {
    const { channelId, name, introduction, userIds } = req.body;
    const success = await createNexconnGroup({
      channelId,
      name,
      owner: req.user!.nexconnId,
      introduction,
      userIds,
    });
    res.json({ ok: true, data: { created: success } });
  })
);

