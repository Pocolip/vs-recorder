import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import * as pokepasteService from "../../services/pokepasteService";
import type { PokemonData as PasteData } from "../../services/pokepasteService";
import {
  computeSpeedAtLevel50,
  getBaseStats,
  getNatureInfo,
  normalizeSpeciesName,
} from "../../utils/calcUtils";
import { getMegaForme, getItemSpeedMultiplier } from "../../utils/megaStones";
import speedTiersMA from "../../data/speedTiers-regM-A.json";

interface SpeedTierRow {
  pokemon: string;
  baseSpeed: number;
  spread: string;
  speedStat: number;
  isTeam?: boolean;
}

interface RegulationData {
  regulation: string;
  generatedAt: string;
  speciesCount: number;
  entries: SpeedTierRow[];
}

const REGULATIONS: Record<string, RegulationData> = {
  "M-A": speedTiersMA as RegulationData,
};

function getSpeEvFromPaste(p: PasteData): number {
  return p.evs?.Spe ?? p.evs?.spe ?? 0;
}

function getSpeIvFromPaste(p: PasteData): number {
  return p.ivs?.Spe ?? p.ivs?.spe ?? 31;
}

// Pokepaste still writes "EVs:" in Champions mode but the values are Stat Points (0-32).
// Heuristic: if any stat value exceeds 32, treat as standard EVs.
function isChampionsPaste(team: PasteData[]): boolean {
  for (const p of team) {
    const evs = p.evs ?? {};
    for (const v of Object.values(evs)) {
      if (typeof v === "number" && v > 32) return false;
    }
  }
  return true;
}

function formatSpread(speEv: number, nature: string, isChampions: boolean, itemNote?: string): string {
  const { plus, minus } = getNatureInfo(nature);
  const polarity = plus === "spe" ? "+Spe" : minus === "spe" ? "-Spe" : "Neutral";
  const unit = isChampions ? "SPs" : "EVs";
  const base = `${speEv} ${unit} / ${polarity}`;
  return itemNote ? `${base} / ${itemNote}` : base;
}

function ToggleButton({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-brand-400 bg-brand-500 text-white"
          : "border-gray-300 bg-white text-gray-700 hover:border-brand-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-400"
      }`}
    >
      {label}
    </button>
  );
}

export default function SpeedTiersPage() {
  const { team } = useActiveTeam();
  const [teamPaste, setTeamPaste] = useState<PasteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [regulation, setRegulation] = useState<string>("M-A");
  const [tailwind, setTailwind] = useState(false);
  const [trickRoom, setTrickRoom] = useState(false);
  const [scarfedKeys, setScarfedKeys] = useState<Set<string>>(new Set());

  const toggleScarf = (key: string) => {
    setScarfedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const rowKey = (r: SpeedTierRow): string =>
    `${r.pokemon}|${r.spread}|${r.isTeam ? "team" : "meta"}`;

  useEffect(() => {
    if (!team?.pokepaste) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    pokepasteService
      .fetchAndParse(team.pokepaste)
      .then((parsed) => {
        if (!cancelled) setTeamPaste(parsed);
      })
      .catch((err) => console.error("Failed to parse team paste:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [team?.pokepaste]);

  const regulationData = REGULATIONS[regulation];

  const teamRows = useMemo<SpeedTierRow[]>(() => {
    if (teamPaste.length === 0) return [];
    const isChampions = isChampionsPaste(teamPaste);
    const rows: SpeedTierRow[] = [];

    for (const paste of teamPaste) {
      const pasteSpecies = normalizeSpeciesName(paste.name || paste.species || "");
      if (!pasteSpecies) continue;
      const speEv = getSpeEvFromPaste(paste);
      const speIv = getSpeIvFromPaste(paste);
      const nature = paste.nature || "Hardy";

      // Determine pre-mega + mega pair. If the paste species itself is already a
      // mega forme (e.g. "Glimmora-Mega"), derive the pre-mega species by
      // stripping the suffix. Otherwise, fall back to the item's mega stone.
      const megaSuffix = pasteSpecies.match(/-Mega(-[XYZ])?$/);
      const preMegaSpecies = megaSuffix ? pasteSpecies.slice(0, megaSuffix.index!) : pasteSpecies;
      const megaSpecies = megaSuffix ? pasteSpecies : getMegaForme(paste.item);

      const baseStats = getBaseStats(preMegaSpecies);
      if (baseStats) {
        const rawSpeed = computeSpeedAtLevel50(preMegaSpecies, speEv, speIv, nature, isChampions);
        const itemMult = getItemSpeedMultiplier(paste.item, preMegaSpecies);
        const itemNote = itemMult !== 1 ? paste.item : undefined;
        rows.push({
          pokemon: preMegaSpecies,
          baseSpeed: baseStats.spe,
          spread: formatSpread(speEv, nature, isChampions, itemNote),
          speedStat: Math.floor(rawSpeed * itemMult),
          isTeam: true,
        });
      }

      if (megaSpecies && megaSpecies !== preMegaSpecies) {
        const megaBaseStats = getBaseStats(megaSpecies);
        if (megaBaseStats) {
          const megaSpeed = computeSpeedAtLevel50(megaSpecies, speEv, speIv, nature, isChampions);
          rows.push({
            pokemon: megaSpecies,
            baseSpeed: megaBaseStats.spe,
            spread: formatSpread(speEv, nature, isChampions),
            speedStat: megaSpeed,
            isTeam: true,
          });
        }
      }
    }
    return rows;
  }, [teamPaste]);

  // Sort by the un-scarfed speed so per-row Scarf toggles don't shuffle rows.
  // Tailwind and Trick Room are global and intentionally re-sort.
  const sortedRows = useMemo<(SpeedTierRow & { key: string; sortSpeed: number })[]>(() => {
    const all: SpeedTierRow[] = [...regulationData.entries, ...teamRows];
    const rows = all.map((r) => ({
      ...r,
      key: rowKey(r),
      sortSpeed: tailwind ? r.speedStat * 2 : r.speedStat,
    }));
    rows.sort((a, b) => {
      const diff = trickRoom ? a.sortSpeed - b.sortSpeed : b.sortSpeed - a.sortSpeed;
      if (diff !== 0) return diff;
      return a.pokemon.localeCompare(b.pokemon);
    });
    return rows;
  }, [regulationData, teamRows, tailwind, trickRoom]);

  const merged = useMemo(
    () =>
      sortedRows.map((r) => {
        const scarfed = scarfedKeys.has(r.key);
        const displaySpeed = scarfed ? Math.floor(r.sortSpeed * 1.5) : r.sortSpeed;
        return { ...r, scarfed, speedStat: displaySpeed };
      }),
    [sortedRows, scarfedKeys],
  );

  return (
    <>
      <PageMeta title="Speed Tiers | VS Recorder" description="Team speed tier reference" />

      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Regulation
            </label>
            <select
              value={regulation}
              onChange={(e) => setRegulation(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {Object.keys(REGULATIONS).map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ToggleButton active={tailwind} onToggle={() => setTailwind((v) => !v)} label="Tailwind" />
            <ToggleButton active={trickRoom} onToggle={() => setTrickRoom((v) => !v)} label="Trick Room" />
          </div>

          {team?.pokepaste ? null : (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Add a Pokepaste to highlight your team's speeds.
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.03]">
            <div className="max-h-[80vh] overflow-auto">
              <table className="w-full min-w-[640px] table-fixed text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[260px] min-w-[180px]" />
                  <col className="w-16" />
                  <col className="w-16" />
                  <col className="w-52" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Pokemon
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Speed
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Base
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Spread
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {merged.map((row, i) => (
                    <tr
                      key={`${row.key}|${i}`}
                      onClick={() => toggleScarf(row.key)}
                      className={`cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-100 dark:hover:bg-white/[0.05] ${
                        row.scarfed
                          ? "bg-amber-100 dark:bg-amber-500/20 shadow-[inset_3px_0_0_theme(colors.amber.500)]"
                          : row.isTeam
                            ? "bg-brand-100 dark:bg-brand-500/25 font-semibold shadow-[inset_3px_0_0_var(--color-brand-500)]"
                            : i % 2 === 1
                              ? "bg-gray-50/50 dark:bg-white/[0.02]"
                              : ""
                      }`}
                    >
                      <td className="px-3 py-1.5 text-right text-xs text-gray-400 dark:text-gray-500">
                        {i + 1}
                      </td>
                      <td className="px-3 py-1.5 text-gray-800 dark:text-gray-100 truncate">
                        {row.pokemon}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-900 dark:text-gray-50">
                        {row.speedStat}
                      </td>
                      <td className="px-3 py-1.5 text-right text-xs text-gray-500 dark:text-gray-400">
                        {row.baseSpeed}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 truncate">
                        {row.spread}
                        {row.scarfed && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                            + Scarf
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
