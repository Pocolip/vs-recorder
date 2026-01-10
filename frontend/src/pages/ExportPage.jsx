// src/pages/ExportPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Database, Users, Calendar, CheckSquare, Square } from 'lucide-react';
import { Footer } from '../components';
import TeamService from '../services/TeamService';
import ReplayService from '../services/ReplayService';

const ExportPage = () => {
    const [teams, setTeams] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState(new Set());
    const [includeReplays, setIncludeReplays] = useState(true);
    const [stats, setStats] = useState({
        totalTeams: 0,
        totalReplays: 0
    });
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [teamsList, replays] = await Promise.all([
                TeamService.getList(),
                ReplayService.getList()
            ]);

            setTeams(teamsList);
            setStats({
                totalTeams: teamsList.length,
                totalReplays: replays.length
            });

            // Select all teams by default
            setSelectedTeams(new Set(teamsList.map(team => team.id)));
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTeamSelection = (teamId) => {
        setSelectedTeams(prev => {
            const newSet = new Set(prev);
            if (newSet.has(teamId)) {
                newSet.delete(teamId);
            } else {
                newSet.add(teamId);
            }
            return newSet;
        });
    };

    const toggleAllTeams = () => {
        if (selectedTeams.size === teams.length) {
            setSelectedTeams(new Set());
        } else {
            setSelectedTeams(new Set(teams.map(team => team.id)));
        }
    };

    const handleExport = async () => {
        if (selectedTeams.size === 0) {
            alert('Please select at least one team to export.');
            return;
        }

        setExporting(true);
        try {
            const exportData = {
                metadata: {
                    exportedAt: new Date().toISOString(),
                    version: '1.0.0',
                    source: 'VS Recorder',
                    selectedTeamsCount: selectedTeams.size,
                    includeReplays: includeReplays
                },
                teams: []
            };

            // Export selected teams with nested replays
            if (selectedTeams.size > 0) {
                const selectedTeamsList = teams.filter(team => selectedTeams.has(team.id));

                // Get all replays upfront if needed
                let allReplays = [];
                if (includeReplays) {
                    allReplays = await ReplayService.getList();
                }

                exportData.teams = selectedTeamsList.map(team => {
                    const teamExport = {
                        id: team.id,
                        name: team.name,
                        description: team.description,
                        pokepaste: team.pokepaste,
                        regulation: team.regulation,
                        showdownUsernames: team.showdownUsernames,
                        createdAt: team.createdAt,
                        updatedAt: team.updatedAt
                    };

                    // Add replays nested within the team if requested
                    if (includeReplays) {
                        const teamReplays = allReplays.filter(replay => replay.teamId === team.id);
                        teamExport.replays = teamReplays.map(replay => ({
                            id: replay.id,
                            url: replay.url,
                            notes: replay.notes,
                            result: replay.result, // win/loss
                            opponent: replay.opponent,
                            createdAt: replay.createdAt
                        }));
                    }

                    return teamExport;
                });
            }

            // Create and download the file
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `vs-recorder-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            // Show success message
            const totalReplays = exportData.teams.reduce((sum, team) =>
                sum + (team.replays ? team.replays.length : 0), 0
            );

            alert(`Export completed successfully!\n\nExported:\n- ${selectedTeams.size} teams\n- ${totalReplays} replays`);

        } catch (error) {
            console.error('Error during export:', error);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading export data...</p>
                </div>
            </div>
        );
    }

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
                                Export Data
                            </h1>
                            <p className="text-gray-400">Export your teams and replays as JSON</p>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Data Overview
                        </h2>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-center gap-3">
                                <Users className="h-8 w-8 text-emerald-400" />
                                <div>
                                    <p className="text-2xl font-bold text-gray-100">
                                        {stats.totalTeams}
                                    </p>
                                    <p className="text-gray-400 text-sm">Teams</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Calendar className="h-8 w-8 text-blue-400" />
                                <div>
                                    <p className="text-2xl font-bold text-gray-100">
                                        {stats.totalReplays}
                                    </p>
                                    <p className="text-gray-400 text-sm">Replays</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mb-8">
                        {/* Team Selection */}
                        <div className="xl:col-span-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Select Teams to Export
                                </h2>
                                <button
                                    onClick={toggleAllTeams}
                                    className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-1 transition-colors"
                                >
                                    {selectedTeams.size === teams.length ? (
                                        <>
                                            <CheckSquare className="h-4 w-4" />
                                            Deselect All
                                        </>
                                    ) : (
                                        <>
                                            <Square className="h-4 w-4" />
                                            Select All
                                        </>
                                    )}
                                </button>
                            </div>

                            {teams.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                                    <p className="text-gray-400">No teams found to export</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {teams.map(team => (
                                        <label
                                            key={team.id}
                                            className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/30 transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTeams.has(team.id)}
                                                onChange={() => toggleTeamSelection(team.id)}
                                                className="w-4 h-4 text-emerald-500 rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-200 font-medium truncate">{team.name}</p>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <p className="text-gray-400 text-sm">{team.regulation || 'VGC 2025 Regulation F'}</p>
                                                    {/*{team.tags && team.tags.length > 0 && (*/}
                                                    {/*    <div className="flex gap-1">*/}
                                                    {/*        {team.tags.slice(0, 2).map(tag => (*/}
                                                    {/*            <span key={tag} className="px-2 py-0.5 bg-slate-700 text-gray-300 text-xs rounded">*/}
                                                    {/*                {tag}*/}
                                                    {/*            </span>*/}
                                                    {/*        ))}*/}
                                                    {/*        {team.tags.length > 2 && (*/}
                                                    {/*            <span className="text-gray-500 text-xs">+{team.tags.length - 2}</span>*/}
                                                    {/*        )}*/}
                                                    {/*    </div>*/}
                                                    {/*)}*/}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-600">
                                <p className="text-sm text-gray-400">
                                    {selectedTeams.size} of {teams.length} teams selected
                                </p>
                            </div>
                        </div>

                        {/* Export Options */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Options
                            </h2>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeReplays}
                                        onChange={(e) => setIncludeReplays(e.target.checked)}
                                        className="w-4 h-4 text-emerald-500 rounded"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">Include Replays</p>
                                        <p className="text-gray-400 text-sm">Export replay URLs and match data</p>
                                    </div>
                                </label>

                                <div className="pt-4 border-t border-slate-600">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-emerald-400" />
                                        <p className="text-gray-200 font-medium">Format: JSON</p>
                                    </div>
                                    <p className="text-gray-400 text-sm">Lightweight backup with URLs only</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Export Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleExport}
                            disabled={exporting || selectedTeams.size === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            {exporting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="h-5 w-5" />
                                    Export Data
                                </>
                            )}
                        </button>
                    </div>

                    {selectedTeams.size === 0 && (
                        <p className="text-center text-gray-400 text-sm mt-3">
                            Select at least one team to enable export
                        </p>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ExportPage;