import { useState, useEffect, useMemo, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PokemonSprite from "../../components/pokemon/PokemonSprite";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import * as pokepasteService from "../../services/pokepasteService";
import * as pokemonService from "../../services/pokemonService";
import { TYPE_LIST } from "../../data/typeChart";
import { calcDefensiveMultiplier } from "../../utils/typeEffectiveness";
import type { PokemonData as PasteData } from "../../services/pokepasteService";

const TYPE_COLORS: Record<string, string> = {
  Normal: "bg-gray-500",
  Fire: "bg-red-500",
  Water: "bg-blue-500",
  Electric: "bg-yellow-500",
  Grass: "bg-green-500",
  Ice: "bg-cyan-400",
  Fighting: "bg-red-700",
  Poison: "bg-purple-500",
  Ground: "bg-amber-600",
  Flying: "bg-indigo-400",
  Psychic: "bg-pink-500",
  Bug: "bg-lime-500",
  Rock: "bg-amber-700",
  Ghost: "bg-purple-700",
  Dragon: "bg-indigo-600",
  Dark: "bg-stone-700",
  Steel: "bg-slate-500",
  Fairy: "bg-pink-400",
};

interface TeamPokemon {
  name: string;
  species: string;
  types: string[];
  ability?: string;
}

const COL_HIGHLIGHT = "bg-brand-50/50 dark:bg-brand-500/5";

function MultiplierCell({ value, highlighted, onMouseEnter, onMouseLeave }: {
  value: number;
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (value === 1) {
    return <td className={`px-2 py-1.5 text-center ${highlighted ? COL_HIGHLIGHT : ""}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />;
  }

  let text: string;
  let className: string;

  if (value === 0) {
    text = "0";
    className = "text-gray-400 dark:text-gray-500 font-medium";
  } else if (value >= 4) {
    text = `${value}x`;
    className = "text-red-500 dark:text-red-400 font-bold";
  } else if (value > 1) {
    text = `${value}x`;
    className = "text-red-500 dark:text-red-400";
  } else if (value <= 0.25) {
    text = `\u00BCx`;
    className = "text-emerald-500 dark:text-emerald-400 font-bold";
  } else {
    text = `\u00BDx`;
    className = "text-emerald-500 dark:text-emerald-400";
  }

  return (
    <td className={`px-2 py-1.5 text-center text-sm ${className} ${highlighted ? COL_HIGHLIGHT : ""}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {text}
    </td>
  );
}

export default function TypeChartPage() {
  const { team } = useActiveTeam();
  const [pokemon, setPokemon] = useState<TeamPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const onColEnter = useCallback((idx: number) => setHoveredCol(idx), []);
  const onColLeave = useCallback(() => setHoveredCol(null), []);

  useEffect(() => {
    if (!team?.pokepaste) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // Get abilities from paste, types from pokemonService
        const pasteData: PasteData[] = await pokepasteService.fetchAndParse(team.pokepaste!);
        // paste.name is the cleaned species (@ item stripped); paste.species
        // may still contain the item when there is no nickname
        const cleanNames = pasteData.map((p) => p.name);
        const apiData = await pokemonService.getMultiplePokemon(cleanNames);

        if (cancelled) return;

        const combined: TeamPokemon[] = pasteData.map((paste, i) => ({
          name: cleanNames[i],
          species: cleanNames[i],
          types: apiData[i]?.types?.filter((t) => t !== "Unknown") || [],
          ability: paste.ability,
        }));

        setPokemon(combined);
      } catch (err) {
        console.error("Failed to load type chart data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [team?.pokepaste]);

  // Compute effectiveness grid: grid[typeIndex][pokemonIndex] = multiplier
  const { grid, weakCounts, resistCounts } = useMemo(() => {
    if (pokemon.length === 0) {
      return { grid: [] as number[][], weakCounts: [] as number[], resistCounts: [] as number[] };
    }

    const g: number[][] = [];
    const wCounts = new Array(pokemon.length).fill(0);
    const rCounts = new Array(pokemon.length).fill(0);

    for (const atkType of TYPE_LIST) {
      const row: number[] = [];
      for (let p = 0; p < pokemon.length; p++) {
        const mult = calcDefensiveMultiplier(atkType, pokemon[p].types, pokemon[p].ability);
        row.push(mult);
        if (mult > 1) wCounts[p]++;
        if (mult < 1 && mult > 0) rCounts[p]++;
        if (mult === 0) rCounts[p]++;
      }
      g.push(row);
    }

    return { grid: g, weakCounts: wCounts, resistCounts: rCounts };
  }, [pokemon]);

  if (loading) {
    return (
      <>
        <PageMeta title="Type Chart | VS Recorder" description="Team type effectiveness chart" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500" />
        </div>
      </>
    );
  }

  if (!team?.pokepaste || pokemon.length === 0) {
    return (
      <>
        <PageMeta title="Type Chart | VS Recorder" description="Team type effectiveness chart" />
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">
            Add a Pokepaste to your team to view the type chart.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Type Chart | VS Recorder" description="Team type effectiveness chart" />
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  Type
                </th>
                {pokemon.map((p, pIdx) => (
                  <th
                    key={p.name}
                    className={`px-2 py-2 text-center ${hoveredCol === pIdx ? COL_HIGHLIGHT : ""}`}
                    onMouseEnter={() => onColEnter(pIdx)}
                    onMouseLeave={onColLeave}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <PokemonSprite name={p.species} size="sm" />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[60px]">
                        {p.name}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-medium text-red-500 dark:text-red-400">
                  Weak
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium text-emerald-500 dark:text-emerald-400">
                  Resist
                </th>
              </tr>
            </thead>
            <tbody>
              {TYPE_LIST.map((atkType, typeIdx) => (
                <tr
                  key={atkType}
                  className={`border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                    typeIdx % 2 === 1 ? "bg-gray-50 dark:bg-white/[0.02]" : ""
                  }`}
                >
                  <td className={`sticky left-0 z-10 px-3 py-1.5 text-center ${
                    typeIdx % 2 === 1 ? "bg-gray-50 dark:bg-gray-800/80" : "bg-white dark:bg-gray-900"
                  }`}>
                    <span
                      className={`inline-flex items-center justify-center w-[72px] rounded py-0.5 text-xs font-medium text-white ${
                        TYPE_COLORS[atkType] || "bg-gray-600"
                      }`}
                    >
                      {atkType}
                    </span>
                  </td>
                  {grid[typeIdx]?.map((mult, pIdx) => (
                    <MultiplierCell
                      key={pIdx}
                      value={mult}
                      highlighted={hoveredCol === pIdx}
                      onMouseEnter={() => onColEnter(pIdx)}
                      onMouseLeave={onColLeave}
                    />
                  ))}
                  <td className="px-2 py-1.5 text-center text-sm font-medium text-red-500 dark:text-red-400">
                    {grid[typeIdx]?.filter((m) => m > 1).length || ""}
                  </td>
                  <td className="px-2 py-1.5 text-center text-sm font-medium text-emerald-500 dark:text-emerald-400">
                    {grid[typeIdx]?.filter((m) => m < 1).length || ""}
                  </td>
                </tr>
              ))}
              {/* Summary row */}
              <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Total
                </td>
                {pokemon.map((p, pIdx) => (
                  <td
                    key={p.name}
                    className={`px-2 py-2 text-center ${hoveredCol === pIdx ? COL_HIGHLIGHT : ""}`}
                    onMouseEnter={() => onColEnter(pIdx)}
                    onMouseLeave={onColLeave}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium text-red-500 dark:text-red-400">
                        {weakCounts[pIdx]}
                      </span>
                      <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400">
                        {resistCounts[pIdx]}
                      </span>
                    </div>
                  </td>
                ))}
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
