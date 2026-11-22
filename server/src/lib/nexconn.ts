import crypto from "crypto";
import { HttpError } from "./errors";

/**
 * Server-side Nexconn Platform Chat API.
 * Signature: SHA1(App Secret + Nonce + Timestamp)
 * Docs: https://docs.nexconn.ai/platform-chat-api/prepare-to-use-api/auth
 * Token: POST /v4/auth/access-token/issue
 * Group: POST /v4/group-channel/create
 */

export function nexconnConfigured() {
  return Boolean(process.env.NEXCONN_APP_KEY && process.env.NEXCONN_APP_SECRET);
}

function apiHost() {
  return process.env.NEXCONN_API_HOST || "api.sg-light-api.com";
}

function signedHeaders() {
  const appKey = process.env.NEXCONN_APP_KEY;
  const appSecret = process.env.NEXCONN_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new HttpError(503, "Nexconn is not configured");
  }
  const nonce = crypto.randomBytes(6).toString("hex").slice(0, 18);
  const timestamp = Date.now().toString();
  const signature = crypto.createHash("sha1").update(`${appSecret}${nonce}${timestamp}`).digest("hex");
  return {
    "App-Key": appKey,
    Nonce: nonce,
    Timestamp: timestamp,
    Signature: signature,
    "Content-Type": "application/json",
    "X-Request-ID": crypto.randomUUID().replace(/-/g, "").slice(0, 32),
  };
}

export async function nexconnPost(path: string, body: unknown) {
  const response = await fetch(`https://${apiHost()}${path}`, {
    method: "POST",
    headers: signedHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { httpStatus: response.status, data };
}

function tokenFromPayload(data: Record<string, unknown>) {
  const result = data.result as { accessToken?: string; userId?: string } | undefined;
  return result?.accessToken || (data.token as string | undefined) || (data.accessToken as string | undefined);
}

export async function issueAccessToken(userId: string, name: string, avatarUrl?: string | null) {
  const safeName = name.replace(/\s+/g, " ").trim().slice(0, 64) || "HelpLoop member";
  const body: Record<string, string> = { userId, name: safeName };
  if (avatarUrl && /^https?:\/\//.test(avatarUrl) && avatarUrl.length <= 1024) {
    body.avatarUrl = avatarUrl;
  }
  const { httpStatus, data } = await nexconnPost("/v4/auth/access-token/issue", body);
  const token = tokenFromPayload(data);
  const code = data.code;
  const ok = (code === 0 || code === 200) && Boolean(token);
  if (!ok) {
    console.error("Nexconn token issue failed", { httpStatus, code, msg: data.msg || data.message });
    throw new HttpError(502, "Nexconn could not issue a chat token");
  }
  return token as string;
}

export async function createNexconnGroup(input: {
  channelId: string;
  name: string;
  owner: string;
  introduction: string;
  userIds?: string[];
}) {
  const { httpStatus, data } = await nexconnPost("/v4/group-channel/create", {
    channelId: input.channelId,
    name: input.name.slice(0, 64),
    owner: input.owner,
    userIds: input.userIds ?? [],
    groupProfile: {
      introduction: input.introduction.slice(0, 512),
    },
    permissions: {
      joinPerm: 1,
      invitePerm: 0,
      memInvitePerm: 1,
    },
  });
  if (data.code !== 0) {
    console.error("Nexconn group create failed", { httpStatus, code: data.code, msg: data.msg || data.message });
    return false;
  }
  return true;
}
