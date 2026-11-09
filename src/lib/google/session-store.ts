import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { GoogleConfig } from "./config";
import { decryptSession, encryptSession, type StoredSession } from "./token-vault";

function sessionKey(handle: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(handle)) throw new Error("Invalid session handle");
  return "pfh:session:" + createHash("sha256").update(handle).digest("hex");
}

async function redisCommand(config: GoogleConfig, args: string[]): Promise<unknown> {
  const response = await fetch(config.redisUrl, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.redisToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Session storage unavailable");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("result" in data)) {
    throw new Error("Unexpected session storage response");
  }
  return (data as { result: unknown }).result;
}

export const newSessionHandle = () => randomBytes(32).toString("base64url");

export async function saveSession(handle: string, session: StoredSession, config: GoogleConfig) {
  const remaining = Math.floor((session.expiresAt - Date.now()) / 1000);
  if (remaining <= 0) throw new Error("Expired session");
  const result = await redisCommand(config, [
    "SET",
    sessionKey(handle),
    encryptSession(session, config.encryptionKey),
    "EX",
    String(remaining),
  ]);
  if (result !== "OK") throw new Error("Session could not be stored");
}

export async function findSession(
  handle: string | undefined,
  config: GoogleConfig,
): Promise<StoredSession | null> {
  if (!handle || !/^[A-Za-z0-9_-]{43}$/.test(handle)) return null;
  const result = await redisCommand(config, ["GET", sessionKey(handle)]);
  if (typeof result !== "string") return null;
  const session = decryptSession(result, config.encryptionKey);
  if (
    !session ||
    session.expiresAt <= Date.now() ||
    session.email.toLowerCase() !== config.allowedEmail
  )
    return null;
  return session;
}

export async function revokeSession(handle: string | undefined, config: GoogleConfig) {
  if (handle && /^[A-Za-z0-9_-]{43}$/.test(handle)) {
    await redisCommand(config, ["DEL", sessionKey(handle)]);
  }
}
