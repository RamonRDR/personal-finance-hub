#!/usr/bin/env node
// Validates only the presence and safe shape of private staging configuration.
// Intentionally prints no credential, private Google identity or sheet identifier.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");
const required = [
  "APP_ORIGIN",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ALLOWED_GOOGLE_EMAIL",
  "FINANCE_SPREADSHEET_ID",
  "SESSION_ENCRYPTION_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];
const missing = required.filter((name) => !process.env[name]);
const errors = [];
if (process.env.GOOGLE_INTEGRATION_ENABLED !== "true")
  errors.push("Google integration is not enabled in the current environment");
if (missing.length) errors.push("Missing server-side variables: " + missing.join(", "));
if (!missing.includes("APP_ORIGIN")) {
  try {
    const origin = new URL(process.env.APP_ORIGIN);
    if (origin.protocol !== "https:" || origin.origin + "/" !== origin.href)
      errors.push("APP_ORIGIN must be a canonical HTTPS origin");
  } catch {
    errors.push("APP_ORIGIN is not a valid URL");
  }
}
if (!missing.includes("SESSION_ENCRYPTION_KEY")) {
  if (Buffer.from(process.env.SESSION_ENCRYPTION_KEY, "base64").length !== 32)
    errors.push("SESSION_ENCRYPTION_KEY must decode to 32 bytes");
}
if (!missing.includes("UPSTASH_REDIS_REST_URL")) {
  try {
    const endpoint = new URL(process.env.UPSTASH_REDIS_REST_URL);
    if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".upstash.io"))
      errors.push("Redis endpoint must be HTTPS and hosted by Upstash");
  } catch {
    errors.push("Invalid Redis endpoint");
  }
}
if (errors.length) {
  console.error("Private Google staging is NOT ready:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("Private staging configuration appears complete for " + packageJson.name + ".");
  console.log("No Google authorization, network request or workbook validation was performed.");
}
