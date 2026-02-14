import React, { useState } from "react";
import { Trash2, Save, MessageSquare, ExternalLink, ChevronDown } from "lucide-react";
import PokemonTeam from "../pokemon/PokemonTeam";
import { getResultDisplay } from "../../utils/resultUtils";
import { formatTimeAgo } from "../../utils/timeUtils";
import { getOpponentPokemonFromReplay } from "../../utils/pokemonNameUtils";
import type { Replay } from "../../types";

interface CompactReplayCardProps {
  replay: Replay;
  isDeleting: boolean;
  isEditingNote: boolean;
  isSavingNote: boolean;
  noteText: string;
  onDelete: (id: number) => void;
  onStartEditNote: (replay: Replay) => void;
  onCancelEditNote: () => void;
  onSaveNote: (id: number) => void;
  onNoteTextChange: (text: string) => void;
}

const CompactReplayCard: React.FC<CompactReplayCardProps> = ({
  replay,
  isDeleting,
  isEditingNote,
  isSavingNote,
  noteText,
  onDelete,
  onStartEditNote,
  onCancelEditNote,
  onSaveNote,
  onNoteTextChange,
}) => {
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

  const resultDisplay = getResultDisplay(replay.result);
  const opponentTeam = getOpponentPokemonFromReplay(replay);

  const getOpponentDisplay = () => {
    if (!replay.opponent) return "Unknown opponent";
    if (replay.opponent.includes(" vs ")) return replay.opponent;
    return `vs ${replay.opponent}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSaveNote(replay.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancelEditNote();
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          {/* Result Badge */}
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${resultDisplay.className}`}
          >
            {resultDisplay.text}
          </span>

          {/* Opponent & Time */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                {getOpponentDisplay()}
              </span>
              <span className="text-gray-300 dark:text-gray-600">&middot;</span>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {formatTimeAgo(replay.createdAt)}
              </span>
            </div>
          </div>

          {/* Opponent Team Sprites */}
          {opponentTeam.length > 0 && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="text-xs text-gray-400 dark:text-gray-500">vs</span>
              <PokemonTeam pokemonNames={opponentTeam} size="sm" />
            </div>
          )}

          {/* View Replay Link */}
          <a
            href={replay.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-600 transition-colors hover:bg-brand-50 sm:inline-flex dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </a>
        </div>

        {/* Action Buttons */}
        <div className="ml-3 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStartEditNote(replay)}
            disabled={isEditingNote || isSavingNote}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            title="Edit notes"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(replay.id)}
            disabled={isDeleting || isEditingNote}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            title="Delete replay"
          >
            {isDeleting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile: View Replay link + opponent sprites */}
      <div className="mt-2 flex items-center justify-between sm:hidden">
        {opponentTeam.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">vs</span>
            <PokemonTeam pokemonNames={opponentTeam} size="sm" />
          </div>
        )}
        <a
          href={replay.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
        >
          <ExternalLink className="h-3 w-3" />
          View Replay
        </a>
      </div>

      {/* Collapsible Notes */}
      {replay.notes && !isEditingNote && (
        <button
          type="button"
          onClick={() => setIsNoteExpanded(!isNoteExpanded)}
          className={`mt-3 flex w-full items-start gap-1.5 border-t border-gray-100 pt-2 text-left dark:border-gray-800 ${
            isNoteExpanded ? "rounded-b-lg bg-gray-50 p-2 dark:bg-white/[0.02]" : ""
          }`}
        >
          <ChevronDown
            className={`mt-0.5 h-3 w-3 shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${
              isNoteExpanded ? "rotate-180" : ""
            }`}
          />
          <p
            className={`text-xs ${
              isNoteExpanded
                ? "whitespace-pre-wrap break-words text-gray-600 dark:text-gray-300"
                : "truncate text-gray-400 dark:text-gray-500"
            }`}
          >
            {replay.notes}
          </p>
        </button>
      )}

      {/* Inline Note Editor */}
      {isEditingNote && (
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add notes about this game..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              disabled={isSavingNote}
              autoFocus
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Ctrl+Enter to save, Escape to cancel
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSaveNote(replay.id)}
                  disabled={isSavingNote}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingNote ? (
                    <>
                      <div className="h-2.5 w-2.5 animate-spin rounded-full border border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-2.5 w-2.5" />
                      Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onCancelEditNote}
                  disabled={isSavingNote}
                  className="rounded-md px-3 py-1 text-xs text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactReplayCard;
