#!/usr/bin/env node

/**
 * Mirror the upstream NCP-VGC-Damage-Calculator gen-10 setdex into our
 * local frontend bundle as an ES module.
 *
 * Source:
 *   https://raw.githubusercontent.com/Nerd-of-Now/NCP-VGC-Damage-Calculator/master/script_res/setdex_ncp-g10.js
 *
 * Writes:
 *   frontend/src/data/setdex-gen10.ts
 *
 * Transformation is intentionally minimal:
 *   - Replace the leading `var SETDEX_GEN10 = ` with `export const SETDEX_GEN10 = `.
 *   - Strip a trailing semicolon if upstream has one (our checked-in file ends
 *     without `;` after the closing `}`).
 *
 * Usage: node scripts/update-setdex-gen10.js
 *        (or: cd frontend && npm run update:setdex-gen10)
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const UPSTREAM_URL =
  "https://raw.githubusercontent.com/Nerd-of-Now/NCP-VGC-Damage-Calculator/master/script_res/setdex_ncp-g10.js";
const OUT_PATH = resolve(ROOT, "frontend/src/data/setdex-gen10.ts");

// Use curl for parity with scripts/generate-tournament-teams.js — keeps the
// developer-local DX consistent across all data-refresh scripts and avoids
// Node-fetch TLS issues on corporate-MITM dev boxes.
function fetchUpstream() {
  const stdout = execFileSync(
    "curl",
    ["-sSf", "--max-time", "60", UPSTREAM_URL],
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );

  if (!stdout || stdout.length < 100) {
    throw new Error(
      `Upstream fetch returned suspiciously short body (${stdout?.length ?? 0} bytes). Aborting.`,
    );
  }

  return stdout;
}

function transformToEsModule(text) {
  if (!/^var\s+SETDEX_GEN10\s*=\s*/.test(text)) {
    throw new Error(
      "Upstream file no longer starts with `var SETDEX_GEN10 = ` — aborting to avoid corrupting the local copy.",
    );
  }

  return text
    .replace(/^var\s+SETDEX_GEN10\s*=\s*/, "export const SETDEX_GEN10 = ")
    .replace(/;\s*$/, "");
}

function main() {
  console.log(`Fetching ${UPSTREAM_URL}…`);
  const raw = fetchUpstream();
  const transformed = transformToEsModule(raw);
  writeFileSync(OUT_PATH, transformed);
  console.log(`  Wrote ${transformed.length} bytes → ${OUT_PATH}`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
