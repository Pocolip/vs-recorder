// src/components/AddReplayModal.jsx
import React, { useState } from 'react';
import { X, Link as LinkIcon, FileText, Plus, AlertCircle } from 'lucide-react';

const AddReplayModal = ({ onClose, onAddReplay }) => {
    const [replayUrl, setReplayUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkUrls, setBulkUrls] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validateReplayUrl = (url) => {
        const replayPattern = /^https?:\/\/replay\.pokemonshowdown\.com\/.*$/;
        return replayPattern.test(url.trim());
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();

        const trimmedUrl = replayUrl.trim();
        if (!trimmedUrl) {
            setError('Please enter a replay URL');
            return;
        }

        if (!validateReplayUrl(trimmedUrl)) {
            setError('Please enter a valid Pokémon Showdown replay URL');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const cleanUrl = trimmedUrl.split('?')[0];
            await onAddReplay(cleanUrl, notes.trim());
            // Modal will be closed by parent component on success
        } catch (err) {
            setError(err.message || 'Failed to add replay. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();

        const urls = bulkUrls
            .split('\n')
            .map(url => url.trim())
            .filter(url => url);

        if (urls.length === 0) {
            setError('Please enter at least one replay URL');
            return;
        }

        const invalidUrls = urls.filter(url => !validateReplayUrl(url));
        if (invalidUrls.length > 0) {
            setError(`Invalid URLs found: ${invalidUrls.slice(0, 3).join(', ')}${invalidUrls.length > 3 ? '...' : ''}`);
            return;
        }

        try {
            setLoading(true);
            setError('');

            // For now, we'll add them one by one
            // In a real implementation, you might want to use ReplaysService.createManyFromUrls
            for (const url of urls) {
                const cleanUrl = url.split('?')[0];
                await onAddReplay(cleanUrl, '');
            }

            // Modal will be closed by parent component on success
        } catch (err) {
            setError(err.message || 'Failed to add some replays. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => {
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h2 className="text-xl font-semibold text-gray-100">Add Replay</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        disabled={loading}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="p-6 border-b border-slate-700">
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setBulkMode(false);
                                clearError();
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                !bulkMode
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            }`}
                            disabled={loading}
                        >
                            <LinkIcon className="h-4 w-4" />
                            Single Replay
                        </button>
                        <button
                            onClick={() => {
                                setBulkMode(true);
                                clearError();
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                bulkMode
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            }`}
                            disabled={loading}
                        >
                            <Plus className="h-4 w-4" />
                            Bulk Import
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!bulkMode ? (
                        <form onSubmit={handleSingleSubmit} className="space-y-6">
                            {/* Single URL Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Replay URL *
                                </label>
                                <input
                                    type="url"
                                    value={replayUrl}
                                    onChange={(e) => {
                                        setReplayUrl(e.target.value);
                                        clearError();
                                    }}
                                    placeholder="https://replay.pokemonshowdown.com/..."
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                                    disabled={loading}
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Paste the URL from a Pokémon Showdown replay page
                                </p>
                            </div>

                            {/* Notes Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Notes (optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes about this game..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400 resize-none"
                                    disabled={loading}
                                />
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !replayUrl.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Adding Replay...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            Add Replay
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleBulkSubmit} className="space-y-6">
                            {/* Bulk URLs Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Replay URLs *
                                </label>
                                <textarea
                                    value={bulkUrls}
                                    onChange={(e) => {
                                        setBulkUrls(e.target.value);
                                        clearError();
                                    }}
                                    placeholder={`https://replay.pokemonshowdown.com/game1
https://replay.pokemonshowdown.com/game2
https://replay.pokemonshowdown.com/game3`}
                                    rows={8}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400 resize-none font-mono text-sm"
                                    disabled={loading}
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Enter one replay URL per line
                                </p>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <FileText className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p className="text-blue-400 font-medium mb-1">Bulk Import</p>
                                        <p className="text-gray-300">
                                            This will import multiple replays at once. Each replay will be processed individually,
                                            so if some fail, others may still succeed.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !bulkUrls.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Importing Replays...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            Import All
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddReplayModal;