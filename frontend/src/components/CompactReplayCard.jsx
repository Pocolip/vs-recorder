// src/components/CompactReplayCard.jsx
import React, { useState } from 'react';
import { Trash2, Edit3, Save, X, MessageSquare, ExternalLink, ChevronDown } from 'lucide-react';
import PokemonTeam from './PokemonTeam';
import { cleanPokemonName } from '../utils/pokemonNameUtils';
import {getResultDisplay} from "@/utils/resultUtils";

const CompactReplayCard = ({
                               replay,
                               formatTimeAgo,
                               isDeleting,
                               isEditingNote,
                               isSavingNote,
                               noteText,
                               onDeleteReplay,
                               onStartEditingNote,
                               onCancelEditingNote,
                               onSaveNote,
                               onNoteTextChange,
                               onKeyPress
                           }) => {

    const getOpponentDisplay = () => {
        if (!replay.opponent) {
            return 'Unknown opponent';
        }

        // If opponent contains "vs", it's a fallback format
        if (replay.opponent.includes(' vs ')) {
            return replay.opponent;
        }

        return `vs ${replay.opponent}`;
    };

    const getOpponentTeam = () => {
        // Extract opponent's team from battleData
        if (!replay.battleData || !replay.battleData.teams || !replay.battleData.opponentPlayer) {
            return [];
        }

        const opponentTeam = replay.battleData.teams[replay.battleData.opponentPlayer] || [];

        // Clean up Pokemon names using the utility function
        return opponentTeam.map(pokemon => cleanPokemonName(pokemon));
    };

    const [isNoteExpanded, setIsNoteExpanded] = useState(false);
    const resultDisplay = getResultDisplay(replay.result);
    const opponentTeam = getOpponentTeam();

    return (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    {/* Result Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${resultDisplay.className}`}>
                        {resultDisplay.text}
                    </span>

                    {/* Opponent and Battle Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-200 text-sm font-medium">
                                {getOpponentDisplay()}
                            </span>
                            <span className="text-gray-500 text-xs">•</span>
                            <span className="text-gray-400 text-xs">{formatTimeAgo(replay.createdAt)}</span>
                        </div>

                        {/* Additional battle info */}
                        {replay.battleData && (replay.battleData.userPlayer || replay.battleData.winner) && (
                            <div className="text-xs text-gray-500 mt-1">
                                {replay.battleData.winner && (
                                    <span>Winner: {replay.battleData.winner}</span>
                                )}
                                {replay.battleData.userPlayer && replay.battleData.winner && (
                                    <span> • You were {replay.battleData.userPlayer}</span>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Opponent Team Display - Horizontally positioned */}
                    {opponentTeam.length > 0 && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400 whitespace-nowrap">vs</span>
                            <PokemonTeam
                                pokemonNames={opponentTeam}
                                size="md"
                                showNames={false}
                                maxDisplay={6}
                                className="flex-shrink-0"
                            />
                        </div>
                    )}

                    {/* Replay Link */}
                    <a
                        href={replay.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded hover:bg-emerald-600/10 transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" />
                        View Replay
                    </a>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 ml-4">
                    <button
                        onClick={() => onStartEditingNote(replay)}
                        disabled={isEditingNote || isSavingNote}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-600/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit notes"
                    >
                        <MessageSquare className="h-3 w-3" />
                    </button>

                    <button
                        onClick={() => onDeleteReplay(replay.id)}
                        disabled={isDeleting || isEditingNote}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete replay"
                    >
                        {isDeleting ? (
                            <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                        ) : (
                            <Trash2 className="h-3 w-3" />
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible Notes */}
            {replay.notes && !isEditingNote && (
                <button
                    type="button"
                    onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                    className={`w-full mt-2 pt-2 border-t border-slate-600/50 flex items-start gap-1.5 text-left group rounded-b-md ${isNoteExpanded ? 'bg-slate-800/50 p-2' : ''}`}
                >
                    <ChevronDown
                        className={`h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0 transition-transform ${isNoteExpanded ? 'rotate-180' : ''}`}
                    />
                    <p className={`text-xs ${isNoteExpanded ? 'whitespace-pre-wrap break-words text-gray-300' : 'truncate text-gray-400'}`}>
                        {replay.notes}
                    </p>
                </button>
            )}

            {/* Inline Note Editor */}
            {isEditingNote && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                    <div className="space-y-2">
                        <textarea
                            value={noteText}
                            onChange={(e) => onNoteTextChange(e.target.value)}
                            onKeyDown={(e) => onKeyPress(e, replay.id)}
                            placeholder="Add notes about this game..."
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-500 rounded text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none text-sm"
                            disabled={isSavingNote}
                            autoFocus
                        />

                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500">
                                Ctrl+Enter to save, Escape to cancel
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSaveNote(replay.id)}
                                    disabled={isSavingNote}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingNote ? (
                                        <>
                                            <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
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
                                    onClick={onCancelEditingNote}
                                    disabled={isSavingNote}
                                    className="px-3 py-1 text-gray-300 hover:text-gray-100 transition-colors text-xs disabled:opacity-50"
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