import { useState, useMemo, useEffect, useRef } from "react";
import { Calendar, Filter, SortAsc, SortDesc } from "lucide-react";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useTeamStats } from "../../hooks/useTeamStats";
import GameCard from "../../components/team/GameCard";
import TagInput from "../../components/form/TagInput";
import * as replayService from "../../services/replayService";
import { matchesPokemonTags, getOpponentPokemonFromReplay } from "../../utils/pokemonNameUtils";
import type { Replay } from "../../types";

export default function GameByGamePage() {
  const { team, statsVersion } = useActiveTeam();
  const { replays, loading, refreshStats } = useTeamStats(team?.id ?? null);

  const prevVersion = useRef(statsVersion);
  useEffect(() => {
    if (statsVersion !== prevVersion.current) {
      prevVersion.current = statsVersion;
      refreshStats();
    }
  }, [statsVersion, refreshStats]);

  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterResult, setFilterResult] = useState("all");
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  const startEditingNote = (replay: Replay) => {
    setEditingNoteId(replay.id);
    setNoteText(replay.notes || "");
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setNoteText("");
  };

  const saveNote = async (replayId: number) => {
    try {
      setSavingNoteId(replayId);
      await replayService.update(replayId, { notes: noteText.trim() });
      refreshStats();
      setEditingNoteId(null);
      setNoteText("");
    } catch (error) {
      console.error("Error updating replay note:", error);
    } finally {
      setSavingNoteId(null);
    }
  };

  const filteredReplays = useMemo(() => {
    return replays.filter((replay) => {
      if (searchTags.length > 0 && !matchesPokemonTags(getOpponentPokemonFromReplay(replay), searchTags)) {
        return false;
      }
      if (filterResult !== "all" && replay.result !== filterResult) {
        return false;
      }
      return true;
    });
  }, [replays, searchTags, filterResult]);

  const sortedReplays = useMemo(() => {
    return [...filteredReplays].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "result":
          if (a.result === b.result) {
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          } else if (a.result === "win") {
            comparison = -1;
          } else if (b.result === "win") {
            comparison = 1;
          }
          break;
        case "opponent":
          comparison = (a.opponent || "").localeCompare(b.opponent || "");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredReplays, sortBy, sortOrder]);

  const clearFilters = () => {
    setFilterResult("all");
    setSortBy("date");
    setSortOrder("desc");
    setSearchTags([]);
  };

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (replays.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">No games recorded</h3>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add replays to see detailed game-by-game analysis.
          </p>
        </div>
      </div>
    );
  }

  const wins = filteredReplays.filter((r) => r.result === "win").length;
  const losses = filteredReplays.filter((r) => r.result === "loss").length;
  const winRate = filteredReplays.length > 0 ? Math.round((wins / filteredReplays.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Game by Game Analysis</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredReplays.length} of {replays.length} games
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          {/* Result Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">All Results</option>
              <option value="win">Wins Only</option>
              <option value="loss">Losses Only</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="date">Sort by Date</option>
              <option value="result">Sort by Result</option>
              <option value="opponent">Sort by Opponent</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
            >
              {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tag filter */}
      <div className="mb-4">
        <TagInput tags={searchTags} onTagsChange={setSearchTags} placeholder="Filter by opponent Pokemon..." />
      </div>

      {/* Games List */}
      {sortedReplays.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No games match the current filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedReplays.map((replay) => (
            <GameCard
              key={replay.id}
              replay={replay}
              isEditingNote={editingNoteId === replay.id}
              isSavingNote={savingNoteId === replay.id}
              noteText={noteText}
              onStartEditNote={startEditingNote}
              onCancelEditNote={cancelEditingNote}
              onSaveNote={saveNote}
              onNoteTextChange={setNoteText}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {filteredReplays.length > 0 && (
        <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
          <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
            {filterResult === "all" ? "Overall" : filterResult === "win" ? "Wins" : "Losses"} Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{filteredReplays.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Games</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{wins}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Wins</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{losses}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Losses</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{winRate}%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
