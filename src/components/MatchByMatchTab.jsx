// src/components/MatchByMatchTab.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Filter, Search, Trophy, Calendar } from 'lucide-react';
import BestOf3Card from './BestOf3Card';
import MatchService from '../services/MatchService';

const MatchByMatchTab = ({ teamId }) => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);

    // Filters
    const [filterResult, setFilterResult] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadMatches();
    }, [teamId]);

    const loadMatches = async () => {
        try {
            setLoading(true);
            setError(null);

            // Initialize match data from replays if needed
            await MatchService.initializeFromReplays(teamId);

            // Load enhanced matches and stats
            const [matchesData, statsData] = await Promise.all([
                MatchService.getEnhancedMatches(teamId),
                MatchService.getMatchStats(teamId)
            ]);

            setMatches(matchesData);
            setStats(statsData);
        } catch (err) {
            console.error('Error loading matches:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            await loadMatches();
        } catch (err) {
            console.error('Error refreshing matches:', err);
        } finally {
            setRefreshing(false);
        }
    };

    const handleUpdateMatchNotes = async (matchId, notes) => {
        try {
            await MatchService.updateNotes(matchId, notes);

            // Update local state
            setMatches(prev => prev.map(match =>
                match.matchId === matchId
                    ? { ...match, notes, hasStoredData: true, lastNotesUpdate: new Date().toISOString() }
                    : match
            ));
        } catch (error) {
            console.error('Error updating match notes:', error);
            throw error;
        }
    };

    const handleUpdateMatchTags = async (matchId, tags) => {
        try {
            await MatchService.updateTags(matchId, tags);

            // Update local state
            setMatches(prev => prev.map(match =>
                match.matchId === matchId
                    ? { ...match, tags, hasStoredData: true, lastNotesUpdate: new Date().toISOString() }
                    : match
            ));
        } catch (error) {
            console.error('Error updating match tags:', error);
            throw error;
        }
    };

    // Apply filters and search
    const filteredMatches = matches.filter(match => {
        // Result filter
        if (filterResult !== 'all' && match.matchResult !== filterResult) {
            return false;
        }

        // Status filter
        if (filterStatus === 'complete' && !match.isComplete) {
            return false;
        }
        if (filterStatus === 'incomplete' && match.isComplete) {
            return false;
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const searchableText = [
                match.opponent || '',
                match.notes || '',
                ...(match.tags || [])
            ].join(' ').toLowerCase();

            if (!searchableText.includes(query)) {
                return false;
            }
        }

        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-400 mb-4">Error loading matches: {error}</div>
                <button
                    onClick={loadMatches}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header with stats and controls */}
            <div className="flex flex-col gap-4 mb-6">
                {/* Stats row */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-gray-100">{stats.totalMatches}</p>
                            <p className="text-gray-400 text-sm">Total Matches</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-400">{stats.wins}</p>
                            <p className="text-gray-400 text-sm">Wins</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-red-400">{stats.losses}</p>
                            <p className="text-gray-400 text-sm">Losses</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-emerald-400">{stats.winRate}%</p>
                            <p className="text-gray-400 text-sm">Win Rate</p>
                        </div>
                    </div>
                )}

                {/* Controls row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-semibold text-gray-100">Best-of-3 Matches</h3>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white rounded text-sm transition-colors disabled:opacity-50"
                            title="Refresh matches from replays"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>

                    {/* Search and filters */}
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search matches..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-400 w-48"
                            />
                        </div>

                        {/* Filter toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                showFilters
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                            }`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                    </div>
                </div>

                {/* Filter controls */}
                {showFilters && (
                    <div className="flex flex-wrap gap-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Result:</label>
                            <select
                                value={filterResult}
                                onChange={(e) => setFilterResult(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-gray-100 text-sm focus:outline-none focus:border-emerald-400"
                            >
                                <option value="all">All Results</option>
                                <option value="win">Wins Only</option>
                                <option value="loss">Losses Only</option>
                                <option value="incomplete">Incomplete</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-300">Status:</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-gray-100 text-sm focus:outline-none focus:border-emerald-400"
                            >
                                <option value="all">All Matches</option>
                                <option value="complete">Complete Only</option>
                                <option value="incomplete">Incomplete Only</option>
                            </select>
                        </div>

                        {(filterResult !== 'all' || filterStatus !== 'all' || searchQuery) && (
                            <button
                                onClick={() => {
                                    setFilterResult('all');
                                    setFilterStatus('all');
                                    setSearchQuery('');
                                }}
                                className="text-emerald-400 hover:text-emerald-300 text-sm"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}

                {/* Results count */}
                <div className="text-sm text-gray-400">
                    Showing {filteredMatches.length} of {matches.length} matches
                </div>
            </div>

            {/* Matches list */}
            {filteredMatches.length === 0 ? (
                <div className="text-center py-12">
                    {matches.length === 0 ? (
                        <>
                            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Best-of-3 matches found</h3>
                            <p className="text-gray-400 mb-4">
                                Best-of-3 matches will appear here once you add Bo3 replays to your team.
                            </p>
                            <p className="text-gray-500 text-sm">
                                Add replays with Bo3 format to see match analysis and strategic notes.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="text-gray-400 mb-2">No matches match the current filters</div>
                            <button
                                onClick={() => {
                                    setFilterResult('all');
                                    setFilterStatus('all');
                                    setSearchQuery('');
                                }}
                                className="text-emerald-400 hover:text-emerald-300 text-sm"
                            >
                                Clear all filters
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredMatches.map((match) => (
                        <BestOf3Card
                            key={match.matchId}
                            match={match}
                            onUpdateNotes={handleUpdateMatchNotes}
                            onUpdateTags={handleUpdateMatchTags}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MatchByMatchTab;