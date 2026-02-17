import { useState } from "react";
import { ExternalLink, ChevronDown, MessageSquare, Save } from "lucide-react";
import PokemonSprite from "../pokemon/PokemonSprite";
import { cleanPokemonName } from "../../utils/pokemonNameUtils";
import { getResultDisplay } from "../../utils/resultUtils";
import { formatTimeAgo } from "../../utils/timeUtils";
import type { Replay } from "../../types";

interface GameCardProps {
  replay: Replay;
  isEditingNote: boolean;
  isSavingNote: boolean;
  noteText: string;
  onStartEditNote: (replay: Replay) => void;
  onCancelEditNote: () => void;
  onSaveNote: (id: number) => void;
  onNoteTextChange: (text: string) => void;
}

const typeEmojis: Record<string, string> = {
  normal: "\u26AA",
  fire: "\uD83D\uDD25",
  water: "\uD83D\uDCA7",
  electric: "\u26A1",
  grass: "\uD83C\uDF3F",
  ice: "\u2744\uFE0F",
  fighting: "\uD83D\uDC4A",
  poison: "\u2620\uFE0F",
  ground: "\uD83C\uDF0D",
  flying: "\uD83C\uDF24\uFE0F",
  psychic: "\uD83D\uDD2E",
  bug: "\uD83D\uDC1B",
  rock: "\uD83D\uDDFF",
  ghost: "\uD83D\uDC7B",
  dragon: "\uD83D\uDC09",
  dark: "\uD83C\uDF11",
  steel: "\u2699\uFE0F",
  fairy: "\uD83E\uDDDA",
  stellar: "\u2B50",
};

function TypeIcon({ type, size = "w-4 h-4" }: { type: string; size?: string }) {
  const [imgError, setImgError] = useState(false);

  if (!type) return <span className="text-gray-500 dark:text-gray-400">?</span>;

  if (imgError) {
    return <span className="text-sm" title={type}>{typeEmojis[type] || "\u2753"}</span>;
  }

  return (
    <img
      src={`/icons/types/${type}.png`}
      alt={type}
      className={`${size} shrink-0`}
      onError={() => setImgError(true)}
    />
  );
}

export default function GameCard({
  replay,
  isEditingNote,
  isSavingNote,
  noteText,
  onStartEditNote,
  onCancelEditNote,
  onSaveNote,
  onNoteTextChange,
}: GameCardProps) {
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);

  const getTeamData = () => {
    if (!replay.battleData?.teams) {
      return { opponentTeam: [], userPicks: [], opponentPicks: [] };
    }

    const { teams, userPlayer, opponentPlayer, actualPicks } = replay.battleData;
    const opponentTeam = opponentPlayer ? (teams[opponentPlayer] || []).slice(0, 6) : [];
    const userPicks = userPlayer && actualPicks?.[userPlayer]?.length ? actualPicks[userPlayer] : [];
    const opponentPicks = opponentPlayer && actualPicks?.[opponentPlayer]?.length ? actualPicks[opponentPlayer] : [];

    return { opponentTeam, userPicks, opponentPicks };
  };

  const getTeraData = () => {
    if (!replay.battleData?.teraEvents) {
      return { userTera: null, opponentTera: null };
    }

    const { teraEvents, userPlayer, opponentPlayer } = replay.battleData;
    const userTera = userPlayer && teraEvents[userPlayer]?.length ? teraEvents[userPlayer][0] : null;
    const opponentTera = opponentPlayer && teraEvents[opponentPlayer]?.length ? teraEvents[opponentPlayer][0] : null;

    return { userTera, opponentTera };
  };

  const getEloData = () => {
    if (!replay.battleData?.eloChanges) {
      return { userElo: null, opponentElo: null };
    }

    const { eloChanges, userPlayer, opponentPlayer } = replay.battleData;
    const userElo = userPlayer ? eloChanges[userPlayer] || null : null;
    const opponentElo = opponentPlayer ? eloChanges[opponentPlayer] || null : null;

    return { userElo, opponentElo };
  };

  const handleKeyDown = (e: React.KeyboardEvent, replayId: number) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSaveNote(replayId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancelEditNote();
    }
  };

  const resultDisplay = getResultDisplay(replay.result);
  const teamData = getTeamData();
  const teraData = getTeraData();
  const eloData = getEloData();

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      {/* Main row with all data */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
        {/* Result + Opponent + Time + Replay Link */}
        <div className="lg:col-span-1">
          <div className="space-y-1">
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${resultDisplay.className}`}>
              {resultDisplay.text}
            </span>
            <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
              vs {replay.opponent || "Unknown"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(replay.createdAt)}</p>
            <a
              href={replay.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded bg-brand-600/10 px-2 py-0.5 text-xs text-brand-600 transition-colors hover:bg-brand-600/20 dark:bg-brand-500/20 dark:text-brand-400 dark:hover:bg-brand-500/30"
            >
              <ExternalLink className="h-3 w-3" />
              Replay
            </a>
          </div>
        </div>

        {/* Opposing Team */}
        <div className="lg:col-span-4">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Opposing Team</p>
          <div className="rounded border border-gray-200 bg-white/50 px-1.5 py-1 dark:border-gray-600 dark:bg-gray-700/30">
            <div className="flex justify-evenly">
              {teamData.opponentTeam.map((pokemon, index) => (
                <PokemonSprite key={index} name={cleanPokemonName(pokemon)} size="md" />
              ))}
            </div>
          </div>
        </div>

        {/* Your Picks */}
        <div className="lg:col-span-2">
          <p className="mb-1 text-xs text-blue-600 dark:text-blue-400">Your Picks</p>
          <div className="rounded border border-blue-200 bg-blue-50/50 px-1.5 py-1 dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="flex justify-evenly">
              {teamData.userPicks.map((pokemon, index) => (
                <PokemonSprite key={index} name={cleanPokemonName(pokemon)} size="sm" />
              ))}
              {Array.from({ length: Math.max(0, 4 - teamData.userPicks.length) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex h-8 w-8 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-100/50 dark:border-gray-600 dark:bg-gray-700/50"
                >
                  <span className="text-xs text-gray-400">&mdash;</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Their Picks */}
        <div className="lg:col-span-2">
          <p className="mb-1 text-xs text-red-600 dark:text-red-400">Their Picks</p>
          <div className="rounded border border-red-200 bg-red-50/50 px-1.5 py-1 dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex justify-evenly">
              {teamData.opponentPicks.map((pokemon, index) => (
                <PokemonSprite key={index} name={cleanPokemonName(pokemon)} size="sm" />
              ))}
              {Array.from({ length: Math.max(0, 4 - teamData.opponentPicks.length) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex h-8 w-8 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-100/50 dark:border-gray-600 dark:bg-gray-700/50"
                >
                  <span className="text-xs text-gray-400">&mdash;</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Terastallization */}
        <div className="lg:col-span-1">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Tera</p>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-6 shrink-0 text-xs text-blue-600 dark:text-blue-400">You</span>
              {teraData.userTera ? (
                <div className="flex items-center gap-0.5">
                  <PokemonSprite name={cleanPokemonName(teraData.userTera.pokemon)} size="sm" />
                  <TypeIcon type={teraData.userTera.type} size="w-4 h-4" />
                </div>
              ) : (
                <span className="text-xs text-gray-400">&mdash;</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-6 shrink-0 text-xs text-red-600 dark:text-red-400">Opp</span>
              {teraData.opponentTera ? (
                <div className="flex items-center gap-0.5">
                  <PokemonSprite name={cleanPokemonName(teraData.opponentTera.pokemon)} size="sm" />
                  <TypeIcon type={teraData.opponentTera.type} size="w-4 h-4" />
                </div>
              ) : (
                <span className="text-xs text-gray-400">&mdash;</span>
              )}
            </div>
          </div>
        </div>

        {/* ELO Changes */}
        <div className="lg:col-span-2">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">ELO Changes</p>
          <div className="space-y-1">
            <div>
              <span className="text-xs text-blue-600 dark:text-blue-400">You: </span>
              {eloData.userElo?.before && eloData.userElo?.after ? (
                <span className={`text-xs ${replay.result === "win" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {eloData.userElo.before} &rarr; {eloData.userElo.after}
                  <span className="ml-1">
                    ({eloData.userElo.change > 0 ? "+" : ""}{eloData.userElo.change})
                  </span>
                </span>
              ) : (
                <span className="text-xs text-gray-400">Unknown</span>
              )}
            </div>
            <div>
              <span className="text-xs text-red-600 dark:text-red-400">Opp: </span>
              {eloData.opponentElo?.before && eloData.opponentElo?.after ? (
                <span className={`text-xs ${replay.result === "loss" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {eloData.opponentElo.before} &rarr; {eloData.opponentElo.after}
                  <span className="ml-1">
                    ({eloData.opponentElo.change > 0 ? "+" : ""}{eloData.opponentElo.change})
                  </span>
                </span>
              ) : (
                <span className="text-xs text-gray-400">Unknown</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes row + Edit Button */}
      {!isEditingNote && (
        <div className="mt-3 flex items-start gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          {replay.notes ? (
            <button
              type="button"
              onClick={() => setIsNoteExpanded(!isNoteExpanded)}
              className={`flex min-w-0 flex-1 items-start gap-1.5 rounded text-left ${isNoteExpanded ? "bg-gray-100 p-2 dark:bg-gray-800/50" : ""}`}
            >
              <ChevronDown
                className={`mt-0.5 h-3 w-3 shrink-0 text-gray-400 transition-transform ${isNoteExpanded ? "rotate-180" : ""}`}
              />
              <p className={`text-xs ${isNoteExpanded ? "whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300" : "truncate text-gray-500 dark:text-gray-400"}`}>
                {replay.notes}
              </p>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="button"
            onClick={() => onStartEditNote(replay)}
            className="shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-600/10 dark:hover:text-blue-400"
            title="Edit notes"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Inline Note Editor */}
      {isEditingNote && (
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => onNoteTextChange(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, replay.id)}
              placeholder="Add notes about this game..."
              rows={2}
              className="w-full resize-none rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              disabled={isSavingNote}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Ctrl+Enter to save, Escape to cancel</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSaveNote(replay.id)}
                  disabled={isSavingNote}
                  className="flex items-center gap-1 rounded bg-brand-600 px-3 py-1 text-xs text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingNote ? (
                    <>
                      <div className="h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-2 w-2" />
                      Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onCancelEditNote}
                  disabled={isSavingNote}
                  className="px-3 py-1 text-xs text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
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
}
