// src/pages/TeamPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Edit3,
    Trash2,
    Calendar,
    Trophy,
    TrendingUp,
    Users,
    BarChart3,
    Target,
    Zap
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import AddReplayModal from '../components/AddReplayModal';
import TeamService from '../services/TeamService';
import ReplayService from '../services/ReplayService';

const TeamPage = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [replays, setReplays] = useState([]);
    const [teamStats, setTeamStats] = useState({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0
    });
    const [activeTab, setActiveTab] = useState('game-by-game');
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddReplayModal, setShowAddReplayModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadTeamData();
    }, [teamId]);

    const handleDeleteReplay = async (replayId) => {
        try {
            await ReplayService.delete(replayId);
            await loadTeamData(); // Refresh data
        } catch (error) {
            console.error('Error deleting replay:', error);
            throw error;
        }
    };


    const loadTeamData = async () => {
        try {
            setLoading(true);

            // Load team
            const teamData = await TeamService.getById(teamId);
            if (!teamData) {
                navigate('/');
                return;
            }
            setTeam(teamData);

            // Load replays
            const replaysData = await ReplayService.getByTeamId(teamId);
            setReplays(replaysData);

            // Calculate stats
            const wins = replaysData.filter(r => r.result === 'win').length;
            const losses = replaysData.filter(r => r.result === 'loss').length;

            setTeamStats({
                gamesPlayed: replaysData.length,
                wins,
                losses,
                winRate: replaysData.length > 0 ? Math.round((wins / replaysData.length) * 100) : 0
            });

        } catch (error) {
            console.error('Error loading team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTeam = async () => {
        try {
            setDeleting(true);

            // Delete all replays for this team
            await ReplayService.deleteByTeamId(teamId);

            // Delete the team
            await TeamService.delete(teamId);

            // Navigate back to home
            navigate('/');
        } catch (error) {
            console.error('Error deleting team:', error);
            setDeleting(false);
        }
    };

    const handleAddReplay = async (replayUrl, notes) => {
        try {
            await ReplayService.createFromUrl(teamId, replayUrl, notes);
            await loadTeamData(); // Refresh data
            setShowAddReplayModal(false);
        } catch (error) {
            console.error('Error adding replay:', error);
            throw error;
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks < 4) return `${diffInWeeks}w ago`;

        const diffInMonths = Math.floor(diffInDays / 30);
        return `${diffInMonths}mo ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-100 mb-4">Team not found</h2>
                        <Link to="/" className="text-emerald-400 hover:text-emerald-300">
                            Return to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'game-by-game', label: 'Game by Game', icon: Calendar },
        { id: 'match-by-match', label: 'Match by Match', icon: Users },
        { id: 'usage-stats', label: 'Usage Stats', icon: BarChart3 },
        { id: 'matchup-stats', label: 'Matchup Stats', icon: Target },
        { id: 'move-usage', label: 'Move Usage', icon: Zap }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                        <Link
                            to="/"
                            className="mr-4 p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-100">{team.name}</h1>
                            <p className="text-gray-400">{team.format}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAddReplayModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Replay
                        </button>
                        <button
                            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Edit3 className="h-4 w-4" />
                            Edit Team
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </button>
                    </div>
                </div>

                {/* Team Info Card */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Pokemon Display */}
                        <div className="lg:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-100 mb-3">Team</h3>
                            <div className="flex gap-2">
                                {['🔥', '💧', '⚡', '🌿', '🧊', '👻'].map((emoji, index) => (
                                    <div key={index} className="bg-slate-700 rounded-lg p-3">
                                        <span className="text-3xl">{emoji}</span>
                                    </div>
                                ))}
                            </div>
                            {team.description && (
                                <p className="text-gray-300 mt-3">{team.description}</p>
                            )}
                        </div>

                        {/* Stats */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-3">Performance</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Games:</span>
                                    <span className="text-gray-100">{teamStats.gamesPlayed}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Wins:</span>
                                    <span className="text-green-400">{teamStats.wins}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Losses:</span>
                                    <span className="text-red-400">{teamStats.losses}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Win Rate:</span>
                                    <span className="text-emerald-400 font-semibold">{teamStats.winRate}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Meta */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-100 mb-3">Details</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-400 text-sm">Created:</span>
                                    <p className="text-gray-100">{formatTimeAgo(team.createdAt)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-sm">Last Updated:</span>
                                    <p className="text-gray-100">{formatTimeAgo(team.updatedAt)}</p>
                                </div>
                                {team.showdownUsernames && team.showdownUsernames.length > 0 && (
                                    <div>
                                        <span className="text-gray-400 text-sm">Showdown Users:</span>
                                        <p className="text-gray-100">{team.showdownUsernames.join(', ')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    {team.tags && team.tags.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-100 mb-3">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {team.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="bg-slate-700 text-gray-300 px-3 py-1 rounded-full text-sm"
                                    >
                    {tag}
                  </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg mb-8">
                    <div className="flex overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'border-emerald-400 text-emerald-400'
                                            : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                    {activeTab === 'game-by-game' && (
                        <GameByGameTab
                            replays={replays}
                            formatTimeAgo={formatTimeAgo}
                            onDeleteReplay={handleDeleteReplay}
                        />
                    )}
                    {activeTab === 'match-by-match' && (
                        <ComingSoonTab title="Match by Match Analysis" />
                    )}
                    {activeTab === 'usage-stats' && (
                        <ComingSoonTab title="Usage Statistics" />
                    )}
                    {activeTab === 'matchup-stats' && (
                        <ComingSoonTab title="Matchup Analysis" />
                    )}
                    {activeTab === 'move-usage' && (
                        <ComingSoonTab title="Move Usage Analysis" />
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <ConfirmationModal
                        title="Delete Team"
                        message={
                            <div>
                                <p className="mb-4">
                                    Are you sure you want to delete <strong>{team.name}</strong>?
                                </p>
                                <div className="bg-slate-700 rounded-lg p-4 text-sm">
                                    <p className="text-gray-300 mb-2">This will permanently delete:</p>
                                    <ul className="text-gray-400 space-y-1">
                                        <li>• The team and all its data</li>
                                        <li>• {teamStats.gamesPlayed} associated replays</li>
                                        <li>• All analysis and statistics</li>
                                    </ul>
                                </div>
                                <p className="mt-4 text-red-400 font-medium">
                                    This action cannot be undone.
                                </p>
                            </div>
                        }
                        onConfirm={handleDeleteTeam}
                        onCancel={() => setShowDeleteModal(false)}
                        loading={deleting}
                        confirmText="Delete Team"
                        confirmButtonClass="bg-red-600 hover:bg-red-700"
                    />
                )}

                {/* Add Replay Modal */}
                {showAddReplayModal && (
                    <AddReplayModal
                        onClose={() => setShowAddReplayModal(false)}
                        onAddReplay={handleAddReplay}
                    />
                )}
            </div>
        </div>
    );
};

// Game by Game Tab Component
const GameByGameTab = ({ replays, formatTimeAgo, onDeleteReplay }) => {
    const [deletingReplayId, setDeletingReplayId] = useState(null);

    const handleDeleteReplay = async (replayId) => {
        try {
            setDeletingReplayId(replayId);
            await onDeleteReplay(replayId);
        } catch (error) {
            console.error('Error deleting replay:', error);
            // You could add a toast notification here
        } finally {
            setDeletingReplayId(null);
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
                <h3 className="text-xl font-semibold text-gray-100">Game History</h3>
                <p className="text-gray-400">{replays.length} games</p>
            </div>

            <div className="space-y-4">
                {replays.map((replay) => (
                    <div
                        key={replay.id}
                        className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                                        replay.result === 'win'
                                            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                                            : replay.result === 'loss'
                                                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                                                : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                                    }`}>
                                        {replay.result ? replay.result.toUpperCase() : 'UNKNOWN'}
                                    </span>
                                    {replay.opponent && (
                                        <span className="text-gray-300">vs {replay.opponent}</span>
                                    )}
                                </div>

                                {replay.notes && (
                                    <p className="text-gray-400 text-sm mb-2">{replay.notes}</p>
                                )}

                                <a
                                    href={replay.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:text-emerald-300 text-sm"
                                >
                                    View Replay →
                                </a>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="text-right text-sm text-gray-400">
                                    {formatTimeAgo(replay.createdAt)}
                                </div>

                                <button
                                    onClick={() => handleDeleteReplay(replay.id)}
                                    disabled={deletingReplayId === replay.id}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete replay"
                                >
                                    {deletingReplayId === replay.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Coming Soon Tab Component
const ComingSoonTab = ({ title }) => (
    <div className="text-center py-12">
        <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">{title}</h3>
        <p className="text-gray-400">This feature is coming soon!</p>
    </div>
);

export default TeamPage;