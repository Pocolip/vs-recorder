import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Zap } from "lucide-react";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import PokemonSprite from "../../components/pokemon/PokemonSprite";
import { getDisplayName } from "../../utils/pokemonNameUtils";
import * as pokepasteService from "../../services/pokepasteService";
import { analyticsApi } from "../../services/api/analyticsApi";

const MOVE_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899",
  "#10b981", "#f97316", "#84cc16", "#6366f1", "#14b8a6",
];

interface MoveDataEntry {
  name: string;
  value: number;
  inPokepaste: boolean;
  color: string;
}

interface PokemonChartData {
  chartData: MoveDataEntry[];
  totalUsage: number;
  hasData: boolean;
}

export default function MoveUsagePage() {
  const { team } = useActiveTeam();

  const [teamMovesets, setTeamMovesets] = useState<Record<string, string[]>>({});
  const [moveUsageStats, setMoveUsageStats] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMoveData = async () => {
      if (!team) return;

      try {
        setLoading(true);
        setError(null);

        // Load team movesets from Pokepaste
        let pokepasteMovesets: Record<string, string[]> = {};
        if (team.pokepaste) {
          try {
            const parsed = await pokepasteService.fetchAndParse(team.pokepaste);
            pokepasteMovesets = parsed.reduce<Record<string, string[]>>((acc, pokemon) => {
              const pokemonName = pokemon.name;
              if (pokemonName && pokemon.moves) {
                if (acc[pokemonName]) {
                  const existingMoves = new Set(acc[pokemonName]);
                  pokemon.moves.forEach((move) => {
                    if (move?.trim()) existingMoves.add(move.trim());
                  });
                  acc[pokemonName] = Array.from(existingMoves);
                } else {
                  acc[pokemonName] = pokemon.moves.filter((move) => move?.trim());
                }
              }
              return acc;
            }, {});
          } catch (pokepasteError) {
            console.warn("Failed to load Pokepaste movesets:", pokepasteError);
          }
        }

        // Fetch move usage from backend
        const backendMoveData = await analyticsApi.getMoveUsage(team.id);
        const usageStats: Record<string, Record<string, number>> = {};
        if (backendMoveData?.pokemonMoves) {
          backendMoveData.pokemonMoves.forEach(({ pokemon, moves }) => {
            if (!usageStats[pokemon]) usageStats[pokemon] = {};
            moves.forEach((moveEntry) => {
              // Handle both possible field names from backend
              const timesUsed = (moveEntry as Record<string, unknown>).timesUsed as number | undefined;
              usageStats[pokemon][moveEntry.move] = timesUsed ?? moveEntry.count ?? 0;
            });
          });
        }

        setTeamMovesets(pokepasteMovesets);
        setMoveUsageStats(usageStats);
      } catch (err) {
        console.error("Error loading move data:", err);
        setError(err instanceof Error ? err.message : "Failed to load move data");
      } finally {
        setLoading(false);
      }
    };

    loadMoveData();
  }, [team?.id, team?.pokepaste]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = useMemo(() => {
    const results: Record<string, PokemonChartData> = {};

    const allPokemon = new Set([...Object.keys(teamMovesets), ...Object.keys(moveUsageStats)]);

    for (const pokemon of allPokemon) {
      const pokepasteMoveset = teamMovesets[pokemon] || [];
      const usageData = moveUsageStats[pokemon] || {};

      const moveData = new Map<string, { name: string; value: number; inPokepaste: boolean }>();
      const normalizedPokepasteMoveset = new Set(pokepasteMoveset.map((m) => m.trim().toLowerCase()));

      // Add pokepaste moves
      pokepasteMoveset.forEach((move) => {
        const trimmed = move.trim();
        if (trimmed) {
          moveData.set(trimmed, { name: trimmed, value: usageData[trimmed] || 0, inPokepaste: true });
        }
      });

      // Add actual usage moves
      Object.entries(usageData).forEach(([move, count]) => {
        const trimmed = move.trim();
        if (!moveData.has(trimmed)) {
          const isInPokepaste = normalizedPokepasteMoveset.has(trimmed.toLowerCase());
          moveData.set(trimmed, { name: trimmed, value: count, inPokepaste: isInPokepaste });
        } else {
          const existing = moveData.get(trimmed)!;
          existing.value = count;
        }
      });

      const chartArray: MoveDataEntry[] = Array.from(moveData.values())
        .sort((a, b) => b.value - a.value)
        .map((move, index) => ({ ...move, color: MOVE_COLORS[index % MOVE_COLORS.length] }));

      const totalUsage = chartArray.reduce((sum, m) => sum + m.value, 0);

      results[pokemon] = { chartData: chartArray, totalUsage, hasData: totalUsage > 0 || chartArray.length > 0 };
    }

    return results;
  }, [teamMovesets, moveUsageStats]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="py-12 text-center">
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">Error loading move data: {error}</p>
        </div>
      </div>
    );
  }

  const pokemonWithData = Object.entries(chartData).filter(([, data]) => data.hasData);

  if (pokemonWithData.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <Zap className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">No move usage data available</h3>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add replays to see detailed move usage analysis.
          </p>
          {!team?.pokepaste && (
            <p className="mt-2 text-xs text-gray-400">Add a Pokepaste URL to your team to see intended movesets.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Move Usage Analysis</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Move statistics from all recorded games</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">In Pokepaste</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Not in Pokepaste</span>
          </div>
        </div>
      </div>

      {/* Pokemon Move Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pokemonWithData.map(([pokemon, data]) => (
          <PokemonMoveChart key={pokemon} pokemon={pokemon} data={data} />
        ))}
      </div>
    </div>
  );
}

function PokemonMoveChart({ pokemon, data }: { pokemon: string; data: PokemonChartData }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, inPokepaste } = props;
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={inPokepaste ? "#10b981" : "#ef4444"}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="11"
        fontWeight="500"
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: MoveDataEntry }[] }) => {
    if (active && payload?.length) {
      const entry = payload[0].payload;
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <p className="font-medium text-gray-800 dark:text-gray-100">{entry.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Uses: <span className="font-semibold">{entry.value}</span>
          </p>
          <p className={`text-xs ${entry.inPokepaste ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {entry.inPokepaste ? "In Pokepaste" : "Not in Pokepaste"}
          </p>
        </div>
      );
    }
    return null;
  };

  const activeMoves = data.chartData.filter((m) => m.value > 0);
  const otherMoves = data.totalUsage > 0 ? data.chartData.filter((m) => m.value > 0 && m.value / data.totalUsage < 0.05) : [];

  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
      {/* Pokemon Header */}
      <div className="mb-4 flex items-center gap-3">
        <PokemonSprite name={pokemon} size="md" />
        <div>
          <h4 className="text-lg font-semibold capitalize text-gray-800 dark:text-gray-100">
            {getDisplayName(pokemon)}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{data.totalUsage} total uses</p>
        </div>
      </div>

      {/* Chart */}
      {activeMoves.length > 0 && data.totalUsage > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeMoves}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={false}
              >
                {activeMoves.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-80 items-center justify-center">
          <div className="text-center">
            <Zap className="mx-auto mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400">No move usage data</p>
          </div>
        </div>
      )}

      {/* Other moves list */}
      {otherMoves.length > 0 && (
        <div className="mt-4 rounded-lg bg-white p-3 dark:bg-gray-700/30">
          <h5 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Other moves:</h5>
          <div className="flex flex-wrap gap-1">
            {otherMoves.map((move, index) => (
              <span
                key={index}
                className={`rounded border px-2 py-1 text-xs ${
                  move.inPokepaste
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-600/30 dark:bg-green-600/20 dark:text-green-400"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-600/30 dark:bg-red-600/20 dark:text-red-400"
                }`}
              >
                {move.name} ({((move.value / data.totalUsage) * 100).toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
