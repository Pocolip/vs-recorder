// src/components/GameByGameTab.jsx
import React, { useState } from 'react';
import { Calendar, Filter, SortAsc, SortDesc } from 'lucide-react';
import GameCard from './GameCard';
import {formatTimeAgo} from "@/utils/timeUtils";

const GameByGameTab = ({ replays, onUpdateReplay }) => {
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterResult, setFilterResult] = useState('all');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [savingNoteId, setSavingNoteId] = useState(null);

    const startEditingNote = (replay) => {
        setEditingNoteId(replay.id);
        setNoteText(replay.notes || '');
    };

    const cancelEditingNote = () => {
        setEditingNoteId(null);
        setNoteText('');
    };

    const saveNote = async (replayId) => {
        try {
            setSavingNoteId(replayId);
            await onUpdateReplay(replayId, { notes: noteText.trim() });
            setEditingNoteId(null);
            setNoteText('');
        } catch (error) {
            console.error('Error updating replay note:', error);
        } finally {
            setSavingNoteId(null);
        }
    };

    const handleKeyPress = (e, replayId) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveNote(replayId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditingNote();
        }
    };

    // Null check
    if (!replays) {
        return (
            <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No data available</h3>
                <p className="text-gray-400">Unable to load game data</p>
            </div>
        );
    }

    // Filter replays based on result
    const filteredReplays = replays.filter(replay => {
        if (filterResult === 'all') return true;
        return replay.result === filterResult;
    });

    // Sort replays
    const sortedReplays = [...filteredReplays].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'date':
                comparison = new Date(a.createdAt) - new Date(b.createdAt);
                break;
            case 'result':
                if (a.result === b.result) {
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                } else if (a.result === 'win') {
                    comparison = -1;
                } else if (b.result === 'win') {
                    comparison = 1;
                } else {
                    comparison = 0;
                }
                break;
            case 'opponent':
                comparison = (a.opponent || '').localeCompare(b.opponent || '');
                break;
            default:
                comparison = 0;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const toggleSortOrder = () => {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    };

    if (replays.length === 0) {
        return (
            <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No games recorded</h3>
                <p className="text-gray-400">Add replays to see detailed game-by-game analysis</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-semibold text-gray-100">Game by Game Analysis</h3>
                    <p className="text-gray-400">
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
                            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-gray-100 text-sm focus:outline-none focus:border-emerald-400"
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
                            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-gray-100 text-sm focus:outline-none focus:border-emerald-400"
                        >
                            <option value="date">Sort by Date</option>
                            <option value="result">Sort by Result</option>
                            <option value="opponent">Sort by Opponent</option>
                        </select>

                        <button
                            onClick={toggleSortOrder}
                            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-slate-700 rounded transition-colors"
                            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        >
                            {sortOrder === 'asc' ? (
                                <SortAsc className="h-4 w-4" />
                            ) : (
                                <SortDesc className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Games List */}
            {sortedReplays.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">No games match the current filters</p>
                    <button
                        onClick={() => {
                            setFilterResult('all');
                            setSortBy('date');
                            setSortOrder('desc');
                        }}
                        className="mt-2 text-emerald-400 hover:text-emerald-300 text-sm"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedReplays.map((replay) => (
                        <GameCard
                            key={replay.id}
                            replay={replay}
                            formatTimeAgo={formatTimeAgo}
                            isEditingNote={editingNoteId === replay.id}
                            isSavingNote={savingNoteId === replay.id}
                            noteText={noteText}
                            onStartEditingNote={startEditingNote}
                            onCancelEditingNote={cancelEditingNote}
                            onSaveNote={saveNote}
                            onNoteTextChange={setNoteText}
                            onKeyPress={handleKeyPress}
                        />
                    ))}
                </div>
            )}

            {/* Summary Stats */}
            {filteredReplays.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-600">
                    <h4 className="text-lg font-semibold text-gray-100 mb-4">
                        {filterResult === 'all' ? 'Overall' : filterResult === 'win' ? 'Wins' : 'Losses'} Summary
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-gray-100">{filteredReplays.length}</p>
                            <p className="text-gray-400 text-sm">Total Games</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-400">
                                {filteredReplays.filter(r => r.result === 'win').length}
                            </p>
                            <p className="text-gray-400 text-sm">Wins</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-red-400">
                                {filteredReplays.filter(r => r.result === 'loss').length}
                            </p>
                            <p className="text-gray-400 text-sm">Losses</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-emerald-400">
                                {filteredReplays.length > 0
                                    ? Math.round((filteredReplays.filter(r => r.result === 'win').length / filteredReplays.length) * 100)
                                    : 0
                                }%
                            </p>
                            <p className="text-gray-400 text-sm">Win Rate</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameByGameTab;