import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

export const SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

export const storedSessionSchema = z.object({
  version: z.literal(1),
  email: z.string().email(),
  subject: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessExpiresAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export type StoredSession = z.infer<typeof storedSessionSchema>;

export function encryptSession(session: StoredSession, key: Buffer): string {
  if (key.length !== 32) throw new Error("Invalid encryption key length");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(storedSessionSchema.parse(session))),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

export function decryptSession(value: string, key: Buffer): StoredSession | null {
  if (key.length !== 32 || value.length > 8192) return null;
  const [nonce, tag, cipherText, extra] = value.split(".");
  if (!nonce || !tag || !cipherText || extra) return null;
  try {
    const iv = Buffer.from(nonce, "base64url");
    const authTag = Buffer.from(tag, "base64url");
    if (iv.length !== 12 || authTag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(cipherText, "base64url")),
      decipher.final(),
    ]);
    return storedSessionSchema.parse(JSON.parse(plaintext.toString("utf8")));
  } catch {
    return null;
  }
}
