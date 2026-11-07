/**
 * Open teamsheet → Showdown paste text.
 *
 * Direct sources publish open teamsheets (species, item, ability, nature,
 * moves; no EVs/SPs), not pokepaste links. The Recent Tour modal imports this
 * text as an opponent team's `pokepaste`, and the frontend's
 * `parsePokepasteText` reads it back (see pokepasteService.isInlinePaste).
 */

import { createHash } from "crypto";

export function formatMon(mon) {
  const lines = [mon.item ? `${mon.name} @ ${mon.item}` : mon.name];
  if (mon.ability) lines.push(`Ability: ${mon.ability}`);
  if (mon.nature) lines.push(`${mon.nature} Nature`);
  for (const move of mon.moves ?? []) lines.push(`- ${move}`);
  return lines.join("\n");
}

export function formatSheet(team) {
  return team.mons.map(formatMon).join("\n\n");
}

/** Short, stable content id so identical sheets are stored once. */
export function sheetId(text) {
  return createHash("sha1").update(text).digest("hex").slice(0, 10);
}
