import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Resolve relative to this file, not the process cwd, so the same env is loaded
// whether the server is started via `npm run dev -w server`, `npm start`, or tsx.
const serverRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(serverRoot, "..");

// First file to define a key wins; `server/.env` takes precedence over the root.
dotenv.config({ path: path.join(serverRoot, ".env") });
dotenv.config({ path: path.join(repoRoot, ".env") });

export const prisma = new PrismaClient();
