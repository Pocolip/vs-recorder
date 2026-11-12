import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "http";

import { getJson } from "./http.js";

// Exercises the real curl path against a local server: header-file
// injection (API keys), 404 → null, 429 backoff + retry, and JSON parsing.
async function withServer(handler, fn) {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test("getJson sends extra headers, handles 404 and retries 429", async () => {
  let rateLimited = 0;
  const seenKeys = [];
  await withServer((req, res) => {
    seenKeys.push(req.headers["x-access-key"]);
    if (req.url === "/missing") {
      res.writeHead(404).end();
    } else if (req.url === "/limited" && rateLimited++ === 0) {
      res.writeHead(429, { ratelimit: '"50-in-5min"; r=0; t=0' }).end();
    } else {
      res.writeHead(200, { "content-type": "application/json", ratelimit: '"50-in-5min"; r=7; t=30' });
      res.end(JSON.stringify({ ok: req.url }));
    }
  }, async (base) => {
    const opts = { headers: { "X-Access-Key": "k-123" }, spacingMs: 0 };

    const ok = await getJson(`${base}/ok`, opts);
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.json, { ok: "/ok" });
    assert.deepEqual(ok.rateLimit, { remaining: 7, reset: 30 });

    const missing = await getJson(`${base}/missing`, opts);
    assert.equal(missing.status, 404);
    assert.equal(missing.json, null);

    const limited = await getJson(`${base}/limited`, opts);
    assert.deepEqual(limited.json, { ok: "/limited" });
    assert.equal(rateLimited, 2, "retried once after the 429");

    assert.ok(seenKeys.every((k) => k === "k-123"), "key header sent on every request");
  });
});

test("getJson rejects invalid JSON and hard failures", async () => {
  await withServer((req, res) => {
    if (req.url === "/bad-json") res.writeHead(200).end("<html>");
    else res.writeHead(403).end();
  }, async (base) => {
    await assert.rejects(getJson(`${base}/bad-json`, { spacingMs: 0 }), /invalid JSON/);
    await assert.rejects(getJson(`${base}/forbidden`, { spacingMs: 0 }), /HTTP 403/);
  });
});
