import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StorageService from '../services/StorageService';
import ConfirmationModal from '../components/ConfirmationModal';

const TeamAnalysisPage = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [replays, setReplays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('game-by-game');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadTeamData();
    }, [teamId]);

    const loadTeamData = async () => {
        try {
            setLoading(true);

            // Load team data
            const teamData = await StorageService.getTeam(teamId);
            setTeam(teamData);

            // Load replays for this team
            const replaysData = await StorageService.getReplays(teamId);
            setReplays(replaysData);

            // Update last used timestamp
            if (teamData) {
                await StorageService.updateTeam(teamId, {
                    lastUsed: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('Error loading team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'game-by-game', label: 'Game by Game', icon: '📊' },
        { id: 'match-by-match', label: 'Match by Match', icon: '🏆' },
        { id: 'usage-stats', label: 'Usage Stats', icon: '📈' },
        { id: 'matchup-analysis', label: 'Matchup Analysis', icon: '⚔️' },
        { id: 'move-usage', label: 'Move Usage', icon: '🎯' }
    ];

    const handleDeleteTeam = async () => {
        try {
            setIsDeleting(true);
            await StorageService.deleteTeam(teamId);
            // Navigate back to home after deletion
            navigate('/');
        } catch (error) {
            console.error('Error deleting team:', error);
            // You could add a toast notification here
            alert('Failed to delete team. Please try again.');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                        <span className="text-gray-300">Loading team data...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8 text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Team Not Found</h1>
                    <p className="text-gray-300 mb-6">The requested team could not be found.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'game-by-game':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-200">Game History</h3>
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                                Add Replay
                            </button>
                        </div>

                        {replays.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-4">🎮</div>
                                <h4 className="text-lg font-semibold text-gray-200 mb-2">No Replays Yet</h4>
                                <p className="text-gray-400 mb-4">Add some Pokémon Showdown replays to see detailed analysis</p>
                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                                    Import First Replay
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {replays.map((replay, index) => (
                                    <div key={replay.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-400">#{index + 1}</span>
                                                <span className="text-gray-200">vs Opponent</span>
                                                <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">Win</span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                        {StorageService.formatTimeAgo(replay.dateAdded)}
                      </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🚧</div>
                        <h3 className="text-xl font-bold text-gray-200 mb-2">
                            {tabs.find(tab => tab.id === activeTab)?.label} Coming Soon
                        </h3>
                        <p className="text-gray-400">This analysis view is under development</p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
                        >
                            ← Back to Teams
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">{team.format}</span>
                            {team.customTags && team.customTags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded"
                                >
                  {tag}
                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-100 mb-2">{team.name}</h1>
                            <div className="text-2xl mb-4">{team.pokemon}</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-400">{team.winRate}%</div>
                                    <div className="text-gray-400">Win Rate</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-400">{team.gamesPlayed}</div>
                                    <div className="text-gray-400">Games Played</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-400">{team.wins}</div>
                                    <div className="text-gray-400">Wins</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-400">{team.losses}</div>
                                    <div className="text-gray-400">Losses</div>
                                </div>
                            </div>

                            {team.pokepaste && (
                                <div className="mt-4">
                                    <a
                                        href={team.pokepaste}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 transition-colors text-sm flex items-center gap-1"
                                    >
                                        📋 View Pokepaste
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                                Add Replay
                            </button>
                            <button className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors">
                                Edit Team
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                Delete Team
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 mb-6">
                    <div className="flex flex-wrap border-b border-slate-700">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                                    activeTab === tab.id
                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
                    {renderTabContent()}
                </div>

                {/* Team Info Footer */}
                <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
                    <div className="flex flex-wrap justify-between items-center text-sm text-gray-400">
                        <div>
                            Created: {new Date(team.dateCreated).toLocaleDateString()}
                        </div>
                        <div>
                            Last used: {StorageService.formatTimeAgo(team.lastUsed)}
                        </div>
                        <div>
                            Showdown users: {team.showdownUsers?.join(', ') || 'None set'}
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDeleteTeam}
                    title="Delete Team"
                    message={`Are you sure you want to delete "${team?.name}"? This action cannot be undone. All associated replays and statistics will be permanently deleted.`}
                    confirmText="Delete Team"
                    loadingText="Deleting..."
                    isLoading={isDeleting}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                >
                    {/* Team info summary in modal */}
                    <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                        <div className="text-lg mb-2">{team?.pokemon}</div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                                <div className="font-bold text-emerald-400">{team?.winRate}%</div>
                                <div className="text-gray-400">Win Rate</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-blue-400">{team?.gamesPlayed}</div>
                                <div className="text-gray-400">Games</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-purple-400">{replays.length}</div>
                                <div className="text-gray-400">Replays</div>
                            </div>
                        </div>
                    </div>
                </ConfirmationModal>
            </div>
        </div>
    );
};

export default TeamAnalysisPage;