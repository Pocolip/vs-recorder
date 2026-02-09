// src/components/ReplaysTab.jsx - Compact version focused on replay management
import React, { useState, useMemo } from 'react';
import { Calendar, Trash2, Edit3, Save, X, MessageSquare, ExternalLink, Copy, Check } from 'lucide-react';
import {CompactReplayCard, TagInput} from "@/components/index";
import { formatTimeAgo } from '../utils/timeUtils';
import { matchesPokemonTags, getOpponentPokemonFromReplay } from '../utils/pokemonNameUtils';

const ReplaysTab = ({ replays, onDeleteReplay, onUpdateReplay }) => {
    const [deletingReplayId, setDeletingReplayId] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [savingNoteId, setSavingNoteId] = useState(null);
    const [copying, setCopying] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchTags, setSearchTags] = useState([]);

    const filteredReplays = useMemo(() => {
        if (searchTags.length === 0) return replays;
        return replays.filter(replay =>
            matchesPokemonTags(getOpponentPokemonFromReplay(replay), searchTags)
        );
    }, [replays, searchTags]);

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

    const handleCopyAllReplays = async () => {
        try {
            setCopying(true);

            // Extract replay URLs (filtered if tags active)
            const replayUrls = filteredReplays.map(replay => replay.url).join('\n');

            // Copy to clipboard
            await navigator.clipboard.writeText(replayUrls);

            // Show success feedback
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (error) {
            console.error('Failed to copy replay URLs:', error);
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = filteredReplays.map(replay => replay.url).join('\n');
                document.body.appendChild(textArea);
                textArea.select();
                // TODO: execCommand is deprecated, we should use the Clipboard api
                document.execCommand('copy');
                document.body.removeChild(textArea);

                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (fallbackError) {
                console.error('Fallback copy also failed:', fallbackError);
                alert('Failed to copy to clipboard. Please copy the URLs manually.');
            }
        } finally {
            setCopying(false);
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
                <div>
                    <h3 className="text-xl font-semibold text-gray-100">Replay Collection</h3>
                    <p className="text-gray-400">
                        {searchTags.length > 0
                            ? `${filteredReplays.length} of ${replays.length} replays`
                            : `${replays.length} replays`}
                    </p>
                </div>

                {/* Copy All Replays Button */}
                <button
                    onClick={handleCopyAllReplays}
                    disabled={copying || filteredReplays.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-gray-300 hover:text-white disabled:text-gray-500 rounded-lg text-sm transition-colors disabled:cursor-not-allowed"
                    title="Copy all replay URLs to clipboard"
                >
                    {copying ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                            Copying...
                        </>
                    ) : copied ? (
                        <>
                            <Check className="h-4 w-4 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4" />
                            {searchTags.length > 0 ? 'Copy Filtered URLs' : 'Copy All URLs'}
                        </>
                    )}
                </button>
            </div>

            <TagInput
                tags={searchTags}
                onAddTag={(tag) => setSearchTags(prev => [...prev, tag])}
                onRemoveTag={(tag) => setSearchTags(prev => prev.filter(t => t !== tag))}
                placeholder="Filter by opponent pokemon..."
                className="mb-4"
            />

            {filteredReplays.length === 0 && searchTags.length > 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">No replays match your filters</p>
                    <button
                        onClick={() => setSearchTags([])}
                        className="mt-2 text-emerald-400 hover:text-emerald-300 text-sm"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredReplays.map((replay) => (
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
            )}
        </div>
    );
};

export default ReplaysTab;