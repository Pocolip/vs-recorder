/**
 * Disk cache for finished Limitless tournaments.
 *
 * Standings for a finished tournament never change, and Limitless only allows
 * 50 unauthenticated requests per 5 minutes, so a 60-day window (~270
 * events) costs ~30 minutes cold. Caching finished events means a weekly run
 * only fetches what's new. In CI the directory is persisted between runs with
 * actions/cache; locally it lives in scripts/.cache/ (gitignored).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CACHE_DIR = resolve(__dirname, "../.cache/tournament-teams");

// Bump when the cached payload shape changes so stale entries are ignored.
const CACHE_VERSION = 1;

const safeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, "_");

export function createCache(dir = DEFAULT_CACHE_DIR) {
  const pathFor = (ns, id) => join(dir, ns, `${safeId(id)}.json`);

  return {
    get(ns, id) {
      const p = pathFor(ns, id);
      if (!existsSync(p)) return null;
      try {
        const entry = JSON.parse(readFileSync(p, "utf8"));
        return entry?.version === CACHE_VERSION ? entry.data : null;
      } catch {
        return null; // corrupt entry: treat as a miss and refetch
      }
    },

    set(ns, id, data) {
      mkdirSync(join(dir, ns), { recursive: true });
      writeFileSync(pathFor(ns, id), JSON.stringify({ version: CACHE_VERSION, data }));
    },

    /** Delete entries in `ns` not modified within `maxAgeDays`. */
    prune(ns, maxAgeDays) {
      const nsDir = join(dir, ns);
      if (!existsSync(nsDir)) return 0;
      const cutoff = Date.now() - maxAgeDays * 86_400_000;
      let removed = 0;
      for (const file of readdirSync(nsDir)) {
        const p = join(nsDir, file);
        if (statSync(p).mtimeMs < cutoff) {
          rmSync(p, { force: true });
          removed++;
        }
      }
      return removed;
    },
  };
}
