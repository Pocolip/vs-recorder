import { useState, useEffect, useMemo } from "react";
import { Users } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import BestOf3Card from "../../components/team/BestOf3Card";
import TagInput from "../../components/form/TagInput";
import * as matchService from "../../services/matchService";
import { matchesPokemonTags, getOpponentPokemonFromReplay } from "../../utils/pokemonNameUtils";
import type { Match } from "../../types";

export default function MatchByMatchPage() {
  const { team } = useActiveTeam();
  const teamId = team?.id ?? null;

  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<{ totalMatches: number; wins: number; losses: number; winRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTags, setSearchTags] = useState<string[]>([]);

  const filteredMatches = useMemo(() => {
    if (searchTags.length === 0) return matches;
    return matches.filter((match) =>
      match.replays?.some((replay) => matchesPokemonTags(getOpponentPokemonFromReplay(replay), searchTags))
    );
  }, [matches, searchTags]);

  const loadMatches = async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      const [matchesData, statsData] = await Promise.all([
        matchService.getEnhancedMatches(teamId),
        matchService.getMatchStats(teamId),
      ]);

      setMatches(matchesData);
      setStats(statsData);
    } catch (err) {
      console.error("Error loading matches:", err);
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateMatchNotes = async (matchId: number, notes: string) => {
    await matchService.updateNotes(matchId, notes);
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, notes } : m)));
  };

  const handleUpdateMatchTags = async (matchId: number, tags: string[]) => {
    await matchService.updateTags(matchId, tags);
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, tags } : m)));
  };

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="py-12 text-center">
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">Error loading matches: {error}</p>
          <button
            type="button"
            onClick={loadMatches}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white transition-colors hover:bg-brand-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Match by Match | VS Recorder" description="Match by match analysis" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Stats row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalMatches}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Matches</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.wins}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Wins</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.losses}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Losses</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{stats.winRate}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Best-of-3 Matches</h3>
        {searchTags.length > 0 && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredMatches.length} of {matches.length} matches
          </p>
        )}
      </div>

      {/* Tag filter */}
      <div className="mb-4">
        <TagInput tags={searchTags} onTagsChange={setSearchTags} placeholder="Filter by opponent Pokemon..." />
      </div>

      {/* Matches list */}
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">No Best-of-3 matches found</h3>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Best-of-3 matches will appear here once you add Bo3 replays to your team.
          </p>
        </div>
      ) : filteredMatches.length === 0 && searchTags.length > 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No matches match your filters.</p>
          <button
            type="button"
            onClick={() => setSearchTags([])}
            className="mt-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <BestOf3Card
              key={match.id}
              match={match}
              onUpdateNotes={handleUpdateMatchNotes}
              onUpdateTags={handleUpdateMatchTags}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
