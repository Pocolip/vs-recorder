/**
 * Core clustering for direct-source teams.
 *
 * Reproduces the shape LabMaus' top_teams gave us (and that
 * RecentTourModal renders): for each composition size k ∈ {4, 5, 6}, the
 * most common k-Pokémon cores across all teams, each with aggregated match
 * wins/losses and the best-placed teams that contain it. Cores overlap, as
 * LabMaus' do.
 */

import { formatSheet, sheetId } from "./sheet.js";

export const COMPOSITION_SIZES = [4, 5, 6];
export const MAX_CLUSTERS_PER_SIZE = 30;
export const MAX_TEAMS_PER_CLUSTER = 20;

function combinations(items, k, start = 0, prefix = [], out = []) {
  if (prefix.length === k) {
    out.push(prefix.slice());
    return out;
  }
  for (let i = start; i <= items.length - (k - prefix.length); i++) {
    prefix.push(items[i]);
    combinations(items, k, i + 1, prefix, out);
    prefix.pop();
  }
  return out;
}

const winRate = (w, l) => (w + l === 0 ? 0 : w / (w + l));

/** Lower is better: placement as a fraction of the field, then win rate. */
function compareTeams(a, b) {
  const pa = a.placement != null && a.players ? a.placement / a.players : Infinity;
  const pb = b.placement != null && b.players ? b.placement / b.players : Infinity;
  if (pa !== pb) return pa - pb;
  return winRate(b.record.w, b.record.l) - winRate(a.record.w, a.record.l);
}

export function buildDirectCompositions(teams, {
  sizes = COMPOSITION_SIZES,
  maxClusters = MAX_CLUSTERS_PER_SIZE,
  maxTeams = MAX_TEAMS_PER_CLUSTER,
} = {}) {
  const valid = teams.filter((t) => t.mons.length === 6 && new Set(t.mons.map((m) => m.key)).size === 6);

  // Display order inside a core: most-used species first.
  const usage = new Map();
  const names = new Map();
  for (const t of valid) {
    for (const m of t.mons) {
      usage.set(m.key, (usage.get(m.key) ?? 0) + 1);
      names.set(m.key, m.name);
    }
  }
  const byUsage = (a, b) => (usage.get(b) - usage.get(a)) || a.localeCompare(b);

  const sheets = {};
  const compositions = sizes.map((size) => {
    const cores = new Map();
    valid.forEach((team, idx) => {
      const keys = team.mons.map((m) => m.key).sort();
      for (const combo of combinations(keys, size)) {
        const id = combo.join("|");
        let core = cores.get(id);
        if (!core) {
          core = { keys: combo, count: 0, wins: 0, losses: 0, teams: [] };
          cores.set(id, core);
        }
        core.count++;
        core.wins += team.record.w;
        core.losses += team.record.l;
        core.teams.push(idx);
      }
    });

    const ranked = [...cores.values()]
      .sort((a, b) => (b.count - a.count) || (winRate(b.wins, b.losses) - winRate(a.wins, a.losses)) || a.keys.join().localeCompare(b.keys.join()))
      .slice(0, maxClusters);

    const clusters = ranked.map((core) => {
      const keys = core.keys.slice().sort(byUsage);
      const inner = core.teams
        .map((i) => valid[i])
        .sort(compareTeams)
        .slice(0, maxTeams)
        .map((t) => {
          const text = formatSheet(t);
          const id = sheetId(text);
          sheets[id] = text;
          return {
            name: t.player ?? "",
            placement: t.placement ?? null,
            record: `${t.record.w}-${t.record.l}-${t.record.t ?? 0}`,
            pokemonNames: t.mons.map((m) => m.name),
            tournamentName: t.tournamentName ?? "",
            sourceUrl: t.sourceUrl,
            sheetId: id,
          };
        });
      return {
        pokemon: keys,
        pokemonNames: keys.map((k) => names.get(k)),
        wins: core.wins,
        losses: core.losses,
        teams: inner,
      };
    });

    return { size, clusters };
  });

  // Sorted keys keep the JSON diff in the weekly PR stable.
  const sortedSheets = Object.fromEntries(Object.entries(sheets).sort(([a], [b]) => a.localeCompare(b)));
  return { compositions, sheets: sortedSheets, teamCount: valid.length };
}
