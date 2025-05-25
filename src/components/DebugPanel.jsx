// src/components/DebugPanel.jsx - Add this for testing during development
import React, { useState } from 'react';
import { ReplayService } from '../services/ReplayService';
import { StorageService } from '../services/StorageService';

const DebugPanel = ({ isVisible, onToggle }) => {
    const [testUrl, setTestUrl] = useState('https://replay.pokemonshowdown.com/gen9vgc2025regi-2348427947-3phjt0i9miwbtlnwom948cv8w7dt5f8pw');
    const [results, setResults] = useState('');
    const [loading, setLoading] = useState(false);

    const log = (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n\n`;
        setResults(prev => logEntry + prev);
    };

    const clearResults = () => setResults('');

    const testUrlParsing = () => {
        log('Testing URL parsing...');
        const parsed = ReplayService.parseReplayUrl(testUrl);
        log('Parse result:', parsed);
    };

    const testUrlValidation = () => {
        log('Testing URL validation...');
        const testUrls = [
            testUrl,
            'invalid-url',
            'https://example.com/not-showdown',
            'https://replay.pokemonshowdown.com/gen9vgc2025regi-1234567890-abcdefg'
        ];

        const validation = ReplayService.validateMultipleUrls(testUrls);
        log('Validation results:', validation);
    };

    const testUrlExtraction = () => {
        log('Testing URL extraction...');
        const sampleText = `Here are my battles:
${testUrl}
https://replay.pokemonshowdown.com/gen9vgc2025regi-1234567890-abcdefg
Some other text here`;

        const extracted = ReplayService.extractUrlsFromText(sampleText);
        log('Extracted URLs:', extracted);
    };

    const testFetchLog = async () => {
        if (loading) return;

        setLoading(true);
        log('Testing log fetch...');

        try {
            const logData = await ReplayService.fetchReplayLog(testUrl);
            log('Log fetch successful. Length:', logData.length);
            log('First 300 characters:', logData.substring(0, 300) + '...');

            const parsed = ReplayService.parseLogBasicInfo(logData);
            log('Parsed basic info:', parsed);
        } catch (error) {
            log('Fetch failed:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const testFullImport = async () => {
        if (loading) return;

        setLoading(true);
        log('Testing full import...');

        try {
            // Get first available team
            const teams = await StorageService.getTeams();
            const teamId = Object.keys(teams)[0];

            if (!teamId) {
                log('Error: No teams found. Create a team first!');
                setLoading(false);
                return;
            }

            log(`Using team ID: ${teamId}`);

            const replayData = await ReplayService.importReplay(testUrl, teamId, 'Debug panel test');
            log('Import successful:', {
                id: replayData.id,
                battleId: replayData.battleId,
                format: replayData.format,
                parsedData: replayData.parsedData
            });

            await StorageService.addReplay(replayData);
            log('Replay saved to storage successfully!');

        } catch (error) {
            log('Full import failed:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const testStorageOperations = async () => {
        log('Testing storage operations...');

        try {
            const teams = await StorageService.getTeams();
            log('Teams in storage:', Object.keys(teams).length);

            const replays = await StorageService.getReplays();
            log('Replays in storage:', Object.keys(replays).length);

            const stats = await StorageService.getStats();
            log('Overall stats:', stats);

            if (Object.keys(teams).length > 0) {
                const firstTeamId = Object.keys(teams)[0];
                const teamStats = await StorageService.getTeamStats(firstTeamId);
                log(`Stats for team ${firstTeamId}:`, teamStats);
            }
        } catch (error) {
            log('Storage test failed:', error.message);
        }
    };

    if (!isVisible) {
        return (
            <button
                onClick={onToggle}
                className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full text-xs z-50"
                title="Open Debug Panel"
            >
                🐛
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-100">Debug Panel</h2>
                    <button
                        onClick={onToggle}
                        className="text-gray-400 hover:text-gray-200 text-2xl"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Test Replay URL
                        </label>
                        <input
                            type="text"
                            value={testUrl}
                            onChange={(e) => setTestUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-gray-100 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <button
                            onClick={testUrlParsing}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                            Test URL Parse
                        </button>
                        <button
                            onClick={testUrlValidation}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        >
                            Test Validation
                        </button>
                        <button
                            onClick={testUrlExtraction}
                            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
                        >
                            Test Extraction
                        </button>
                        <button
                            onClick={testStorageOperations}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                        >
                            Test Storage
                        </button>
                        <button
                            onClick={testFetchLog}
                            disabled={loading}
                            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm disabled:opacity-50"
                        >
                            {loading ? 'Fetching...' : 'Fetch Log'}
                        </button>
                        <button
                            onClick={testFullImport}
                            disabled={loading}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                        >
                            {loading ? 'Importing...' : 'Full Import'}
                        </button>
                        <button
                            onClick={clearResults}
                            className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm"
                        >
                            Clear Results
                        </button>
                    </div>

                    <div className="bg-slate-900 rounded p-4 h-96 overflow-y-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {results || 'Click a test button to see results...'}
            </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebugPanel;