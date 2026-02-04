// src/components/MatchByMatchTab.jsx
import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import BestOf3Card from './BestOf3Card';
import MatchService from '../services/MatchService';

const MatchByMatchTab = ({ teamId }) => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);

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

    const handleUpdateMatchNotes = async (matchId, notes) => {
        try {
            await MatchService.updateNotes(matchId, notes);

            // Update local state
            setMatches(prev => prev.map(match =>
                match.id === matchId
                    ? { ...match, notes }
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
                match.id === matchId
                    ? { ...match, tags }
                    : match
            ));
        } catch (error) {
            console.error('Error updating match tags:', error);
            throw error;
        }
    };

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
            {/* Header with stats */}
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

                {/* Title */}
                <h3 className="text-xl font-semibold text-gray-100">Best-of-3 Matches</h3>
            </div>

            {/* Matches list */}
            {matches.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Best-of-3 matches found</h3>
                    <p className="text-gray-400 mb-4">
                        Best-of-3 matches will appear here once you add Bo3 replays to your team.
                    </p>
                    <p className="text-gray-500 text-sm">
                        Add replays with Bo3 format to see match analysis and strategic notes.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {matches.map((match) => (
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