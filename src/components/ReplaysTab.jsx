// src/components/ReplaysTab.jsx - Compact version focused on replay management
import React, { useState } from 'react';
import { Calendar, Trash2, Edit3, Save, X, MessageSquare, ExternalLink } from 'lucide-react';

const ReplaysTab = ({ replays, formatTimeAgo, onDeleteReplay, onUpdateReplay }) => {
    const [deletingReplayId, setDeletingReplayId] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [savingNoteId, setSavingNoteId] = useState(null);

    const handleDeleteReplay = async (replayId) => {
        try {
            setDeletingReplayId(replayId);
            await onDeleteReplay(replayId);
        } catch (error) {
            console.error('Error deleting replay:', error);
        } finally {
            setDeletingReplayId(null);
        }
    };

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

    if (replays.length === 0) {
        return (
            <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No replays yet</h3>
                <p className="text-gray-400">Add your first replay to start analyzing your performance</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-100">Replay Collection</h3>
                <p className="text-gray-400">{replays.length} replays</p>
            </div>

            <div className="space-y-3">
                {replays.map((replay) => (
                    <CompactReplayCard
                        key={replay.id}
                        replay={replay}
                        formatTimeAgo={formatTimeAgo}
                        isDeleting={deletingReplayId === replay.id}
                        isEditingNote={editingNoteId === replay.id}
                        isSavingNote={savingNoteId === replay.id}
                        noteText={noteText}
                        onDeleteReplay={handleDeleteReplay}
                        onStartEditingNote={startEditingNote}
                        onCancelEditingNote={cancelEditingNote}
                        onSaveNote={saveNote}
                        onNoteTextChange={setNoteText}
                        onKeyPress={handleKeyPress}
                    />
                ))}
            </div>
        </div>
    );
};

// Compact Replay Card Component
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
    return (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    {/* Result Badge */}
                    <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                        replay.result === 'win'
                            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                            : replay.result === 'loss'
                                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                                : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                    }`}>
                        {replay.result ? replay.result.toUpperCase() : 'UNKNOWN'}
                    </span>

                    {/* Opponent and Time */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {replay.opponent && (
                                <span className="text-gray-300 text-sm">vs {replay.opponent}</span>
                            )}
                            <span className="text-gray-500 text-xs">•</span>
                            <span className="text-gray-400 text-xs">{formatTimeAgo(replay.createdAt)}</span>
                        </div>

                        {/* Notes Preview */}
                        {replay.notes && !isEditingNote && (
                            <p className="text-gray-400 text-xs mt-1 truncate">
                                {replay.notes}
                            </p>
                        )}
                    </div>

                    {/* Replay Link */}
                    <a
                        href={replay.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1 flex-shrink-0"
                    >
                        <ExternalLink className="h-3 w-3" />
                        View
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

export default ReplaysTab;