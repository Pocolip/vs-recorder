/**
 * Polite JSON-over-curl client for the direct tournament sources.
 *
 * Uses curl rather than Node's fetch for the same reason the LabMaus fetch
 * always has: fetch trips over corporate MITM TLS proxies on some dev
 * machines, while curl honors the system trust store everywhere.
 *
 * Requests are spaced per host (Limitless allows 50 requests / 5 min without
 * a key) and the IETF `ratelimit` header (`"50-in-5min"; r=<remaining>;
 * t=<reset seconds>`) is honored: when the budget hits zero, or on a 429, we
 * sleep until the window resets instead of failing.
 *
 * Callers can pass extra request headers (e.g. Limitless' `X-Access-Key`)
 * and a custom per-host spacing. Headers are written to a temp file and
 * handed to curl with `-H @file`, so secrets never appear in argv/ps output
 * or in logged URLs.
 */

import { execFile } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const USER_AGENT =
  "vs-recorder-data-refresh (+https://github.com/Pocolip/vs-recorder)";

// Minimum spacing between requests to the same host. 6.5s keeps Limitless
// at ≤ 46 requests per 5-minute window, under its 50 limit.
const HOST_SPACING_MS = {
  "play.limitlesstcg.com": 6500,
  "standings.reportworm.com": 1000,
};
const DEFAULT_SPACING_MS = 1000;
const MAX_ATTEMPTS = 4;

const lastRequestAt = new Map();

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Parse `"50-in-5min"; r=49; t=300` → { remaining: 49, reset: 300 }. */
export function parseRateLimit(header) {
  if (typeof header !== "string") return null;
  const remaining = header.match(/(?:^|;)\s*r=(\d+)/);
  const reset = header.match(/(?:^|;)\s*t=(\d+)/);
  if (!remaining && !reset) return null;
  return {
    remaining: remaining ? Number(remaining[1]) : null,
    reset: reset ? Number(reset[1]) : null,
  };
}

function parseHeaders(raw) {
  // With redirects curl prints several header blocks; keep the last one.
  const blocks = raw.split(/\r?\n\r?\n/).filter((b) => /^HTTP\//.test(b.trim()));
  const last = blocks.at(-1) ?? "";
  const headers = {};
  for (const line of last.split(/\r?\n/).slice(1)) {
    const idx = line.indexOf(":");
    if (idx > 0) headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return headers;
}

async function throttle(host, spacingMs) {
  const spacing = spacingMs ?? HOST_SPACING_MS[host] ?? DEFAULT_SPACING_MS;
  const wait = (lastRequestAt.get(host) ?? 0) + spacing - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

async function curlOnce(url, headers = {}) {
  const dir = mkdtempSync(join(tmpdir(), "vsr-http-"));
  const bodyPath = join(dir, "body");
  const headerPath = join(dir, "headers");
  writeFileSync(
    headerPath,
    ["accept: application/json", ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`)].join("\n") + "\n",
    { mode: 0o600 },
  );
  try {
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-sSL",
        "--max-time", "60",
        "-A", USER_AGENT,
        "-H", `@${headerPath}`,
        "-D", "-",
        "-o", bodyPath,
        "-w", "\n__HTTP_STATUS__:%{http_code}",
        url,
      ],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
    );
    const marker = stdout.lastIndexOf("__HTTP_STATUS__:");
    const status = Number(stdout.slice(marker + "__HTTP_STATUS__:".length).trim());
    const headers = parseHeaders(stdout.slice(0, marker));
    let body = "";
    try {
      body = readFileSync(bodyPath, "utf8");
    } catch {
      // no body written (e.g. HEAD-like empty response)
    }
    return { status, headers, body };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * GET a JSON document. Resolves to `{ status, headers, json }`.
 * 404 resolves with `json: null` so callers can treat "missing" as empty;
 * any other non-2xx status (after retries) throws.
 */
export async function getJson(url, { log = () => {}, headers: requestHeaders, spacingMs } = {}) {
  const host = new URL(url).host;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await throttle(host, spacingMs);
    let response;
    try {
      response = await curlOnce(url, requestHeaders);
    } catch (err) {
      // Transport failure (DNS, TLS, timeout): retry like a 5xx.
      if (attempt === MAX_ATTEMPTS) throw new Error(`GET ${url} failed: ${err.message}`);
      log(`  curl error for ${host}: ${err.message.split("\n")[0]}; retrying (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await sleep(5000 * attempt);
      continue;
    }
    const { status, headers, body } = response;
    const limit = parseRateLimit(headers["ratelimit"]);

    if (status === 429 || (status >= 500 && status < 600)) {
      const waitS = status === 429 ? (limit?.reset ?? 60) + 1 : 5 * attempt;
      log(`  ${status} from ${host}; waiting ${waitS}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await sleep(waitS * 1000);
      continue;
    }

    if (limit?.remaining === 0 && limit.reset != null) {
      log(`  ${host} rate-limit budget exhausted; waiting ${limit.reset + 1}s`);
      lastRequestAt.set(host, Date.now() + (limit.reset + 1) * 1000);
    }

    if (status === 404) return { status, headers, json: null };
    if (status < 200 || status >= 300) {
      throw new Error(`GET ${url} failed with HTTP ${status}`);
    }
    try {
      return { status, headers, json: JSON.parse(body), rateLimit: limit };
    } catch (err) {
      throw new Error(`GET ${url} returned invalid JSON: ${err.message}`);
    }
  }
  throw new Error(`GET ${url} failed after ${MAX_ATTEMPTS} attempts`);
}
