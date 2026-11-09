import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
const manifest = readFileSync("src/app/manifest.ts", "utf8");
const worker = readFileSync("public/sw.js", "utf8");
assert.match(manifest, /display:\s*"standalone"/);
assert.match(manifest, /start_url:/);
assert.match(manifest, /192x192/);
assert.match(manifest, /512x512/);
assert.match(worker, /_next\/static/);
assert.doesNotMatch(worker, /caches\.open\("financial/);
for (const size of [32, 180, 192, 512]) {
  assert.ok(existsSync("public/icons/icon-" + size + ".png"));
}
console.log("Static PWA invariants passed.");
