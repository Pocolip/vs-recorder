import { useMemo, useState, useEffect, useRef } from "react";
import { Target, TrendingUp, TrendingDown, Users, UserCheck, Search, X } from "lucide-react";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useTeamStats } from "../../hooks/useTeamStats";
import PokemonSprite from "../../components/pokemon/PokemonSprite";
import { cleanPokemonName, getDisplayName } from "../../utils/pokemonNameUtils";

function normalizePokemonName(pokemonName: string): string {
  const cleaned = cleanPokemonName(pokemonName);
  if (cleaned.startsWith("terapagos")) return "terapagos";
  return cleaned;
}

interface OpponentPokemonStats {
  pokemon: string;
  timesOnTeam: number;
  timesBrought: number;
  gamesAgainst: number;
  winsAgainst: number;
  winRate: number;
  attendanceRate: number;
}

export default function MatchupStatsPage() {
  const { team, statsVersion } = useActiveTeam();
  const { replays, loading, refreshStats } = useTeamStats(team?.id ?? null);

  const prevVersion = useRef(statsVersion);
  useEffect(() => {
    if (statsVersion !== prevVersion.current) {
      prevVersion.current = statsVersion;
      refreshStats();
    }
  }, [statsVersion, refreshStats]);

  const [selectedPokemon, setSelectedPokemon] = useState<string[]>(Array(6).fill(""));
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const uniqueOpponentPokemon = useMemo(() => {
    if (!replays || replays.length === 0) return [];

    const pokemonSet = new Set<string>();
    replays.forEach((replay) => {
      if (!replay.battleData?.teams || !replay.battleData.opponentPlayer) return;
      const opponentTeam = replay.battleData.teams[replay.battleData.opponentPlayer] || [];
      opponentTeam.forEach((pokemon) => {
        const normalized = normalizePokemonName(pokemon);
        if (normalized) pokemonSet.add(normalized);
      });
    });

    return Array.from(pokemonSet).sort();
  }, [replays]);

  const { matchupStats, allMatchupsMap } = useMemo(() => {
    const emptyResult = {
      matchupStats: { bestMatchups: [] as OpponentPokemonStats[], worstMatchups: [] as OpponentPokemonStats[], highestAttendance: [] as OpponentPokemonStats[], lowestAttendance: [] as OpponentPokemonStats[] },
      allMatchupsMap: new Map<string, OpponentPokemonStats>(),
    };

    if (!replays || replays.length === 0) return emptyResult;

    const validReplays = replays.filter(
      (r) => r.battleData && r.result && ["win", "loss"].includes(r.result) && r.battleData.teams && r.battleData.opponentPlayer && r.battleData.teams[r.battleData.opponentPlayer]
    );

    if (validReplays.length === 0) return emptyResult;

    const opponentPokemonStats = new Map<string, { pokemon: string; timesOnTeam: number; timesBrought: number; gamesAgainst: number; winsAgainst: number }>();

    validReplays.forEach((replay) => {
      const opponentPlayer = replay.battleData!.opponentPlayer!;
      const opponentTeam = (replay.battleData!.teams![opponentPlayer] || []).map(normalizePokemonName);
      const opponentPicks = (replay.battleData!.actualPicks?.[opponentPlayer] || []).map(normalizePokemonName);

      opponentTeam.forEach((pokemon) => {
        if (!pokemon) return;

        if (!opponentPokemonStats.has(pokemon)) {
          opponentPokemonStats.set(pokemon, { pokemon, timesOnTeam: 0, timesBrought: 0, gamesAgainst: 0, winsAgainst: 0 });
        }

        const stats = opponentPokemonStats.get(pokemon)!;
        stats.timesOnTeam++;
        if (opponentPicks.includes(pokemon)) stats.timesBrought++;
        stats.gamesAgainst++;
        if (replay.result === "win") stats.winsAgainst++;
      });
    });

    const allMatchups: OpponentPokemonStats[] = Array.from(opponentPokemonStats.values()).map((stats) => ({
      ...stats,
      winRate: stats.gamesAgainst > 0 ? Math.round((stats.winsAgainst / stats.gamesAgainst) * 100) : 0,
      attendanceRate: stats.timesOnTeam > 0 ? Math.round((stats.timesBrought / stats.timesOnTeam) * 100) : 0,
    }));

    const bestMatchups = [...allMatchups]
      .filter((s) => s.gamesAgainst >= 3)
      .sort((a, b) => (b.winRate === a.winRate ? b.gamesAgainst - a.gamesAgainst : b.winRate - a.winRate))
      .slice(0, 5);

    const worstMatchups = [...allMatchups]
      .filter((s) => s.gamesAgainst >= 3)
      .sort((a, b) => (a.winRate === b.winRate ? b.gamesAgainst - a.gamesAgainst : a.winRate - b.winRate))
      .slice(0, 5);

    const highestAttendance = [...allMatchups]
      .filter((s) => s.timesOnTeam > 0)
      .sort((a, b) => (b.attendanceRate === a.attendanceRate ? b.timesOnTeam - a.timesOnTeam : b.attendanceRate - a.attendanceRate))
      .slice(0, 5);

    const lowestAttendance = [...allMatchups]
      .filter((s) => s.timesOnTeam > 0)
      .sort((a, b) => (a.attendanceRate === b.attendanceRate ? b.timesOnTeam - a.timesOnTeam : a.attendanceRate - b.attendanceRate))
      .slice(0, 5);

    const matchupsMap = new Map<string, OpponentPokemonStats>();
    allMatchups.forEach((m) => matchupsMap.set(m.pokemon, m));

    return {
      matchupStats: { bestMatchups, worstMatchups, highestAttendance, lowestAttendance },
      allMatchupsMap: matchupsMap,
    };
  }, [replays]);

  const customTeamAnalysis = useMemo(() => {
    const pokemonData = selectedPokemon
      .filter((p) => p && allMatchupsMap.has(p))
      .map((pokemon) => {
        const stats = allMatchupsMap.get(pokemon)!;
        return {
          pokemon,
          winRate: stats.winRate,
          wins: stats.winsAgainst,
          losses: stats.gamesAgainst - stats.winsAgainst,
          encounters: stats.gamesAgainst,
        };
      });

    const averageWinRate = pokemonData.length > 0 ? Math.round(pokemonData.reduce((sum, p) => sum + p.winRate, 0) / pokemonData.length) : 0;
    return { pokemonData, averageWinRate, pokemonWithDataCount: pokemonData.length };
  }, [selectedPokemon, allMatchupsMap]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const query = searchQuery.toLowerCase();
    return uniqueOpponentPokemon
      .filter((pokemon) => pokemon.toLowerCase().includes(query) || pokemon.replace(/-/g, " ").toLowerCase().includes(query))
      .slice(0, 8);
  }, [searchQuery, uniqueOpponentPokemon]);

  const handleSlotClick = (slotIndex: number) => {
    setActiveSlot(slotIndex);
    setSearchQuery(selectedPokemon[slotIndex] || "");
    setShowSuggestions(true);
  };

  const handlePokemonSelect = (pokemon: string) => {
    if (activeSlot !== null) {
      const newSelection = [...selectedPokemon];
      newSelection[activeSlot] = pokemon;
      setSelectedPokemon(newSelection);
      setActiveSlot(null);
      setSearchQuery("");
      setShowSuggestions(false);
    }
  };

  const handleClearSlot = (slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = [...selectedPokemon];
    newSelection[slotIndex] = "";
    setSelectedPokemon(newSelection);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (replays.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <Target className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">No matchup data available</h3>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add replays to see detailed matchup analysis.
          </p>
        </div>
      </div>
    );
  }

  const { bestMatchups, worstMatchups, highestAttendance, lowestAttendance } = matchupStats;
  const validGameCount = replays.filter((r) => r.result && ["win", "loss"].includes(r.result)).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Matchup Analysis</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Best/Worst matchups require at least 3 encounters</p>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">Based on {validGameCount} games</span>
      </div>

      {/* Stats Cards Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MatchupCard title="Best Matchups" icon={<TrendingUp className="h-4 w-4" />} titleColor="text-green-600 dark:text-green-400" matchups={bestMatchups} valueKey="winRate" valueSuffix="%" valueColor={() => "text-green-600 dark:text-green-400"} subValue={(m) => `${m.winsAgainst}W-${m.gamesAgainst - m.winsAgainst}L`} />
        <MatchupCard title="Worst Matchups" icon={<TrendingDown className="h-4 w-4" />} titleColor="text-red-600 dark:text-red-400" matchups={worstMatchups} valueKey="winRate" valueSuffix="%" valueColor={() => "text-red-600 dark:text-red-400"} subValue={(m) => `${m.winsAgainst}W-${m.gamesAgainst - m.winsAgainst}L`} />
        <MatchupCard title="Highest Attendance" icon={<UserCheck className="h-4 w-4" />} titleColor="text-blue-600 dark:text-blue-400" matchups={highestAttendance} valueKey="attendanceRate" valueSuffix="%" valueColor={() => "text-blue-600 dark:text-blue-400"} subValue={(m) => `${m.timesBrought}/${m.timesOnTeam}`} />
        <MatchupCard title="Lowest Attendance" icon={<Users className="h-4 w-4" />} titleColor="text-yellow-600 dark:text-yellow-400" matchups={lowestAttendance} valueKey="attendanceRate" valueSuffix="%" valueColor={() => "text-yellow-600 dark:text-yellow-400"} subValue={(m) => `${m.timesBrought}/${m.timesOnTeam}`} />
      </div>

      {/* Custom Team Analysis */}
      <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100">
            <Search className="h-5 w-5" />
            Custom Team Analysis
          </h4>
          {customTeamAnalysis.pokemonWithDataCount > 0 && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 dark:border-brand-600/30 dark:bg-brand-600/20">
              <span className="font-semibold text-brand-700 dark:text-brand-400">Avg: {customTeamAnalysis.averageWinRate}%</span>
              <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">({customTeamAnalysis.pokemonWithDataCount} Pokemon)</span>
            </div>
          )}
        </div>

        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Build a theoretical opponent team to analyze your matchup rates</p>

        {/* Pokemon Selection Grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => {
            const pokemon = selectedPokemon[index];
            const pokemonData = pokemon && allMatchupsMap.has(pokemon) ? allMatchupsMap.get(pokemon)! : null;

            return (
              <div key={index} className="relative">
                <div
                  onClick={() => handleSlotClick(index)}
                  className={`cursor-pointer rounded-lg border-2 bg-white p-4 transition-colors hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 ${
                    activeSlot === index ? "border-brand-400" : "border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {pokemon ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleClearSlot(index, e)}
                        className="absolute right-1 top-1 text-gray-400 transition-colors hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="flex flex-col items-center">
                        <PokemonSprite name={pokemon} size="md" />
                        <h5 className="mt-2 text-center text-sm font-medium capitalize text-gray-800 dark:text-gray-200">
                          {getDisplayName(pokemon)}
                        </h5>
                        {pokemonData ? (
                          <div className="mt-2 text-center">
                            <div className={`text-sm font-bold ${pokemonData.winRate >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {pokemonData.winRate}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {pokemonData.winsAgainst}W-{pokemonData.gamesAgainst - pokemonData.winsAgainst}L
                            </div>
                            <div className="text-xs text-gray-400">{pokemonData.gamesAgainst} encounters</div>
                          </div>
                        ) : (
                          <div className="mt-2 text-center">
                            <div className="text-sm font-bold text-gray-400">0%</div>
                            <div className="text-xs text-gray-400">No encounters</div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-20 flex-col items-center justify-center">
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100/50 dark:border-gray-600 dark:bg-gray-700/50">
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      </div>
                      <span className="text-xs text-gray-400">Click to add</span>
                    </div>
                  )}
                </div>

                {/* Search dropdown */}
                {activeSlot === index && showSuggestions && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                    <div className="border-b border-gray-200 p-2 dark:border-gray-600">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                        placeholder="Search Pokemon..."
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        autoFocus
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      />
                    </div>
                    {searchSuggestions.length > 0 ? (
                      searchSuggestions.map((pokemon) => (
                        <button
                          key={pokemon}
                          type="button"
                          onClick={() => handlePokemonSelect(pokemon)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <PokemonSprite name={pokemon} size="sm" />
                          {getDisplayName(pokemon)}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">No matches found</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-400">
          Click on a slot to search and select opponent Pokemon. The average win rate shows your overall performance against the selected team.
        </p>
      </div>
    </div>
  );
}

function MatchupCard({
  title,
  icon,
  titleColor,
  matchups,
  valueKey,
  valueSuffix,
  valueColor,
  subValue,
}: {
  title: string;
  icon: React.ReactNode;
  titleColor: string;
  matchups: OpponentPokemonStats[];
  valueKey: "winRate" | "attendanceRate";
  valueSuffix: string;
  valueColor: (m: OpponentPokemonStats) => string;
  subValue: (m: OpponentPokemonStats) => string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
      <h4 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${titleColor}`}>
        {icon}
        {title}
      </h4>
      <div className="space-y-2">
        {matchups.length > 0 ? (
          matchups.map((matchup, index) => (
            <div key={matchup.pokemon} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 text-xs text-gray-400">#{index + 1}</span>
                <PokemonSprite name={matchup.pokemon} size="sm" />
                <span className="truncate text-xs capitalize text-gray-700 dark:text-gray-200">
                  {getDisplayName(matchup.pokemon)}
                </span>
              </div>
              <div className="text-right">
                <div className={`text-xs font-semibold ${valueColor(matchup)}`}>
                  {matchup[valueKey]}{valueSuffix}
                </div>
                <div className="text-xs text-gray-400">{subValue(matchup)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-xs text-gray-400">No data available</div>
        )}
      </div>
    </div>
  );
}
