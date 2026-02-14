import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Plus, Download } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PokemonTeam from "../../components/pokemon/PokemonTeam";
import SearchInput from "../../components/form/SearchInput";
import RegulationFilter from "../../components/form/RegulationFilter";
import NewTeamModal from "../../components/modals/NewTeamModal";
import ImportTeamModal from "../../components/modals/ImportTeamModal";
import { useTeams } from "../../hooks/useTeams";
import { useMultipleTeamStats } from "../../hooks/useTeamStats";
import useTeamPokemon from "../../hooks/useTeamPokemon";
import { formatTimeAgo } from "../../utils/timeUtils";
import type { Team } from "../../types";

function shortRegulation(reg: string): string {
  const match = reg.match(/Regulation\s+([A-Z])$/);
  return match ? `Reg ${match[1]}` : reg;
}

export default function HomePage() {
  const { teams, loading, refresh } = useTeams();
  const teamIds = useMemo(() => teams.map((t) => t.id), [teams]);
  const { teamStats, overallStats, loading: statsLoading } = useMultipleTeamStats(teamIds);
  const { teamPokemon, loading: pokemonLoading } = useTeamPokemon(teams);

  const [search, setSearch] = useState("");
  const [regulationFilter, setRegulationFilter] = useState("");
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const regulations = useMemo(() => {
    const regs = new Set(teams.map((t) => t.regulation).filter(Boolean));
    return Array.from(regs).sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (regulationFilter && team.regulation !== regulationFilter) return false;
      if (search && !team.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [teams, regulationFilter, search]);

  return (
    <div>
      <PageMeta
        title="VS Recorder | Dashboard"
        description="Pokemon VGC Replay Analysis Dashboard"
      />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
            Your Teams
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewTeam(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              New Team
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              Import
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {!loading && teams.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-3.5 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-800 dark:text-white/90">{teams.length}</span>{" "}
              {teams.length === 1 ? "team" : "teams"}
            </div>
            {!statsLoading && overallStats.totalGames > 0 && (
              <>
                <div className="text-sm text-gray-400 dark:text-gray-600">|</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{overallStats.totalWins}W</span>
                  {" / "}
                  <span className="font-semibold text-red-500 dark:text-red-400">{overallStats.totalLosses}L</span>
                  {" / "}
                  <span className="font-semibold text-gray-800 dark:text-white/90">{overallStats.overallWinRate}%</span>
                  {" win rate"}
                </div>
              </>
            )}
          </div>
        )}

        {/* Filters */}
        {!loading && teams.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="w-full sm:w-48">
              <RegulationFilter
                value={regulationFilter}
                onChange={setRegulationFilter}
                regulations={regulations}
              />
            </div>
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search teams..."
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-3 h-5 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-4 flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && teams.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              No teams yet
            </h3>
            <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Create your first team to start tracking your replays and analyzing your performance.
            </p>
            <button
              onClick={() => setShowNewTeam(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" />
              Create Team
            </button>
          </div>
        )}

        {/* No Filter Results */}
        {!loading && teams.length > 0 && filteredTeams.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No teams match your filters.
            </p>
          </div>
        )}

        {/* Team Grid */}
        {!loading && filteredTeams.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                pokemonNames={teamPokemon[team.id]}
                pokemonLoading={pokemonLoading}
                stats={teamStats[team.id]}
                statsLoading={statsLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewTeamModal
        isOpen={showNewTeam}
        onClose={() => setShowNewTeam(false)}
        onCreated={refresh}
      />
      <ImportTeamModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={refresh}
      />
    </div>
  );
}

interface TeamCardProps {
  team: Team;
  pokemonNames?: string[];
  pokemonLoading: boolean;
  stats?: {
    wins: number;
    losses: number;
    total: number;
    winRate: number;
  };
  statsLoading: boolean;
}

function TeamCard({ team, pokemonNames, pokemonLoading, stats, statsLoading }: TeamCardProps) {
  return (
    <Link
      to={`/team/${team.id}/replays`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-800"
    >
      {/* Team Name & Regulation */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-800 group-hover:text-brand-600 dark:text-white/90 dark:group-hover:text-brand-400">
          {team.name}
        </h3>
        {team.regulation && (
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            {shortRegulation(team.regulation)}
          </span>
        )}
      </div>

      {/* Pokemon Sprites */}
      <div className="mb-4">
        {pokemonLoading ? (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        ) : (
          <PokemonTeam pokemonNames={pokemonNames || []} size="sm" />
        )}
      </div>

      {/* Stats & Time */}
      <div className="flex items-center justify-between text-sm">
        {statsLoading ? (
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        ) : stats && stats.total > 0 ? (
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{stats.wins}W</span>
            {" / "}
            <span className="font-medium text-red-500 dark:text-red-400">{stats.losses}L</span>
            {" / "}
            <span className="font-medium text-gray-800 dark:text-white/90">{stats.winRate}%</span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">No games</span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatTimeAgo(team.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
