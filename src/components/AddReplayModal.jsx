// src/components/AddReplayModal.jsx
import React, { useState } from 'react';
import { ReplayService } from '../services/ReplayService';
import { StorageService } from '../services/StorageService';

const AddReplayModal = ({ isOpen, onClose, teamId, teamName, onReplayAdded, team }) => {
    const [replayUrl, setReplayUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [importMode, setImportMode] = useState('single'); // 'single' or 'bulk'
    const [bulkText, setBulkText] = useState('');
    const [processingStatus, setProcessingStatus] = useState(null); // For bulk import progress

    const handleClose = () => {
        if (!isLoading) {
            setReplayUrl('');
            setNotes('');
            setBulkText('');
            setError('');
            setImportMode('single');
            setProcessingStatus(null);
            onClose();
        }
    };

    const validateUrl = (url) => {
        const parsed = ReplayService.parseReplayUrl(url);
        return parsed !== null;
    };

    const handleSingleImport = async () => {
        if (!replayUrl.trim()) {
            setError('Please enter a replay URL');
            return;
        }

        if (!validateUrl(replayUrl.trim())) {
            setError('Invalid Showdown replay URL format');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Import ReplayProcessor dynamically to avoid bundling issues
            const { default: ReplayProcessor } = await import('../services/ReplayProcessor');

            // Use async processing for single imports too
            const replayEntries = await ReplayProcessor.processReplays(
                [replayUrl.trim()],
                teamId,
                notes.trim(),
                (replayId, status, data) => {
                    if (onReplayAdded && (status === 'created' || status === 'completed')) {
                        onReplayAdded(data);
                    }
                }
            );

            if (replayEntries.length > 0) {
                // Success - close modal
                handleClose();
            } else {
                setError('Failed to create replay entry');
            }

        } catch (err) {
            console.error('Single import error:', err);
            setError(err.message || 'Failed to import replay');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkImport = async () => {
        if (!bulkText.trim()) {
            setError('Please enter replay URLs or text containing URLs');
            return;
        }

        const urls = ReplayService.extractUrlsFromText(bulkText);

        if (urls.length === 0) {
            setError('No valid replay URLs found in the text');
            return;
        }

        const validation = ReplayService.validateMultipleUrls(urls);

        if (validation.invalid.length > 0) {
            setError(`Found ${validation.invalid.length} invalid URLs. Please check your input.`);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Import ReplayProcessor dynamically
            const { default: ReplayProcessor } = await import('../services/ReplayProcessor');

            // Initialize processing status
            const initialStatus = {
                total: validation.valid.length,
                created: 0,
                loading: 0,
                completed: 0,
                error: 0,
                urls: validation.valid.map(v => v.url)
            };
            setProcessingStatus(initialStatus);

            // Start async processing
            const replayEntries = await ReplayProcessor.processReplays(
                validation.valid.map(v => v.url),
                teamId,
                notes.trim(),
                (replayId, status, data) => {
                    // Update processing status
                    setProcessingStatus(prev => {
                        if (!prev) return prev;

                        const newStatus = { ...prev };

                        if (status === 'created') {
                            newStatus.created++;
                            if (onReplayAdded) {
                                onReplayAdded(data);
                            }
                        } else if (status === 'loading') {
                            newStatus.loading++;
                        } else if (status === 'completed') {
                            newStatus.loading = Math.max(0, newStatus.loading - 1);
                            newStatus.completed++;
                            if (onReplayAdded) {
                                onReplayAdded(data);
                            }
                        } else if (status === 'error') {
                            if (data.url) {
                                // Error during creation
                                newStatus.error++;
                            } else {
                                // Error during processing
                                newStatus.loading = Math.max(0, newStatus.loading - 1);
                                newStatus.error++;
                            }
                        }

                        return newStatus;
                    });
                }
            );

            // Show success message
            setError(`Successfully added ${replayEntries.length} replays. Content is being loaded in the background.`);

            // Auto-close after a delay if all replays were created successfully
            if (replayEntries.length === validation.valid.length) {
                setTimeout(() => {
                    if (processingStatus && processingStatus.created === validation.valid.length) {
                        handleClose();
                    }
                }, 2000);
            }

        } catch (err) {
            setError(`Bulk import failed: ${err.message}`);
            setProcessingStatus(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = () => {
        if (importMode === 'single') {
            handleSingleImport();
        } else {
            handleBulkImport();
        }
    };

    const clearError = () => {
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-100">
                            Add Replay to {teamName}
                        </h2>
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-gray-200 text-2xl leading-none disabled:opacity-50"
                        >
                            ×
                        </button>
                    </div>

                    {/* Import Mode Toggle */}
                    <div className="mb-6">
                        <div className="flex rounded-lg bg-slate-700 p-1">
                            <button
                                onClick={() => setImportMode('single')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                    importMode === 'single'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:text-white'
                                }`}
                            >
                                Single Replay
                            </button>
                            <button
                                onClick={() => setImportMode('bulk')}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                                    importMode === 'bulk'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:text-white'
                                }`}
                            >
                                Bulk Import
                            </button>
                        </div>
                    </div>

                    {/* Warning for missing Showdown usernames */}
                    {team && (!team.showdownUsernames || team.showdownUsernames.length === 0) && (
                        <div className="mb-4 p-3 bg-amber-900/50 border border-amber-700 rounded-md">
                            <div className="flex items-center gap-2">
                                <span className="text-amber-400">⚠️</span>
                                <div>
                                    <p className="text-amber-200 text-sm font-medium">Win/Loss detection may be inaccurate</p>
                                    <p className="text-amber-300 text-xs">
                                        No Showdown usernames are configured for this team. Replays will be imported but win/loss detection may not work correctly.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {importMode === 'single' ? (
                        <>
                            {/* Single Replay URL Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Replay URL
                                </label>
                                <input
                                    type="url"
                                    value={replayUrl}
                                    onChange={(e) => {
                                        setReplayUrl(e.target.value);
                                        if (error) clearError();
                                    }}
                                    placeholder="https://replay.pokemonshowdown.com/..."
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Paste a Pokemon Showdown replay URL
                                </p>
                            </div>

                            {/* Notes Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes about this battle..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    disabled={isLoading}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Bulk Import Text Area */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Replay URLs or Text
                                </label>
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => {
                                        setBulkText(e.target.value);
                                        if (error) clearError();
                                    }}
                                    placeholder="Paste multiple replay URLs or text containing URLs..."
                                    rows={8}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Paste replay URLs (one per line) or any text containing URLs. They will be automatically extracted.
                                </p>
                            </div>

                            {/* Shared Notes for Bulk Import */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Shared Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notes to add to all imported replays..."
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isLoading}
                                />
                            </div>
                        </>
                    )}

                    {/* Processing Status for Bulk Import */}
                    {processingStatus && (
                        <div className="mb-4 p-4 bg-slate-700/50 border border-slate-600 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-200">Import Progress</span>
                                <span className="text-xs text-gray-400">
                  {processingStatus.completed + processingStatus.error} / {processingStatus.total}
                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${((processingStatus.completed + processingStatus.error) / processingStatus.total) * 100}%`
                                    }}
                                ></div>
                            </div>

                            {/* Status Breakdown */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-300">Added: {processingStatus.created}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-gray-300">Loading: {processingStatus.loading}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    <span className="text-gray-300">Completed: {processingStatus.completed}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="text-gray-300">Failed: {processingStatus.error}</span>
                                </div>
                            </div>

                            {processingStatus.loading > 0 && (
                                <p className="text-xs text-gray-400 mt-2">
                                    Content is being loaded in the background. You can close this modal and replays will continue processing.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || (importMode === 'single' ? !replayUrl.trim() : !bulkText.trim())}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            )}
                            {isLoading
                                ? (importMode === 'single' ? 'Importing...' : 'Importing Replays...')
                                : (importMode === 'single' ? 'Import Replay' : 'Import All Replays')
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddReplayModal;