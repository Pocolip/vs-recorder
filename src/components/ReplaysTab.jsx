// src/components/ReplaysTab.jsx - Compact version focused on replay management
import React, { useState } from 'react';
import { Calendar, Trash2, Edit3, Save, X, MessageSquare, ExternalLink } from 'lucide-react';
import {CompactReplayCard} from "@/components/index";
import { formatTimeAgo } from '../utils/timeUtils';

const ReplaysTab = ({ replays, onDeleteReplay, onUpdateReplay }) => {
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

export default ReplaysTab;