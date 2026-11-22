// server/src/index.ts
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables before anything that reads them.
// `server/.env` wins over the repo-root `.env`.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

// Imported after dotenv so `DATABASE_URL` / `SESSION_SECRET` are available.
import { prisma } from "./lib/prisma";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { requestsRouter } from "./routes/requests";
import { nexconnRouter } from "./routes/nexconn";
import { errorHandler, notFound } from "./lib/errors";

const app = express();

const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  }),
);

// Help-request images are submitted as base64 data URLs, so allow a larger body.
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, data: { status: "up" } });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/requests", requestsRouter);
app.use("/nexconn", nexconnRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 4000);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down…`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

export { app };
