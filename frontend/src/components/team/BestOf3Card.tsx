import { useState } from "react";
import { ExternalLink, Edit3, Save, Tag, Trophy, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import PokemonTeam from "../pokemon/PokemonTeam";
import PokemonSprite from "../pokemon/PokemonSprite";
import TagInput from "../form/TagInput";
import { cleanPokemonName } from "../../utils/pokemonNameUtils";
import { formatTimeAgo } from "../../utils/timeUtils";
import type { Match, Replay } from "../../types";

interface BestOf3CardProps {
  match: Match;
  onUpdateNotes: (matchId: number, notes: string) => Promise<void>;
  onUpdateTags: (matchId: number, tags: string[]) => Promise<void>;
}

interface GameResult {
  gameNumber: number;
  displayResult: string;
  resultClass: string;
  replayUrl: string;
  userPicks: string[];
  opponentPicks: string[];
}

function getMatchSummary(match: Match): { text: string; className: string } {
  const baseClasses = "px-3 py-1 rounded-full text-sm font-bold";

  if (!match.replays || match.replays.length === 0) {
    return {
      text: "No games",
      className: `${baseClasses} bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-600/20 dark:text-gray-400 dark:border-gray-600/30`,
    };
  }

  const wins = match.replays.filter((r) => r.result === "win").length;
  const losses = match.replays.filter((r) => r.result === "loss").length;
  const matchResult = match.matchResult || (wins > losses ? "win" : losses > wins ? "loss" : "tie");

  let text: string;
  if (matchResult === "win") {
    text = `Won ${wins}-${losses}`;
  } else if (matchResult === "loss") {
    text = `Lost ${losses}-${wins}`;
  } else {
    text = `Tied ${wins}-${losses}`;
  }

  if (matchResult === "win") {
    return {
      text,
      className: `${baseClasses} bg-green-50 text-green-700 border border-green-200 dark:bg-green-600/20 dark:text-green-400 dark:border-green-600/30`,
    };
  } else if (matchResult === "loss") {
    return {
      text,
      className: `${baseClasses} bg-red-50 text-red-700 border border-red-200 dark:bg-red-600/20 dark:text-red-400 dark:border-red-600/30`,
    };
  }
  return {
    text,
    className: `${baseClasses} bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-600/20 dark:text-yellow-400 dark:border-yellow-600/30`,
  };
}

function getGameByGameResults(match: Match): GameResult[] {
  if (!match.replays || match.replays.length === 0) return [];

  const sorted = [...match.replays].sort((a, b) => {
    const aNum = a.gameNumber || 0;
    const bNum = b.gameNumber || 0;
    return aNum - bNum;
  });

  return sorted.map((replay) => {
    const isWin = replay.result === "win";
    const picks = getPicksForReplay(replay);
    return {
      gameNumber: replay.gameNumber || 1,
      displayResult: isWin ? "Win" : "Loss",
      resultClass: isWin
        ? "text-green-700 dark:text-green-400"
        : "text-red-700 dark:text-red-400",
      replayUrl: replay.url,
      userPicks: picks.userPicks,
      opponentPicks: picks.opponentPicks,
    };
  });
}

function getPicksForReplay(replay: Replay): { userPicks: string[]; opponentPicks: string[] } {
  if (!replay.battleData?.actualPicks) return { userPicks: [], opponentPicks: [] };
  const { userPlayer, opponentPlayer, actualPicks } = replay.battleData;
  const userPicks = userPlayer && actualPicks[userPlayer]?.length ? actualPicks[userPlayer] : [];
  const opponentPicks = opponentPlayer && actualPicks[opponentPlayer]?.length ? actualPicks[opponentPlayer] : [];
  return { userPicks, opponentPicks };
}

function getOpponentTeam(match: Match): string[] {
  if (!match.replays || match.replays.length === 0) return [];

  const firstGame = match.replays[0];
  if (!firstGame.battleData?.teams || !firstGame.battleData.opponentPlayer) return [];

  const opponentTeam = firstGame.battleData.teams[firstGame.battleData.opponentPlayer] || [];
  return opponentTeam.map((pokemon) => cleanPokemonName(pokemon));
}

export default function BestOf3Card({ match, onUpdateNotes, onUpdateTags }: BestOf3CardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [notesText, setNotesText] = useState(match.notes || "");
  const [editTags, setEditTags] = useState<string[]>(match.tags || []);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await onUpdateNotes(match.id, notesText.trim());
      setIsEditingNotes(false);
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveTags = async () => {
    try {
      setSavingTags(true);
      await onUpdateTags(match.id, editTags);
      setIsEditingTags(false);
    } catch (error) {
      console.error("Error saving tags:", error);
    } finally {
      setSavingTags(false);
    }
  };

  const handleCancelNotes = () => {
    setNotesText(match.notes || "");
    setIsEditingNotes(false);
  };

  const handleCancelTags = () => {
    setEditTags(match.tags || []);
    setIsEditingTags(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, saveFunction: () => void, cancelFunction: () => void) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveFunction();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelFunction();
    }
  };

  const matchSummary = getMatchSummary(match);
  const gameResults = getGameByGameResults(match);
  const opponentTeam = getOpponentTeam(match);

  // Derive stats from replays
  const replayCount = match.replays?.length || 0;
  const wins = match.replays?.filter((r) => r.result === "win").length || 0;
  const losses = match.replays?.filter((r) => r.result === "loss").length || 0;
  const isComplete = match.isComplete ?? (replayCount >= 2 && (wins >= 2 || losses >= 2));

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
      {/* Header row */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <span className={matchSummary.className}>{matchSummary.text}</span>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            vs {match.opponent || "Unknown Opponent"}
          </h3>
        </div>
        <div className="flex items-center justify-center gap-3 text-sm text-gray-500 sm:justify-end dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4" />
            <span>{replayCount} games</span>
          </div>
          <span>{formatTimeAgo(match.updatedAt || match.createdAt)}</span>
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span>Incomplete</span>
            </div>
          )}
        </div>
      </div>

      {/* Game results and opponent team */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Game by game results */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Game Results</h4>
          <div className="space-y-2">
            {gameResults.map((game) => (
              <div key={game.gameNumber} className="rounded-lg bg-white dark:bg-gray-700/50">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Game {game.gameNumber}</span>
                    <span className={`font-bold ${game.resultClass}`}>{game.displayResult}</span>
                  </div>
                  <a
                    href={game.replayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Replay
                  </a>
                </div>
                {(game.userPicks.length > 0 || game.opponentPicks.length > 0) && (
                  <div className="flex flex-col gap-2 border-t border-gray-100 px-3 pb-2 pt-1.5 sm:flex-row sm:gap-4 dark:border-gray-600/50">
                    <div className="flex-1">
                      <p className="mb-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">Your Picks</p>
                      <div className="flex gap-0.5">
                        {game.userPicks.map((pokemon, index) => (
                          <PokemonSprite key={index} name={cleanPokemonName(pokemon)} size="sm" />
                        ))}
                        {Array.from({ length: Math.max(0, 4 - game.userPicks.length) }).map((_, index) => (
                          <div
                            key={`empty-${index}`}
                            className="flex h-8 w-8 items-center justify-center text-gray-300 dark:text-gray-600"
                          >
                            &mdash;
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="mb-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">Their Picks</p>
                      <div className="flex gap-0.5">
                        {game.opponentPicks.map((pokemon, index) => (
                          <PokemonSprite key={index} name={cleanPokemonName(pokemon)} size="sm" />
                        ))}
                        {Array.from({ length: Math.max(0, 4 - game.opponentPicks.length) }).map((_, index) => (
                          <div
                            key={`empty-${index}`}
                            className="flex h-8 w-8 items-center justify-center text-gray-300 dark:text-gray-600"
                          >
                            &mdash;
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Placeholders for unplayed games */}
            {gameResults.length < 3 &&
              Array.from({ length: 3 - gameResults.length }).map((_, index) => (
                <div
                  key={`missing-${index}`}
                  className="flex items-center justify-between rounded-lg border-2 border-dashed border-gray-200 bg-white/50 p-3 dark:border-gray-600 dark:bg-gray-700/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-400">Game {gameResults.length + index + 1}</span>
                    <span className="text-gray-400">&mdash;</span>
                  </div>
                  <span className="text-sm text-gray-400">Not played</span>
                </div>
              ))}
          </div>
        </div>

        {/* Opponent team */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Opponent&apos;s Team</h4>
          <div className="rounded-lg bg-white p-4 dark:bg-gray-700/50">
            {opponentTeam.length > 0 ? (
              <PokemonTeam pokemonNames={opponentTeam} size="md" />
            ) : (
              <div className="py-4 text-center text-gray-400">Team data not available</div>
            )}
          </div>
        </div>
      </div>

      {/* Tags section */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Tag className="h-4 w-4" />
            Tags
          </h4>
          {!isEditingTags && (
            <button
              type="button"
              onClick={() => setIsEditingTags(true)}
              className="rounded p-1 text-gray-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              title="Edit tags"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
        </div>

        {isEditingTags ? (
          <div className="space-y-2" onKeyDown={(e) => handleKeyDown(e, handleSaveTags, handleCancelTags)}>
            <TagInput tags={editTags} onTagsChange={setEditTags} placeholder="Type a tag and press Enter..." />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Ctrl+Enter to save, Escape to cancel</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveTags}
                  disabled={savingTags}
                  className="flex items-center gap-1 rounded bg-brand-600 px-3 py-1 text-xs text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {savingTags ? (
                    <div className="h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : (
                    <Save className="h-2 w-2" />
                  )}
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelTags}
                  disabled={savingTags}
                  className="px-3 py-1 text-xs text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {match.tags && match.tags.length > 0 ? (
              match.tags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:border-blue-600/30 dark:bg-blue-600/20 dark:text-blue-400"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm italic text-gray-400">No tags</span>
            )}
          </div>
        )}
      </div>

      {/* Notes section */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <MessageSquare className="h-4 w-4" />
            Match Notes
          </h4>
          {!isEditingNotes && (
            <button
              type="button"
              onClick={() => setIsEditingNotes(true)}
              className="rounded p-1 text-gray-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              title="Edit notes"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleSaveNotes, handleCancelNotes)}
              placeholder="Add strategic notes about this match..."
              rows={4}
              className="w-full resize-none rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              disabled={savingNotes}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Ctrl+Enter to save, Escape to cancel</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex items-center gap-1 rounded bg-brand-600 px-3 py-1 text-xs text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {savingNotes ? (
                    <div className="h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : (
                    <Save className="h-2 w-2" />
                  )}
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelNotes}
                  disabled={savingNotes}
                  className="px-3 py-1 text-xs text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[60px] rounded-lg bg-white p-3 dark:bg-gray-700/30">
            {match.notes ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {match.notes}
              </p>
            ) : (
              <p className="text-sm italic text-gray-400">No notes added yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
