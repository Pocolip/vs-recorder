// src/components/GameByGameTab.jsx
import React, { useState } from 'react';
import { Calendar, Trash2, Edit3, Save, X, MessageSquare } from 'lucide-react';

const GameByGameTab = ({ replays, formatTimeAgo, onDeleteReplay, onUpdateReplay }) => {
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
                <h3 className="text-xl font-semibold text-gray-100">Game History</h3>
                <p className="text-gray-400">{replays.length} games</p>
            </div>

            <div className="space-y-4">
                {replays.map((replay) => (
                    <ReplayCard
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

// Individual Replay Card Component
const ReplayCard = ({
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
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                            replay.result === 'win'
                                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                                : replay.result === 'loss'
                                    ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                                    : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                        }`}>
                            {replay.result ? replay.result.toUpperCase() : 'UNKNOWN'}
                        </span>
                        {replay.opponent && (
                            <span className="text-gray-300">vs {replay.opponent}</span>
                        )}
                        <div className="text-right text-sm text-gray-400">
                            {formatTimeAgo(replay.createdAt)}
                        </div>
                    </div>

                    <a
                        href={replay.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 text-sm inline-block mb-3"
                    >
                        View Replay →
                    </a>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onStartEditingNote(replay)}
                        disabled={isEditingNote || isSavingNote}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit notes"
                    >
                        <MessageSquare className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => onDeleteReplay(replay.id)}
                        disabled={isDeleting || isEditingNote}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete replay"
                    >
                        {isDeleting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Notes Section */}
            <div className="border-t border-slate-600 pt-3">
                {isEditingNote ? (
                    <NoteEditor
                        noteText={noteText}
                        isSaving={isSavingNote}
                        onNoteTextChange={onNoteTextChange}
                        onSave={() => onSaveNote(replay.id)}
                        onCancel={onCancelEditingNote}
                        onKeyPress={(e) => onKeyPress(e, replay.id)}
                    />
                ) : (
                    <NoteDisplay
                        notes={replay.notes}
                        onStartEditing={() => onStartEditingNote(replay)}
                    />
                )}
            </div>
        </div>
    );
};

// Note Editor Component
const NoteEditor = ({ noteText, isSaving, onNoteTextChange, onSave, onCancel, onKeyPress }) => {
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    Notes
                </label>
                <textarea
                    value={noteText}
                    onChange={(e) => onNoteTextChange(e.target.value)}
                    onKeyDown={onKeyPress}
                    placeholder="Add notes about this game..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-500 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none"
                    disabled={isSaving}
                    autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                    Press Ctrl+Enter to save, Escape to cancel
                </p>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-3 w-3" />
                            Save
                        </>
                    )}
                </button>
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-3 py-2 text-gray-300 hover:text-gray-100 transition-colors text-sm disabled:opacity-50"
                >
                    <X className="h-3 w-3 inline mr-1" />
                    Cancel
                </button>
            </div>
        </div>
    );
};

// Note Display Component
const NoteDisplay = ({ notes, onStartEditing }) => {
    return (
        <div className="group">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        <MessageSquare className="h-4 w-4 inline mr-1" />
                        Notes
                    </label>
                    {notes ? (
                        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3">
                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{notes}</p>
                        </div>
                    ) : (
                        <div
                            onClick={onStartEditing}
                            className="bg-slate-800/30 border border-slate-600 border-dashed rounded-lg p-3 cursor-pointer hover:bg-slate-800/50 transition-colors group-hover:border-slate-500"
                        >
                            <p className="text-gray-500 text-sm italic">Click to add notes...</p>
                        </div>
                    )}
                </div>

                {notes && (
                    <button
                        onClick={onStartEditing}
                        className="ml-3 p-1 text-gray-400 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit notes"
                    >
                        <Edit3 className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default GameByGameTab;