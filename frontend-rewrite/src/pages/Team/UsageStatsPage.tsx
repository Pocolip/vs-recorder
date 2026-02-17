import { useState, useEffect, useMemo, useRef } from "react";
import { BarChart3, Users, Star } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useTeamStats } from "../../hooks/useTeamStats";
import PokemonSprite from "../../components/pokemon/PokemonSprite";
import * as pokepasteService from "../../services/pokepasteService";
import { cleanPokemonName, getDisplayName } from "../../utils/pokemonNameUtils";
import type { Replay } from "../../types";

function normalizePokemonName(pokemonName: string): string {
  const cleaned = cleanPokemonName(pokemonName);
  if (cleaned.startsWith("terapagos")) return "terapagos";
  return cleaned;
}

function getLeadsFromReplay(replay: Replay): string[] {
  if (!replay.battleData?.userPlayer || !replay.battleData?.actualPicks) return [];
  const userPicks = replay.battleData.actualPicks[replay.battleData.userPlayer];
  if (!Array.isArray(userPicks) || userPicks.length < 2) return [];
  return userPicks.slice(0, 2).map(normalizePokemonName);
}

function getTeraFromReplay(replay: Replay): string | null {
  if (!replay.battleData?.userPlayer || !replay.battleData?.teraEvents) return null;
  const userTeraEvents = replay.battleData.teraEvents[replay.battleData.userPlayer];
  if (!Array.isArray(userTeraEvents) || userTeraEvents.length === 0) return null;
  return normalizePokemonName(userTeraEvents[0].pokemon);
}

function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return "text-green-600 dark:text-green-400";
  if (winRate >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export default function UsageStatsPage() {
  const { team, statsVersion } = useActiveTeam();
  const { replays, loading: replaysLoading, refreshStats } = useTeamStats(team?.id ?? null);

  const prevVersion = useRef(statsVersion);
  useEffect(() => {
    if (statsVersion !== prevVersion.current) {
      prevVersion.current = statsVersion;
      refreshStats();
    }
  }, [statsVersion, refreshStats]);

  const [teamPokemon, setTeamPokemon] = useState<string[]>([]);
  const [pokemonLoading, setPokemonLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeamPokemon = async () => {
      try {
        setPokemonLoading(true);
        setError(null);

        if (team?.pokepaste) {
          const parsed = await pokepasteService.fetchAndParse(team.pokepaste);
          const names = parsed.map((p) => normalizePokemonName(p.name)).filter(Boolean);
          setTeamPokemon(names);
        } else {
          setTeamPokemon([]);
        }
      } catch (err) {
        console.error("Error loading team Pokemon:", err);
        setError(err instanceof Error ? err.message : "Failed to load team data");
        setTeamPokemon([]);
      } finally {
        setPokemonLoading(false);
      }
    };

    loadTeamPokemon();
  }, [team?.pokepaste]);

  const usageStats = useMemo(() => {
    if (!replays || replays.length === 0 || teamPokemon.length === 0) {
      return { individualStats: [], leadPairStats: [], bestLeadStats: [] };
    }

    const validReplays = replays.filter(
      (r) => r.battleData && r.result && ["win", "loss"].includes(r.result)
    );

    if (validReplays.length === 0) {
      return { individualStats: [], leadPairStats: [], bestLeadStats: [] };
    }

    // Individual Pokemon stats
    const individualStats = teamPokemon.map((pokemon) => {
      const gamesWithPokemon = validReplays.filter((r) => {
        const picks = r.battleData?.actualPicks?.[r.battleData.userPlayer || ""] || [];
        return picks.some((pick) => normalizePokemonName(pick) === pokemon);
      });
      const winsWithPokemon = gamesWithPokemon.filter((r) => r.result === "win");

      const gamesAsLead = validReplays.filter((r) => getLeadsFromReplay(r).includes(pokemon));
      const winsAsLead = gamesAsLead.filter((r) => r.result === "win");

      const gamesWithTera = validReplays.filter((r) => getTeraFromReplay(r) === pokemon);
      const winsWithTera = gamesWithTera.filter((r) => r.result === "win");

      return {
        pokemon,
        usage: gamesWithPokemon.length,
        usageRate: Math.round((gamesWithPokemon.length / validReplays.length) * 100),
        overallWinRate: gamesWithPokemon.length > 0 ? Math.round((winsWithPokemon.length / gamesWithPokemon.length) * 100) : 0,
        leadUsage: gamesAsLead.length,
        leadWinRate: gamesAsLead.length > 0 ? Math.round((winsAsLead.length / gamesAsLead.length) * 100) : 0,
        teraUsage: gamesWithTera.length,
        teraWinRate: gamesWithTera.length > 0 ? Math.round((winsWithTera.length / gamesWithTera.length) * 100) : null,
      };
    });

    // Lead pair stats
    const leadPairCounts = new Map<string, number>();
    const leadPairWins = new Map<string, number>();

    validReplays.forEach((replay) => {
      const leads = getLeadsFromReplay(replay);
      if (leads.length === 2) {
        const pairKey = [...leads].sort().join(" + ");
        leadPairCounts.set(pairKey, (leadPairCounts.get(pairKey) || 0) + 1);
        if (replay.result === "win") {
          leadPairWins.set(pairKey, (leadPairWins.get(pairKey) || 0) + 1);
        }
      }
    });

    const buildLeadStats = (sortFn: (a: LeadPairStat, b: LeadPairStat) => number) =>
      Array.from(leadPairCounts.entries())
        .map(([pair, count]) => {
          const wins = leadPairWins.get(pair) || 0;
          const [pokemon1, pokemon2] = pair.split(" + ");
          return {
            pair,
            pokemon1,
            pokemon2,
            usage: count,
            wins,
            winRate: Math.round((wins / count) * 100),
            usageRate: Math.round((count / validReplays.length) * 100),
          };
        })
        .sort(sortFn)
        .slice(0, 6);

    type LeadPairStat = { pair: string; pokemon1: string; pokemon2: string; usage: number; wins: number; winRate: number; usageRate: number };

    const leadPairStats = buildLeadStats((a, b) => b.usage - a.usage);
    const bestLeadStats = buildLeadStats((a, b) => b.winRate === a.winRate ? b.usage - a.usage : b.winRate - a.winRate);

    return { individualStats, leadPairStats, bestLeadStats };
  }, [replays, teamPokemon]);

  const loading = replaysLoading || pokemonLoading;

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
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">Error loading team data: {error}</p>
        </div>
      </div>
    );
  }

  if (replays.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">No usage data available</h3>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add replays to see detailed Pokemon usage statistics.
          </p>
        </div>
      </div>
    );
  }

  const validGameCount = replays.filter((r) => r.result && ["win", "loss"].includes(r.result)).length;
  const { individualStats, leadPairStats, bestLeadStats } = usageStats;

  return (
    <>
      <PageMeta title="Usage Stats | VS Recorder" description="Pokemon usage statistics" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Usage Statistics</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">Based on {validGameCount} games</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Individual Pokemon Stats - full width */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100">
              <BarChart3 className="h-5 w-5" />
              Team Pokemon Performance
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Pokemon</th>
                    <th className="px-2 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Usage</th>
                    <th className="px-2 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Win %</th>
                    <th className="px-2 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Lead Usage</th>
                    <th className="px-2 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Lead Win %</th>
                    <th className="px-2 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Tera Usage</th>
                    <th className="px-2 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Tera Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {individualStats.map((stat) => (
                    <tr key={stat.pokemon} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <PokemonSprite name={stat.pokemon} size="sm" />
                          <span className="capitalize text-gray-800 dark:text-gray-100">
                            {getDisplayName(stat.pokemon)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="text-gray-800 dark:text-gray-100">{stat.usage}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">({stat.usageRate}%)</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className={`font-semibold ${stat.usage > 0 ? getWinRateColor(stat.overallWinRate) : "text-gray-400"}`}>
                          {stat.usage > 0 ? `${stat.overallWinRate}%` : "\u2014"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-gray-800 dark:text-gray-100">{stat.leadUsage}</td>
                      <td className="px-2 py-3 text-center">
                        <span className={`font-semibold ${stat.leadUsage > 0 ? getWinRateColor(stat.leadWinRate) : "text-gray-400"}`}>
                          {stat.leadUsage > 0 ? `${stat.leadWinRate}%` : "\u2014"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-gray-800 dark:text-gray-100">{stat.teraUsage}</td>
                      <td className="px-2 py-3 text-center">
                        {stat.teraWinRate !== null ? (
                          <span className={`font-semibold ${getWinRateColor(stat.teraWinRate)}`}>{stat.teraWinRate}%</span>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Most Common Leads */}
        <LeadPairSection
          title="Most Common Leads"
          icon={<Users className="h-5 w-5" />}
          stats={leadPairStats}
          rankColor="text-gray-500 dark:text-gray-400"
        />

        {/* Best Leads */}
        <LeadPairSection
          title="Best Leads (Win %)"
          icon={<Star className="h-5 w-5" />}
          stats={bestLeadStats}
          rankColor="text-yellow-600 dark:text-yellow-400"
        />
      </div>
    </div>
    </>
  );
}

function LeadPairSection({
  title,
  icon,
  stats,
  rankColor,
}: {
  title: string;
  icon: React.ReactNode;
  stats: { pair: string; pokemon1: string; pokemon2: string; usage: number; wins: number; winRate: number; usageRate: number }[];
  rankColor: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
      <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100">
        {icon}
        {title}
      </h4>

      {stats.length > 0 ? (
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div key={stat.pair} className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <span className={`w-4 text-sm ${rankColor}`}>#{index + 1}</span>
                <div className="flex items-center gap-2">
                  <PokemonSprite name={stat.pokemon1} size="sm" />
                  <span className="text-gray-400">+</span>
                  <PokemonSprite name={stat.pokemon2} size="sm" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {getDisplayName(stat.pokemon1)} + {getDisplayName(stat.pokemon2)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.usage} games ({stat.usageRate}%)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${getWinRateColor(stat.winRate)}`}>{stat.winRate}%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.wins}W-{stat.usage - stat.wins}L
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">No lead data available</div>
      )}
    </div>
  );
}
