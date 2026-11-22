// @ts-nocheck

import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/errors";
import { Router } from "express";
import { clearSessionCookie, createNexconnId, hashPassword, setSessionCookie, verifyPassword } from "../lib/auth";
import { loginSchema, passwordSchema, registerSchema } from "../lib/validators";
import { privateUser } from "../lib/present";
import { requireUser } from "../middleware";

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new HttpError(409, "An account with that email already exists");
    const user = await prisma.user.create({
      data: {
        nexconnId: createNexconnId(),
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName,
        city: input.city,
        locality: input.locality,
        phone: input.phone || null,
        photoUrl: input.photoUrl || null,
        role: input.role,
        introduction: input.introduction || "",
      },
    });
    setSessionCookie(res, user.id);
    res.status(201).json({ ok: true, data: privateUser(user) });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    const matches = await verifyPassword(input.password, user?.passwordHash);
    if (!user || !matches) throw new HttpError(401, "Email or password is incorrect");
    if (user.suspended) throw new HttpError(403, "This account is suspended");
    setSessionCookie(res, user.id);
    res.json({ ok: true, data: privateUser(user) });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true, data: { loggedOut: true } });
  }),
);

authRouter.get(
  "/me",
  requireUser,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, data: privateUser(req.user!) });
  }),
);

authRouter.post(
  "/password",
  requireUser,
  asyncHandler(async (req, res) => {
    const input = passwordSchema.parse(req.body);
    const matches = await verifyPassword(input.currentPassword, req.user!.passwordHash);
    if (!matches) throw new HttpError(400, "Current password is incorrect");
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });
    res.json({ ok: true, data: { updated: true } });
  }),
);
