import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import { HttpError } from "./errors";

let dummyHash: string | null = null;

export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new HttpError(500, "Server session secret is not configured");
  }
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash?: string | null) {
  if (!dummyHash) dummyHash = await bcrypt.hash("helploop-missing-user", 12);
  return bcrypt.compare(password, passwordHash || dummyHash);
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, sessionSecret(), { expiresIn: "7d" });
}

export function readToken(token: string) {
  return jwt.verify(token, sessionSecret()) as { sub: string };
}

export function setSessionCookie(res: Response, userId: string) {
  res.cookie("token", signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie("token", { path: "/" });
}

export function createNexconnId() {
  return `u${crypto.randomBytes(12).toString("hex")}`;
}

export function createGroupId() {
  return `g${crypto.randomBytes(8).toString("hex")}`;
}
