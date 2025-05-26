// src/pages/ExportPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Database, Users, Calendar } from 'lucide-react';
import { Footer } from '../components';
import TeamService from '../services/TeamService';
import ReplayService from '../services/ReplayService';

const ExportPage = () => {
    const [exportOptions, setExportOptions] = useState({
        includeTeams: true,
        includeReplays: true,
        includeSettings: true,
        format: 'json'
    });
    const [stats, setStats] = useState({
        totalTeams: 0,
        totalReplays: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const teams = await TeamService.getList();
            const replays = await ReplayService.getList();

            setStats({
                totalTeams: teams.length,
                totalReplays: replays.length
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // TODO: Implement actual export functionality
        alert(`Export functionality will be implemented soon!\n\nOptions:\n- Teams: ${exportOptions.includeTeams}\n- Replays: ${exportOptions.includeReplays}\n- Settings: ${exportOptions.includeSettings}\n- Format: ${exportOptions.format.toUpperCase()}`);
    };

    const updateOption = (key, value) => {
        setExportOptions(prev => ({
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
                                Export Data
                            </h1>
                            <p className="text-gray-400">Create a backup of your teams and replays</p>
                        </div>
                    </div>

                    {/* Current Data Overview */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Your Data
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-3">
                                <Users className="h-8 w-8 text-emerald-400" />
                                <div>
                                    <p className="text-2xl font-bold text-gray-100">
                                        {loading ? '...' : stats.totalTeams}
                                    </p>
                                    <p className="text-gray-400 text-sm">Teams</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Calendar className="h-8 w-8 text-blue-400" />
                                <div>
                                    <p className="text-2xl font-bold text-gray-100">
                                        {loading ? '...' : stats.totalReplays}
                                    </p>
                                    <p className="text-gray-400 text-sm">Replays</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Export Options */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                What to Export
                            </h2>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeTeams}
                                        onChange={(e) => updateOption('includeTeams', e.target.checked)}
                                        className="w-4 h-4 text-emerald-500 rounded"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">Teams</p>
                                        <p className="text-gray-400 text-sm">All team data, Pokemon, and settings</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeReplays}
                                        onChange={(e) => updateOption('includeReplays', e.target.checked)}
                                        className="w-4 h-4 text-emerald-500 rounded"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">Replays</p>
                                        <p className="text-gray-400 text-sm">Battle replays and analysis data</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeSettings}
                                        onChange={(e) => updateOption('includeSettings', e.target.checked)}
                                        className="w-4 h-4 text-emerald-500 rounded"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">Settings</p>
                                        <p className="text-gray-400 text-sm">App preferences and configuration</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Export Format */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                <Download className="h-5 w-5" />
                                Export Format
                            </h2>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/30 transition-colors">
                                    <input
                                        type="radio"
                                        name="format"
                                        value="json"
                                        checked={exportOptions.format === 'json'}
                                        onChange={(e) => updateOption('format', e.target.value)}
                                        className="text-emerald-500"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">JSON Backup</p>
                                        <p className="text-gray-400 text-sm">Complete backup for VS Recorder</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/30 transition-colors opacity-50">
                                    <input
                                        type="radio"
                                        name="format"
                                        value="csv"
                                        disabled
                                        className="text-emerald-500"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">CSV Export</p>
                                        <p className="text-gray-400 text-sm">Spreadsheet format (Coming Soon)</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/30 transition-colors opacity-50">
                                    <input
                                        type="radio"
                                        name="format"
                                        value="pdf"
                                        disabled
                                        className="text-emerald-500"
                                    />
                                    <div>
                                        <p className="text-gray-200 font-medium">PDF Report</p>
                                        <p className="text-gray-400 text-sm">Formatted analytics report (Coming Soon)</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Export Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={handleExport}
                            disabled={!exportOptions.includeTeams && !exportOptions.includeReplays && !exportOptions.includeSettings}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Download className="h-5 w-5" />
                            Export Data
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ExportPage;