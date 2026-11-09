import "server-only";
import { validateSpreadsheetId } from "./sheets";

export interface GoogleConfig {
  origin: string;
  clientId: string;
  clientSecret: string;
  allowedEmail: string;
  spreadsheetId: string;
  encryptionKey: Buffer;
  redisUrl: string;
  redisToken: string;
}

export function googleConfig(): GoogleConfig | null {
  if (process.env.GOOGLE_INTEGRATION_ENABLED !== "true") return null;
  const required = [
    "APP_ORIGIN",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "ALLOWED_GOOGLE_EMAIL",
    "FINANCE_SPREADSHEET_ID",
    "SESSION_ENCRYPTION_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ] as const;
  if (required.some((name) => !process.env[name])) {
    throw new Error("Google integration is missing required server configuration");
  }
  const origin = new URL(process.env.APP_ORIGIN!);
  const localDev = process.env.NODE_ENV !== "production" && origin.origin === "http://localhost:3000";
  if (
    origin.toString() !== origin.origin + "/" ||
    (!localDev && origin.protocol !== "https:")
  )
    throw new Error("APP_ORIGIN must be an HTTPS origin");
  const redis = new URL(process.env.UPSTASH_REDIS_REST_URL!);
  if (redis.protocol !== "https:" || !redis.hostname.endsWith(".upstash.io") || redis.pathname !== "/") {
    throw new Error("Invalid session storage endpoint");
  }
  const encryptionKey = Buffer.from(process.env.SESSION_ENCRYPTION_KEY!, "base64");
  if (encryptionKey.length !== 32) throw new Error("Invalid session encryption key");
  const allowedEmail = process.env.ALLOWED_GOOGLE_EMAIL!.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allowedEmail)) {
    throw new Error("Invalid allowed Google identity");
  }
  return {
    origin: origin.origin,
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    allowedEmail,
    spreadsheetId: validateSpreadsheetId(process.env.FINANCE_SPREADSHEET_ID!),
    encryptionKey,
    redisUrl: redis.origin,
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN!,
  };
}
