import React, { useState, useEffect } from "react";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useTeamStats } from "../../hooks/useTeamStats";
import PokemonTeam from "../pokemon/PokemonTeam";
import AddReplayModal from "../modals/AddReplayModal";
import { formatShortDate } from "../../utils/timeUtils";

const STORAGE_KEY = "vs-recorder-team-header-collapsed";

function shortRegulation(reg: string): string {
  const match = reg.match(/Regulation\s+([A-Z])$/);
  return match ? `Reg ${match[1]}` : reg;
}

const TeamHeader: React.FC = () => {
  const { team, bumpStatsVersion } = useActiveTeam();
  const {
    gamesPlayed,
    wins,
    losses,
    winRate,
    loading: statsLoading,
    refreshStats,
  } = useTeamStats(team?.id ?? null);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [showAddReplay, setShowAddReplay] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  if (!team) return null;

  const handleReplayAdded = () => {
    refreshStats();
    bumpStatsVersion();
  };

  // Collapsed view
  if (collapsed) {
    return (
      <>
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            {/* Team name + regulation */}
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-gray-800 dark:text-white/90">
                {team.name}
              </h2>
              {team.regulation && (
                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {shortRegulation(team.regulation)}
                </span>
              )}
            </div>

            {/* Pokemon sprites (small) */}
            <div className="hidden sm:block">
              <PokemonTeam pokepasteUrl={team.pokepaste} size="sm" />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Add Replay button */}
            <button
              type="button"
              onClick={() => setShowAddReplay(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Replay</span>
            </button>

            {/* Expand */}
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Expand header"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AddReplayModal
          isOpen={showAddReplay}
          onClose={() => setShowAddReplay(false)}
          onAdded={handleReplayAdded}
          teamId={team.id}
        />
      </>
    );
  }

  // Expanded view
  return (
    <>
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Top row: Name + Regulation + Actions */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {team.name}
            </h2>
            {team.regulation && (
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                {shortRegulation(team.regulation)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddReplay(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Add Replay
            </button>

            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Collapse header"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Pokemon Team */}
        <div className="mb-4">
          <PokemonTeam pokepasteUrl={team.pokepaste} size="md" />
        </div>

        {/* Quick Stats */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
          {statsLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          ) : gamesPlayed > 0 ? (
            <>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-800 dark:text-white/90">{gamesPlayed}</span>{" "}
                games
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{wins}W</span>
                {" / "}
                <span className="font-medium text-red-500 dark:text-red-400">{losses}L</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-white/90">{winRate}%</span>{" "}
                win rate
              </div>
            </>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">No games played yet</span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
          <span>Created {formatShortDate(team.createdAt)}</span>
          <span>Updated {formatShortDate(team.updatedAt)}</span>
          {team.showdownUsernames && team.showdownUsernames.length > 0 && (
            <span>
              Showdown: {team.showdownUsernames.join(", ")}
            </span>
          )}
        </div>
      </div>

      <AddReplayModal
        isOpen={showAddReplay}
        onClose={() => setShowAddReplay(false)}
        onAdded={handleReplayAdded}
        teamId={team.id}
      />
    </>
  );
};

export default TeamHeader;
