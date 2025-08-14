// src/pages/ImportPage.jsx
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Upload,
    FileText,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Users,
    Calendar,
    Info,
    Eye,
    EyeOff,
    RefreshCw
} from 'lucide-react';
import { Footer } from '../components';
import TeamService from '../services/TeamService';
import ReplayService from '../services/ReplayService';

const ImportPage = () => {
    const [importState, setImportState] = useState('idle'); // idle, preview, processing, success, error
    const [importFile, setImportFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [importResults, setImportResults] = useState(null);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentItem: '' });
    const [importOptions, setImportOptions] = useState({
        overwriteExisting: false,
        skipDuplicates: true,
        preserveIds: false
    });
    const [showPreview, setShowPreview] = useState(false);
    const [refreshingMetrics, setRefreshingMetrics] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            setImportState('error');
            setImportResults({ error: 'Please select a valid JSON file.' });
            return;
        }

        setImportFile(file);
        setImportState('idle');
        setImportResults(null);

        // Read and preview file contents
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                validateAndPreviewData(data);
            } catch (error) {
                setImportState('error');
                setImportResults({ error: 'Invalid JSON file format.' });
            }
        };
        reader.readAsText(file);
    };

    const validateAndPreviewData = (data) => {
        try {
            // Validate export structure
            if (!data.metadata || !data.teams || !Array.isArray(data.teams)) {
                throw new Error('Invalid export file structure. Missing required fields.');
            }

            // Basic validation of teams
            const validTeams = data.teams.filter(team =>
                team.id && team.name && team.pokepaste
            );

            if (validTeams.length === 0) {
                throw new Error('No valid teams found in the export file.');
            }

            // Count replays
            const totalReplays = validTeams.reduce((count, team) =>
                count + (team.replays ? team.replays.length : 0), 0
            );

            setPreviewData({
                metadata: data.metadata,
                teamCount: validTeams.length,
                replayCount: totalReplays,
                teams: validTeams,
                originalTeamCount: data.teams.length,
                validStructure: true
            });

            setImportState('preview');
        } catch (error) {
            setImportState('error');
            setImportResults({ error: error.message });
        }
    };

    const handleImport = async () => {
        if (!previewData || !importFile) return;

        setImportState('processing');

        try {
            const results = {
                teamsCreated: 0,
                teamsSkipped: 0,
                teamsUpdated: 0,
                replaysCreated: 0,
                replaysSkipped: 0,
                errors: []
            };

            // Calculate total items for better progress tracking
            const totalReplays = previewData.teams.reduce((sum, team) =>
                sum + (team.replays ? team.replays.length : 0), 0
            );
            const totalItems = previewData.teams.length + totalReplays;
            let processedItems = 0;

            // Get existing teams to check for duplicates
            const existingTeams = await TeamService.getList();
            const existingTeamsByName = existingTeams.reduce((acc, team) => {
                acc[team.name.toLowerCase()] = team;
                return acc;
            }, {});

            for (const teamData of previewData.teams) {
                try {
                    processedItems++;
                    setImportProgress({
                        current: processedItems,
                        total: totalItems,
                        currentItem: `Processing team: ${teamData.name}`
                    });

                    // Force a render by yielding to the event loop
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const teamName = teamData.name.toLowerCase();
                    const existingTeam = existingTeamsByName[teamName];

                    let team;

                    if (existingTeam && !importOptions.overwriteExisting) {
                        if (importOptions.skipDuplicates) {
                            results.teamsSkipped++;
                            continue;
                        } else {
                            results.errors.push(`Team "${teamData.name}" already exists`);
                            continue;
                        }
                    }

                    if (existingTeam && importOptions.overwriteExisting) {
                        // Update existing team
                        team = await TeamService.update(existingTeam.id, {
                            name: teamData.name,
                            description: teamData.description || '',
                            pokepaste: teamData.pokepaste,
                            format: teamData.format || 'VGC 2025',
                            showdownUsernames: teamData.showdownUsernames || [],
                            tags: teamData.tags || []
                        });
                        results.teamsUpdated++;
                    } else {
                        // Create new team
                        team = await TeamService.create({
                            name: teamData.name,
                            description: teamData.description || '',
                            pokepaste: teamData.pokepaste,
                            format: teamData.format || 'VGC 2025',
                            showdownUsernames: teamData.showdownUsernames || [],
                            tags: teamData.tags || []
                        });
                        results.teamsCreated++;
                    }

                    // Import replays if they exist
                    if (teamData.replays && Array.isArray(teamData.replays)) {
                        for (let i = 0; i < teamData.replays.length; i++) {
                            const replayData = teamData.replays[i];
                            processedItems++;

                            setImportProgress({
                                current: processedItems,
                                total: totalItems,
                                currentItem: `Processing replay ${i + 1}/${teamData.replays.length} for ${teamData.name}`
                            });

                            // Force UI update and small delay to show progress
                            await new Promise(resolve => setTimeout(resolve, 50));

                            try {
                                // Check if replay already exists for this team
                                const existingReplays = await ReplayService.getByTeamId(team.id);
                                const duplicateReplay = existingReplays.find(r => r.url === replayData.url);

                                if (duplicateReplay && importOptions.skipDuplicates) {
                                    results.replaysSkipped++;
                                    continue;
                                }

                                // Use createFromUrl to get full parsing like the AddReplay modal
                                // This will fetch and parse the replay data properly
                                await ReplayService.createFromUrl(team.id, replayData.url, replayData.notes || '');
                                results.replaysCreated++;
                            } catch (replayError) {
                                console.warn(`Failed to parse replay ${replayData.url}:`, replayError);

                                // Fallback: create replay with minimal data if parsing fails
                                try {
                                    await ReplayService.create({
                                        teamId: team.id,
                                        url: replayData.url,
                                        notes: replayData.notes || '',
                                        result: replayData.result || 'unknown',
                                        opponent: replayData.opponent || 'Unknown',
                                        battleData: {
                                            result: replayData.result || 'unknown',
                                            opponent: replayData.opponent || 'Unknown',
                                            imported: true,
                                            importedAt: new Date().toISOString(),
                                            parseError: replayError.message
                                        }
                                    });
                                    results.replaysCreated++;
                                    results.errors.push(`Replay ${replayData.url} imported but couldn't be parsed: ${replayError.message}`);
                                } catch (fallbackError) {
                                    results.errors.push(`Failed to import replay ${replayData.url}: ${fallbackError.message}`);
                                }
                            }
                        }
                    }
                } catch (teamError) {
                    results.errors.push(`Failed to import team "${teamData.name}": ${teamError.message}`);
                }
            }

            setImportResults(results);
            setImportState('success');

            // Trigger metric recalculation after successful import
            if (results.teamsCreated > 0 || results.teamsUpdated > 0 || results.replaysCreated > 0) {
                await refreshMetrics();

                // Also navigate to homepage to refresh the team stats display
                setTimeout(() => {
                    if (results.teamsCreated > 0) {
                        // If new teams were created, go to homepage to see them
                        navigate('/');
                    }
                }, 2000);
            }
        } catch (error) {
            setImportState('error');
            setImportResults({ error: error.message });
        }
    };

    const resetImport = () => {
        setImportState('idle');
        setImportFile(null);
        setPreviewData(null);
        setImportResults(null);
        setImportProgress({ current: 0, total: 0, currentItem: '' });
        setShowPreview(false);
        setRefreshingMetrics(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const refreshMetrics = async () => {
        try {
            setRefreshingMetrics(true);

            console.log('Import completed - preparing metric refresh...');

            // Set a timestamp in storage that hooks can optionally listen for
            try {
                await chrome.storage.local.set({
                    'last_data_import': Date.now()
                });
            } catch (storageError) {
                console.warn('Could not set import timestamp:', storageError);
            }

            // The key insight: hooks refresh automatically when:
            // 1. Component mounts (visiting team pages)
            // 2. Dependencies change (teamId changes)
            // 3. Manual refresh calls (existing refreshStats functions)

            // Since we can't directly call hook refresh functions,
            // we rely on natural navigation triggering refreshes
            console.log('Import processing complete');

        } catch (error) {
            console.error('Error in metric refresh process:', error);
        } finally {
            setRefreshingMetrics(false);
        }
    };

    const updateOption = (key, value) => {
        setImportOptions(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
            <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center mb-8">
                        <Link
                            to="/"
                            className="mr-4 p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                                Import Data
                            </h1>
                            <p className="text-gray-400">Restore your teams and replays from a backup</p>
                        </div>
                    </div>

                    {/* File Upload Area */}
                    {importState === 'idle' && (
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 mb-8 text-center">
                            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-100 mb-2">
                                Select VS Recorder Export File
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Choose a JSON export file created by VS Recorder
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Choose File
                            </button>
                        </div>
                    )}

                    {/* Import Options */}
                    {(importState === 'preview' || importState === 'processing') && (
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
                            <h2 className="text-xl font-semibold text-gray-100 mb-4">Import Options</h2>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={importOptions.overwriteExisting}
                                        onChange={(e) => updateOption('overwriteExisting', e.target.checked)}
                                        disabled={importState === 'processing'}
                                        className="rounded border-gray-600 text-emerald-600"
                                    />
                                    <span className="text-gray-300">Overwrite existing teams with same name</span>
                                </label>

                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={importOptions.skipDuplicates}
                                        onChange={(e) => updateOption('skipDuplicates', e.target.checked)}
                                        disabled={importState === 'processing'}
                                        className="rounded border-gray-600 text-emerald-600"
                                    />
                                    <span className="text-gray-300">Skip duplicate teams and replays</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar - Show During Processing */}
                    {importState === 'processing' && (
                        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-6 mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-lg font-semibold text-emerald-400">Import Progress</span>
                                <span className="text-sm text-emerald-300 font-mono">
                                    {importProgress.current} / {importProgress.total} items
                                </span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-3 mb-3">
                                <div
                                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500 ease-out"
                                    style={{
                                        width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`
                                    }}
                                ></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                                <p className="text-sm text-gray-300 font-medium">{importProgress.currentItem}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                This may take a few minutes as each replay is fetched and parsed from Showdown...
                            </p>
                        </div>
                    )}

                    {/* Preview Data */}
                    {importState === 'preview' && previewData && (
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Import Preview
                                </h2>
                                <button
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="text-gray-400 hover:text-gray-200 flex items-center gap-2"
                                >
                                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    {showPreview ? 'Hide Details' : 'Show Details'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="flex items-center gap-3">
                                    <Users className="h-8 w-8 text-emerald-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-gray-100">{previewData.teamCount}</p>
                                        <p className="text-gray-400 text-sm">Teams to import</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Calendar className="h-8 w-8 text-blue-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-gray-100">{previewData.replayCount}</p>
                                        <p className="text-gray-400 text-sm">Replays to import</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Info className="h-8 w-8 text-yellow-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-gray-100">
                                            {previewData.metadata?.version || 'Unknown'}
                                        </p>
                                        <p className="text-gray-400 text-sm">Export version</p>
                                    </div>
                                </div>
                            </div>

                            {showPreview && (
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-400 mb-4">
                                        Export created: {previewData.metadata?.exportedAt ?
                                        new Date(previewData.metadata.exportedAt).toLocaleString() : 'Unknown'}
                                    </div>

                                    <div className="max-h-60 overflow-y-auto">
                                        <h3 className="text-lg font-medium text-gray-200 mb-2">Teams Preview:</h3>
                                        {previewData.teams.map((team, index) => (
                                            <div key={index} className="border border-slate-600 rounded p-3 mb-2">
                                                <div className="font-medium text-gray-200">{team.name}</div>
                                                <div className="text-sm text-gray-400">
                                                    Format: {team.format || 'VGC 2025'} •
                                                    Replays: {team.replays ? team.replays.length : 0}
                                                </div>
                                                {team.description && (
                                                    <div className="text-sm text-gray-500 mt-1">{team.description}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={handleImport}
                                    disabled={importState === 'processing'}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {importState === 'processing' ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Start Import
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={resetImport}
                                    disabled={importState === 'processing'}
                                    className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success Results */}
                    {importState === 'success' && importResults && (
                        <div className="bg-emerald-900/50 backdrop-blur-sm border border-emerald-700 rounded-lg p-6 mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="h-6 w-6 text-emerald-400" />
                                <h2 className="text-xl font-semibold text-gray-100">Import Completed Successfully</h2>
                                {refreshingMetrics && (
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Refreshing metrics...</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-400">{importResults.teamsCreated}</p>
                                    <p className="text-gray-400 text-sm">Teams Created</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-400">{importResults.teamsUpdated}</p>
                                    <p className="text-gray-400 text-sm">Teams Updated</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-yellow-400">{importResults.replaysCreated}</p>
                                    <p className="text-gray-400 text-sm">Replays Created</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-400">{importResults.teamsSkipped + importResults.replaysSkipped}</p>
                                    <p className="text-gray-400 text-sm">Items Skipped</p>
                                </div>
                            </div>

                            {!refreshingMetrics && (importResults.teamsCreated > 0 || importResults.replaysCreated > 0) && (
                                <div className="bg-blue-900/30 border border-blue-700 rounded p-4 mb-6">
                                    <p className="text-blue-300 text-sm">
                                        <Info className="h-4 w-4 inline mr-2" />
                                        <strong>Next steps:</strong> Navigate to your team pages to see updated analysis tabs with imported replay data.
                                        The metrics will automatically calculate when you visit each team.
                                    </p>
                                </div>
                            )}

                            {importResults.errors && importResults.errors.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-yellow-400 mb-2">
                                        Warnings ({importResults.errors.length})
                                    </h3>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {importResults.errors.map((error, index) => (
                                            <div key={index} className="text-sm text-yellow-300 bg-yellow-900/20 p-2 rounded">
                                                {error}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => navigate('/')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Go to Homepage
                                </button>
                                <button
                                    onClick={resetImport}
                                    className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    Import Another File
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {importState === 'error' && importResults && (
                        <div className="bg-red-900/50 backdrop-blur-sm border border-red-700 rounded-lg p-6 mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <XCircle className="h-6 w-6 text-red-400" />
                                <h2 className="text-xl font-semibold text-gray-100">Import Failed</h2>
                            </div>

                            <div className="bg-red-900/30 border border-red-700 rounded p-4 mb-6">
                                <p className="text-red-300">{importResults.error}</p>
                            </div>

                            <button
                                onClick={resetImport}
                                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Information Panel */}
                    <div className="bg-blue-900/50 backdrop-blur-sm border border-blue-700 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Info className="h-6 w-6 text-blue-400" />
                            <h2 className="text-xl font-semibold text-gray-100">Import Information</h2>
                        </div>

                        <div className="space-y-3 text-gray-300">
                            <p>• Import files must be valid VS Recorder JSON exports</p>
                            <p>• Teams are matched by name (case-insensitive)</p>
                            <p>• Replays are matched by URL to prevent duplicates</p>
                            <p>• Imported replays will need to be re-parsed for full battle data</p>
                            <p>• Use the overwrite option carefully - it will replace existing team data</p>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default ImportPage;