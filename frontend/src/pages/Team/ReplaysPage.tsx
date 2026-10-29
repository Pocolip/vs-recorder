import { useState } from "react";
import { Calendar, Copy, Check } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useReplayPage } from "../../hooks/useReplayPage";
import { replayApi } from "../../services/api/replayApi";
import ReplayPagination from "../../components/team/ReplayPagination";
import CompactReplayCard from "../../components/team/CompactReplayCard";
import TagInput from "../../components/form/TagInput";
import * as replayService from "../../services/replayService";
import type { Replay } from "../../types";

export default function ReplaysPage() {
  const { team, bumpStatsVersion } = useActiveTeam();


  // Refresh when another component (e.g. TeamHeader) bumps the version


  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [deletingReplayId, setDeletingReplayId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const [page, setPage] = useState(0);
  const { data, loading, error, refresh: refreshStats } = useReplayPage(team?.id ?? null, { page, tags: searchTags });
  const replays = data?.content ?? [];
  const total = data?.totalElements ?? 0;
  const totalTeam = data?.totalTeam ?? 0;
  const filteredReplays = replays;
  const changeTags = (tags: string[]) => { setSearchTags(tags); setPage(0); };

  const handleDeleteReplay = async (replayId: number) => {
    try {
      setDeletingReplayId(replayId);
      if (!await replayService.deleteReplay(replayId)) throw new Error("Failed to delete replay");
      bumpStatsVersion();
    } catch (error) {
      console.error("Error deleting replay:", error);
    } finally {
      setDeletingReplayId(null);
    }
  };

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

  const handleCopyAllUrls = async () => {
    try {
      if (!team) return;
      const urls = (await replayApi.urls(team.id, { tags: searchTags })).join("\n");
      await navigator.clipboard.writeText(urls);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy replay URLs:", error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <div role="alert">{error} <button onClick={refreshStats}>Retry</button></div>;

  // Empty state
  if (totalTeam === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            No replays yet
          </h3>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add your first replay using the button above to start analyzing your performance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Replays | VS Recorder" description="View team replays" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Section header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Replay Collection
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchTags.length > 0
              ? `${total} of ${totalTeam} replays`
              : `${totalTeam} replays`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyAllUrls}
          disabled={filteredReplays.length === 0}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {searchTags.length > 0 ? "Copy Filtered URLs" : "Copy All URLs"}
            </>
          )}
        </button>
      </div>

      {/* Tag filter */}
      <div className="mb-4">
        <TagInput
          tags={searchTags}
          onTagsChange={changeTags}
          placeholder="Filter by opponent Pokemon..."
        />
      </div>

      <ReplayPagination page={data?.page ?? 0} size={data?.size ?? 25} total={total} onPage={setPage} />

      {/* Filter no-results */}
      {filteredReplays.length === 0 && searchTags.length > 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No replays match your filters.
          </p>
          <button
            type="button"
            onClick={() => changeTags([])}
            className="mt-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Replay list */
        <div className="space-y-2">
          {filteredReplays.map((replay) => (
            <CompactReplayCard
              key={replay.id}
              replay={replay}
              isDeleting={deletingReplayId === replay.id}
              isEditingNote={editingNoteId === replay.id}
              isSavingNote={savingNoteId === replay.id}
              noteText={noteText}
              onDelete={handleDeleteReplay}
              onStartEditNote={startEditingNote}
              onCancelEditNote={cancelEditingNote}
              onSaveNote={saveNote}
              onNoteTextChange={setNoteText}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
