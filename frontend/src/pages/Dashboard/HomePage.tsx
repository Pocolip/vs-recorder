import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { Plus, Download, X, Trophy, Calendar, TrendingUp } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import PageMeta from "../../components/common/PageMeta";
import PokemonTeam from "../../components/pokemon/PokemonTeam";
import TagInput from "../../components/form/TagInput";
import RegulationFilter from "../../components/form/RegulationFilter";
import NewTeamModal from "../../components/modals/NewTeamModal";
import ImportTeamModal from "../../components/modals/ImportTeamModal";
import Alert from "../../components/ui/alert/Alert";
import Toast from "../../components/ui/toast/Toast";
import announcements from "../../data/announcements.json";
import { useTeams } from "../../hooks/useTeams";
import { useMultipleTeamStats } from "../../hooks/useTeamStats";
import useTeamPokemon from "../../hooks/useTeamPokemon";
import { useFolderContext } from "../../context/FolderContext";
import { teamApi } from "../../services/api/teamApi";
import { formatTimeAgo } from "../../utils/timeUtils";
import type { Team } from "../../types";

function shortRegulation(reg: string): string {
  const match = reg.match(/Regulation\s+([A-Z])$/);
  return match ? `Reg ${match[1]}` : reg;
}

export default function HomePage() {
  const { teams, loading, refresh } = useTeams();
  const { folders, dataVersion, refreshFolders, bumpDataVersion } = useFolderContext();
  const [searchParams] = useSearchParams();
  const activeFolderId = searchParams.get("folder") ? Number(searchParams.get("folder")) : null;
  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null;

  const teamIds = useMemo(() => teams.map((t) => t.id), [teams]);
  const { teamStats, overallStats, loading: statsLoading } = useMultipleTeamStats(teamIds);
  const { teamPokemon, loading: pokemonLoading } = useTeamPokemon(teams);

  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [regulationFilter, setRegulationFilter] = useState("");
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Announcements
  const latestAnnouncement = announcements[0];
  const [showBanner, setShowBanner] = useState(() => {
    const viewed: string[] = JSON.parse(localStorage.getItem("viewedAnnouncements") || "[]");
    return !viewed.includes(latestAnnouncement.id);
  });
  const [showToast, setShowToast] = useState(false);

  const dismissBanner = useCallback(() => {
    const viewed: string[] = JSON.parse(localStorage.getItem("viewedAnnouncements") || "[]");
    if (!viewed.includes(latestAnnouncement.id)) {
      viewed.push(latestAnnouncement.id);
      localStorage.setItem("viewedAnnouncements", JSON.stringify(viewed));
    }
    setShowBanner(false);
    setShowToast(true);
  }, [latestAnnouncement.id]);

  // Re-fetch teams when dataVersion changes (folder assignments changed)
  useEffect(() => { if (dataVersion > 0) refresh(); }, [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const regulations = useMemo(() => {
    const regs = new Set(teams.map((t) => t.regulation).filter(Boolean));
    return Array.from(regs).sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    let filtered = teams;

    // Folder filter
    if (activeFolderId) {
      filtered = filtered.filter((team) => team.folderIds?.includes(activeFolderId));
    }

    // Other filters
    filtered = filtered.filter((team) => {
      if (regulationFilter && team.regulation !== regulationFilter) return false;
      if (searchTags.length > 0) {
        const pokemonNames = teamPokemon[team.id] || [];
        return searchTags.every((tag) => {
          const lowerTag = tag.toLowerCase();
          if (team.name.toLowerCase().includes(lowerTag)) return true;
          return pokemonNames.some((name) => {
            const lower = name.toLowerCase();
            return lower.includes(lowerTag) || lower.replace(/-/g, " ").includes(lowerTag);
          });
        });
      }
      return true;
    });

    // Sort by updatedAt descending
    return [...filtered].sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [teams, activeFolderId, regulationFilter, searchTags, teamPokemon]);

  const hasActiveFilters = searchTags.length > 0 || regulationFilter !== "";

  const clearFilters = () => {
    setSearchTags([]);
    setRegulationFilter("");
  };

  const handleRemoveFromFolder = async (teamId: number) => {
    if (!activeFolderId) return;
    try {
      await teamApi.removeFromFolder(teamId, activeFolderId);
      await Promise.all([refresh(), refreshFolders()]);
      bumpDataVersion();
    } catch (err) {
      console.error("Failed to remove team from folder:", err);
    }
  };

  const heading = activeFolder ? activeFolder.name : "Your Teams";

  return (
    <div>
      <PageMeta
        title="VS Recorder | Dashboard"
        description="Pokemon VGC Replay Analysis Dashboard"
      />

      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {/* Announcement Banner */}
        {showBanner && (
          <div className="mb-6">
            <Alert
              variant="info"
              title={latestAnnouncement.title}
              message={latestAnnouncement.message}
              onClose={dismissBanner}
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
            {heading}
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

        {/* Stats Cards */}
        {!loading && teams.length > 0 && !activeFolderId && (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex items-center">
                <Trophy className="mr-3 h-8 w-8 text-brand-500 dark:text-brand-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{teams.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Teams</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex items-center">
                <Calendar className="mr-3 h-8 w-8 text-blue-500 dark:text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    {statsLoading ? "..." : overallStats.totalGames}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Games Played</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex items-center">
                <TrendingUp className="mr-3 h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    {statsLoading ? "..." : overallStats.totalWins}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Wins</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex items-center">
                <Trophy className="mr-3 h-8 w-8 text-yellow-500 dark:text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    {statsLoading ? "..." : `${overallStats.overallWinRate}%`}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                </div>
              </div>
            </div>
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
              <TagInput
                tags={searchTags}
                onTagsChange={setSearchTags}
                placeholder="Search by team or Pokemon name..."
              />
            </div>
          </div>
        )}

        {/* Filter Status */}
        {!loading && teams.length > 0 && hasActiveFilters && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredTeams.length} of {teams.length} {teams.length === 1 ? "team" : "teams"}
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
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
              {activeFolderId ? "No teams in this folder." : "No teams match your filters."}
            </p>
          </div>
        )}

        {/* Team Grid */}
        {!loading && filteredTeams.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTeams.map((team) => (
              <DraggableTeamCard
                key={team.id}
                team={team}
                pokemonNames={teamPokemon[team.id]}
                pokemonLoading={pokemonLoading}
                stats={teamStats[team.id]}
                statsLoading={statsLoading}
                activeFolderId={activeFolderId}
                onRemoveFromFolder={handleRemoveFromFolder}
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

      {showToast && (
        <Toast
          message="Check the Announcements page in the footer to review past announcements."
          onDismiss={() => setShowToast(false)}
        />
      )}
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
  activeFolderId: number | null;
  onRemoveFromFolder: (teamId: number) => void;
}

function DraggableTeamCard({
  team,
  pokemonNames,
  pokemonLoading,
  stats,
  statsLoading,
  activeFolderId,
  onRemoveFromFolder,
}: TeamCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `team-${team.id}`,
    data: { teamId: team.id, teamName: team.name },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`relative ${isDragging ? "opacity-50" : ""}`}
    >
      <Link
        to={`/team/${team.id}/replays`}
        className="group block rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-800"
        onClick={(e) => { if (isDragging) e.preventDefault(); }}
      >
        {/* Team Name & Regulation */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-800 group-hover:text-brand-600 dark:text-white/90 dark:group-hover:text-brand-400">
            {team.name}
          </h3>
          <div className="flex items-center gap-1.5">
            {team.regulation && (
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                {shortRegulation(team.regulation)}
              </span>
            )}
          </div>
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

      {/* Remove from folder button */}
      {activeFolderId && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemoveFromFolder(team.id);
          }}
          className="absolute top-2 right-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title="Remove from folder"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
