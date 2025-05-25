// src/pages/TeamPage.jsx - Updated with Replay Functionality
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/StorageService';
import ConfirmationModal from '../components/ConfirmationModal';
import AddReplayModal from '../components/AddReplayModal';
import EditTeamModal from '../components/EditTeamModal';

const TeamPage = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [replays, setReplays] = useState({});
    const [teamStats, setTeamStats] = useState(null);
    const [processingStatus, setProcessingStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('gameByGame');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddReplayModal, setShowAddReplayModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);

    useEffect(() => {
        loadTeamData();
    }, [teamId]);

    // Auto-update processing status when there's active processing
    useEffect(() => {
        let interval;

        if (processingStatus && (processingStatus.loading > 0 || processingStatus.pending > 0)) {
            interval = setInterval(() => {
                updateProcessingStatus();
            }, 2000); // Update every 2 seconds
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [processingStatus, teamId]);

    const loadTeamData = async () => {
        try {
            setLoading(true);
            const [teamData, teamReplays, stats] = await Promise.all([
                StorageService.getTeam(teamId),
                StorageService.getReplaysForTeam(teamId),
                StorageService.getTeamStats(teamId)
            ]);

            if (!teamData) {
                navigate('/');
                return;
            }

            setTeam(teamData);
            setReplays(teamReplays);
            setTeamStats(stats);

            // Check processing status
            const { default: ReplayProcessor } = await import('../services/ReplayProcessor');
            const status = await ReplayProcessor.getProcessingStatus(teamId);
            setProcessingStatus(status);

        } catch (error) {
            console.error('Failed to load team:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTeam = async () => {
        try {
            await StorageService.deleteTeam(teamId);
            navigate('/');
        } catch (error) {
            console.error('Failed to delete team:', error);
        }
    };

    const handleReplayAdded = (newReplay) => {
        setReplays(prev => ({
            ...prev,
            [newReplay.id]: newReplay
        }));

        // Update processing status when replay status changes
        updateProcessingStatus();

        // Reload team stats only when replay is completed
        if (newReplay.status === 'completed') {
            loadTeamData();
        }
    };

    const updateProcessingStatus = async () => {
        try {
            const { default: ReplayProcessor } = await import('../services/ReplayProcessor');
            const status = await ReplayProcessor.getProcessingStatus(teamId);
            setProcessingStatus(status);
        } catch (error) {
            console.error('Failed to update processing status:', error);
        }
    };

    const handleTeamUpdated = (updatedTeam) => {
        setTeam(updatedTeam);
        // Optionally reload team data to refresh stats
        loadTeamData();
    };

    const retryReplay = async (replayId) => {
        try {
            const { default: ReplayProcessor } = await import('../services/ReplayProcessor');
            await ReplayProcessor.retryReplay(replayId, (id, status, data) => {
                setReplays(prev => ({
                    ...prev,
                    [id]: data
                }));

                // Update processing status
                updateProcessingStatus();

                // Reload team data to update stats when completed
                if (status === 'completed') {
                    loadTeamData();
                }
            });
        } catch (error) {
            console.error('Failed to retry replay:', error);
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        return date.toLocaleDateString();
    };

    const tabs = [
        { id: 'gameByGame', name: 'Game by Game', icon: '🎯' },
        { id: 'matchByMatch', name: 'Match by Match', icon: '🏆' },
        { id: 'usage', name: 'Usage Stats', icon: '📊' },
        { id: 'matchups', name: 'Matchup Analysis', icon: '⚔️' },
        { id: 'moves', name: 'Move Usage', icon: '💥' }
    ];

    const renderReplayList = () => {
        const replayArray = Object.values(replays).sort((a, b) =>
            new Date(b.dateAdded) - new Date(a.dateAdded)
        );

        if (replayArray.length === 0) {
            return (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎮</div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No replays yet</h3>
                    <p className="text-gray-400 mb-6">Import your first replay to start analyzing your battles</p>
                    <button
                        onClick={() => setShowAddReplayModal(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                        Add First Replay
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {replayArray.map((replay) => {
                    const isWin = replay.parsedData?.winner === replay.parsedData?.players?.[0]?.name;
                    const opponent = replay.parsedData?.players?.[1]?.name || 'Unknown Opponent';

                    return (
                        <div key={replay.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${isWin ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div>
                                        <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-200">
                        vs {opponent}
                      </span>
                                            <span className={`px-2 py-1 text-xs rounded ${
                                                isWin ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                                            }`}>
                        {isWin ? 'WIN' : 'LOSS'}
                      </span>
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {replay.parsedData?.tier || replay.format} • {formatTimeAgo(replay.dateAdded)}
                                        </div>
                                        {replay.notes && (
                                            <div className="text-sm text-gray-300 mt-1">{replay.notes}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {replay.parsedData?.turns || 0} turns
                  </span>
                                    <a
                                        href={replay.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 text-sm"
                                    >
                                        View Replay
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'gameByGame':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-medium text-gray-200">Battle History</h3>
                            <button
                                onClick={() => setShowAddReplayModal(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                                Add Replay
                            </button>
                        </div>
                        {renderReplayList()}
                    </div>
                );
            default:
                return (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4">🚧</div>
                        <h3 className="text-lg font-medium text-gray-300 mb-2">{tabs.find(t => t.id === activeTab)?.name}</h3>
                        <p className="text-gray-400">Coming soon! This feature is currently under development.</p>
                    </div>
                );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-100 mb-4">Team Not Found</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-400 hover:text-gray-200 text-sm flex items-center gap-1"
                        >
                            ← Back to Teams
                        </button>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-100 mb-2">{team.name}</h1>
                                {team.description && (
                                    <p className="text-gray-300 mb-4">{team.description}</p>
                                )}

                                {/* Processing Status Indicator */}
                                {processingStatus && (processingStatus.loading > 0 || processingStatus.pending > 0) && (
                                    <div className="mb-4 p-3 bg-blue-900/50 border border-blue-700 rounded-md">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                                                <div>
                                                    <p className="text-blue-200 text-sm font-medium">
                                                        Processing replays in background
                                                    </p>
                                                    <p className="text-blue-300 text-xs">
                                                        {processingStatus.loading} loading, {processingStatus.pending} queued
                                                        {processingStatus.completed > 0 && ` • ${processingStatus.completed} completed`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={updateProcessingStatus}
                                                className="text-blue-300 hover:text-blue-200 text-xs"
                                                title="Refresh status"
                                            >
                                                🔄
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Warning for missing Showdown usernames */}
                                {(!team.showdownUsernames || team.showdownUsernames.length === 0) && (
                                    <div className="mb-4 p-3 bg-amber-900/50 border border-amber-700 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <span className="text-amber-400">⚠️</span>
                                            <div>
                                                <p className="text-amber-200 text-sm font-medium">No Showdown usernames configured</p>
                                                <p className="text-amber-300 text-xs">
                                                    Add your Showdown usernames to automatically detect wins/losses in imported replays.{' '}
                                                    <button
                                                        onClick={() => setShowEditTeamModal(true)}
                                                        className="underline hover:no-underline"
                                                    >
                                                        Edit team
                                                    </button> to add them.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {team.format && (
                                        <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm">
                      {team.format}
                    </span>
                                    )}
                                    {team.showdownUsernames && team.showdownUsernames.length > 0 && (
                                        <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-sm">
                      👤 {team.showdownUsernames.join(', ')}
                    </span>
                                    )}
                                    {team.tags?.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-slate-700 text-gray-300 rounded-full text-sm">
                      {tag}
                    </span>
                                    ))}
                                </div>

                                {/* Team Pokemon Display - Placeholder */}
                                <div className="flex gap-2 mb-4">
                                    {Array.from({ length: 6 }, (_, i) => (
                                        <div key={i} className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">🔥</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text-right">
                                {teamStats && (
                                    <div className="mb-4">
                                        <div className="text-2xl font-bold text-gray-100">
                                            {teamStats.winRate}%
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {teamStats.wins}W - {teamStats.losses}L
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {teamStats.totalGames} battles
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowAddReplayModal(true)}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                                    >
                                        Add Replay
                                    </button>
                                    <button
                                        onClick={() => setShowEditTeamModal(true)}
                                        className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm"
                                    >
                                        Edit Team
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="mb-6">
                    <div className="border-b border-slate-700">
                        <nav className="flex space-x-8">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-400'
                                            : 'border-transparent text-gray-400 hover:text-gray-300'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.name}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                    {renderTabContent()}
                </div>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteTeam}
                title="Delete Team"
                message={
                    <div>
                        <p className="mb-4">Are you sure you want to delete "{team?.name}"?</p>
                        {teamStats && (
                            <div className="bg-slate-700 p-3 rounded text-sm">
                                <p>This will permanently delete:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>{teamStats.totalGames} battle replays</li>
                                    <li>All team configuration and notes</li>
                                    <li>All statistics and analysis data</li>
                                </ul>
                            </div>
                        )}
                    </div>
                }
                confirmText="Delete Team"
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />

            <EditTeamModal
                isOpen={showEditTeamModal}
                onClose={() => setShowEditTeamModal(false)}
                teamData={team}
                onTeamUpdated={handleTeamUpdated}
            />

            <AddReplayModal
                isOpen={showAddReplayModal}
                onClose={() => setShowAddReplayModal(false)}
                teamId={teamId}
                teamName={team?.name}
                team={team}
                onReplayAdded={handleReplayAdded}
            />
        </div>
    );
};

export default TeamPage;