// src/components/BestOf3Card.jsx
import React, { useState } from 'react';
import {
    ExternalLink,
    Edit3,
    Save,
    X,
    MessageSquare,
    Tag,
    Trophy,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { PokemonTeam } from './index';
import { formatTimeAgo } from '../utils/timeUtils';
import { cleanPokemonName } from '../utils/pokemonNameUtils';
import ReplayService from '../services/ReplayService';

const BestOf3Card = ({ match, onUpdateNotes, onUpdateTags }) => {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [notesText, setNotesText] = useState(match.notes || '');
    const [tagsText, setTagsText] = useState((match.tags || []).join(', '));
    const [savingNotes, setSavingNotes] = useState(false);
    const [savingTags, setSavingTags] = useState(false);

    // Get match summary and styling
    const getMatchSummary = () => {
        const summary = ReplayService.getMatchSummary(match);
        const baseClasses = "px-3 py-1 rounded-full text-sm font-bold";

        if (match.stats?.matchResult === 'win') {
            return {
                text: summary,
                className: `${baseClasses} bg-green-600/20 text-green-400 border border-green-600/30`
            };
        } else if (match.stats?.matchResult === 'loss') {
            return {
                text: summary,
                className: `${baseClasses} bg-red-600/20 text-red-400 border border-red-600/30`
            };
        } else {
            return {
                text: summary,
                className: `${baseClasses} bg-yellow-600/20 text-yellow-400 border border-yellow-600/30`
            };
        }
    };

    // Get game results for display
    const getGameResults = () => {
        return ReplayService.getGameByGameResults(match);
    };

    // Get opponent team (from any game, since team doesn't change within a match)
    const getOpponentTeam = () => {
        if (!match.replays || match.replays.length === 0) return [];

        const firstGame = match.replays[0];
        if (!firstGame.battleData || !firstGame.battleData.teams || !firstGame.battleData.opponentPlayer) {
            return [];
        }

        const opponentTeam = firstGame.battleData.teams[firstGame.battleData.opponentPlayer] || [];
        return opponentTeam.map(pokemon => cleanPokemonName(pokemon));
    };

    const handleSaveNotes = async () => {
        try {
            setSavingNotes(true);
            await onUpdateNotes(match.id, notesText.trim());
            setIsEditingNotes(false);
        } catch (error) {
            console.error('Error saving notes:', error);
        } finally {
            setSavingNotes(false);
        }
    };

    const handleSaveTags = async () => {
        try {
            setSavingTags(true);
            const tags = tagsText
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
            await onUpdateTags(match.id, tags);
            setIsEditingTags(false);
        } catch (error) {
            console.error('Error saving tags:', error);
        } finally {
            setSavingTags(false);
        }
    };

    const handleCancelNotes = () => {
        setNotesText(match.notes || '');
        setIsEditingNotes(false);
    };

    const handleCancelTags = () => {
        setTagsText((match.tags || []).join(', '));
        setIsEditingTags(false);
    };

    const handleKeyPress = (e, saveFunction) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveFunction();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (saveFunction === handleSaveNotes) {
                handleCancelNotes();
            } else {
                handleCancelTags();
            }
        }
    };

    const matchSummary = getMatchSummary();
    const gameResults = getGameResults();
    const opponentTeam = getOpponentTeam();

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    {/* Match result badge */}
                    <span className={matchSummary.className}>
                        {matchSummary.text}
                    </span>

                    {/* Opponent info */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-100">
                            vs {match.opponent || 'Unknown Opponent'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>{formatTimeAgo(match.updatedAt || match.createdAt)}</span>
                            {match.stats?.complete ? (
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                            ) : (
                                <>
                                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                                    <span>Incomplete</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Match info badge */}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Trophy className="h-4 w-4" />
                    <span>{match.stats?.replayCount || 0} games</span>
                </div>
            </div>

            {/* Game results and opponent team */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Game by game results */}
                <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Game Results</h4>
                    <div className="space-y-2">
                        {gameResults.map((game, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-300 font-medium">
                                        Game {game.gameNumber}
                                    </span>
                                    <span className={`font-bold ${game.resultClass}`}>
                                        {game.displayResult}
                                    </span>
                                </div>
                                <a
                                    href={game.replayUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Replay
                                </a>
                            </div>
                        ))}

                        {/* Show placeholders for missing games */}
                        {gameResults.length < 3 && (
                            <>
                                {Array.from({ length: 3 - gameResults.length }).map((_, index) => (
                                    <div key={`missing-${index}`} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border-2 border-dashed border-slate-600">
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-500 font-medium">
                                                Game {gameResults.length + index + 1}
                                            </span>
                                            <span className="text-gray-500">—</span>
                                        </div>
                                        <span className="text-gray-500 text-sm">Not played</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Opponent team */}
                <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Opponent's Team</h4>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                        {opponentTeam.length > 0 ? (
                            <PokemonTeam
                                pokemonNames={opponentTeam}
                                size="md"
                                showNames={true}
                                maxDisplay={6}
                                className="justify-center"
                            />
                        ) : (
                            <div className="text-center text-gray-500 py-4">
                                Team data not available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tags section */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                    </h4>
                    {!isEditingTags && (
                        <button
                            onClick={() => setIsEditingTags(true)}
                            className="text-gray-400 hover:text-blue-400 p-1 rounded transition-colors"
                            title="Edit tags"
                        >
                            <Edit3 className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {isEditingTags ? (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={tagsText}
                            onChange={(e) => setTagsText(e.target.value)}
                            onKeyDown={(e) => handleKeyPress(e, handleSaveTags)}
                            placeholder="Enter tags separated by commas (e.g., tournament, close-match, adaptation)"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 text-sm"
                            disabled={savingTags}
                            autoFocus
                        />
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500">
                                Ctrl+Enter to save, Escape to cancel
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveTags}
                                    disabled={savingTags}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                    {savingTags ? (
                                        <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
                                    ) : (
                                        <Save className="h-2 w-2" />
                                    )}
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelTags}
                                    disabled={savingTags}
                                    className="px-3 py-1 text-gray-300 hover:text-gray-100 transition-colors text-xs"
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
                                    className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-xs border border-blue-600/30"
                                >
                                    {tag}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-500 text-sm italic">No tags</span>
                        )}
                    </div>
                )}
            </div>

            {/* Notes section */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Match Notes
                    </h4>
                    {!isEditingNotes && (
                        <button
                            onClick={() => setIsEditingNotes(true)}
                            className="text-gray-400 hover:text-blue-400 p-1 rounded transition-colors"
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
                            onKeyDown={(e) => handleKeyPress(e, handleSaveNotes)}
                            placeholder="Add strategic notes about this match..."
                            rows={4}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none text-sm"
                            disabled={savingNotes}
                            autoFocus
                        />
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500">
                                Ctrl+Enter to save, Escape to cancel
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={savingNotes}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                    {savingNotes ? (
                                        <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
                                    ) : (
                                        <Save className="h-2 w-2" />
                                    )}
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelNotes}
                                    disabled={savingNotes}
                                    className="px-3 py-1 text-gray-300 hover:text-gray-100 transition-colors text-xs"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-700/30 rounded-lg p-3 min-h-[60px]">
                        {match.notes ? (
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">{match.notes}</p>
                        ) : (
                            <p className="text-gray-500 text-sm italic">No notes added yet</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BestOf3Card;