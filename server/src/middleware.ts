import type { NextFunction, Request, Response } from "express";
import { prisma } from "./lib/prisma";
import { readToken } from "./lib/auth";
import { HttpError } from "./lib/errors";

async function attachUser(req: Request) {
  const token = req.cookies?.token as string | undefined;
  if (!token) return;
  const payload = readToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (user && !user.suspended) req.user = user;
}

export async function optionalUser(req: Request, _res: Response, next: NextFunction) {
  try {
    await attachUser(req);
  } catch {
    req.user = undefined;
  }
  next();
}

export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  try {
    await attachUser(req);
    if (!req.user) throw new HttpError(401, "Sign in required");
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Sign in required"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return next(new HttpError(403, "Admin access required"));
  next();
}
