// src/pages/TeamPage.jsx - Updated with MoveUsageTab
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Edit3,
    Trash2,
    Calendar,
    TrendingUp,
    Users,
    BarChart3,
    Target,
    Zap,
    Clipboard,
    Share2,
    FileText,
    Calculator
} from 'lucide-react';
import {
    ConfirmationModal,
    AddReplayModal,
    EditTeamModal,
    ReplaysTab,
    GameByGameTab,
    MatchByMatchTab,
    UsageStatsTab,
    MatchupStatsTab,
    MoveUsageTab,
    PokemonTeam
} from '../components';
import ExportTeamModal from '../components/modals/ExportTeamModal';
import OpponentPlannerTab from '../components/tabs/OpponentPlannerTab';
import PokemonNotesTab from '../components/tabs/PokemonNotesTab';
import DamageCalcTab from '../components/tabs/DamageCalcTab';
import TeamService from '../services/TeamService';
import ReplayService from '../services/ReplayService';
import MatchService from "@/services/MatchService";
import { useTeamStats } from '@/hooks/useTeamStats';
import { formatTimeAgo } from '@/utils/timeUtils';

const TeamPage = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [activeTab, setActiveTab] = useState('replays');
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddReplayModal, setShowAddReplayModal] = useState(false);
    const [showEditTeamModal, setShowEditTeamModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Use the custom hook for team statistics
    const {
        gamesPlayed,
        wins,
        losses,
        winRate,
        replays,
        loading: statsLoading,
        refreshStats,
        hasGames,
        perfectRecord,
        lastGameResult
    } = useTeamStats(teamId);

    useEffect(() => {
        loadTeamData();
    }, [teamId]);

    const loadTeamData = async () => {
        try {
            setLoading(true);

            // Load team data
            const teamData = await TeamService.getById(teamId);
            if (!teamData) {
                navigate('/');
                return;
            }
            setTeam(teamData);

            // Team stats are handled by the hook automatically
        } catch (error) {
            console.error('Error loading team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTeam = async () => {
        try {
            setDeleting(true);
            await ReplayService.deleteByTeamId(teamId);
            await MatchService.deleteByTeamId(teamId);
            await TeamService.delete(teamId);
            navigate('/');
        } catch (error) {
            console.error('Error deleting team:', error);
            setDeleting(false);
        }
    };

    const handleAddReplay = async (replayUrl, notes) => {
        try {
            await ReplayService.createFromUrl(teamId, replayUrl, notes);
            // Refresh stats after adding a replay
            refreshStats();
            setShowAddReplayModal(false);
        } catch (error) {
            console.error('Error adding replay:', error);
            throw error;
        }
    };

    const handleDeleteReplay = async (replayId) => {
        try {
            await ReplayService.delete(replayId);
            // Refresh stats after deleting a replay
            refreshStats();
        } catch (error) {
            console.error('Error deleting replay:', error);
            throw error;
        }
    };

    const handleUpdateReplay = async (replayId, updates) => {
        try {
            await ReplayService.update(replayId, updates);
            // Refresh stats after updating a replay (in case result changed)
            refreshStats();
        } catch (error) {
            console.error('Error updating replay:', error);
            throw error;
        }
    };

    const handleTeamUpdated = async (updatedTeam) => {
        try {
            // Save the updated team to Chrome Storage
            const savedTeam = await TeamService.update(updatedTeam.id, {
                name: updatedTeam.name,
                description: updatedTeam.description,
                pokepaste: updatedTeam.pokepaste,
                format: updatedTeam.format,
                showdownUsernames: updatedTeam.showdownUsernames
            });

            // Update local state with the saved team data
            setTeam(savedTeam);
            refreshStats();
            setShowEditTeamModal(false);
        } catch (error) {
            console.error('Error updating team:', error);
            // Keep the modal open so user can try again
            // Optionally show an error message
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!team) {
        return <TeamNotFound />;
    }

    const tabs = [
        { id: 'replays', label: 'Replays', icon: Calendar },
        { id: 'game-by-game', label: 'Game by Game', icon: BarChart3 },
        { id: 'match-by-match', label: 'Match by Match', icon: Users },
        { id: 'usage-stats', label: 'Usage Stats', icon: TrendingUp },
        { id: 'matchup-stats', label: 'Matchup Stats', icon: Target },
        { id: 'move-usage', label: 'Move Usage', icon: Zap },
        { id: 'opponent-planner', label: 'Matchup Planner', icon: Clipboard },
        { id: 'pokemon-notes', label: 'Pokemon Notes', icon: FileText },
        // { id: 'match-calc', label: 'Match Calc', icon: Calculator }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <TeamHeader
                    team={team}
                    onAddReplay={() => setShowAddReplayModal(true)}
                    onEditTeam={() => setShowEditTeamModal(true)}
                    onExportTeam={() => setShowExportModal(true)}
                    onDeleteTeam={() => setShowDeleteModal(true)}
                />

                {/* Team Info Card */}
                <TeamInfoCard
                    team={team}
                    gamesPlayed={gamesPlayed}
                    wins={wins}
                    losses={losses}
                    winRate={winRate}
                    statsLoading={statsLoading}
                    hasGames={hasGames}
                    perfectRecord={perfectRecord}
                    lastGameResult={lastGameResult}
                />

                {/* Tab Navigation */}
                <TabNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {/* Tab Content */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 min-h-[600px]">
                    {activeTab === 'replays' && (
                        <ReplaysTab
                            replays={replays}
                            onDeleteReplay={handleDeleteReplay}
                            onUpdateReplay={handleUpdateReplay}
                        />
                    )}
                    {activeTab === 'game-by-game' && (
                        <GameByGameTab
                            replays={replays}
                            onUpdateReplay={handleUpdateReplay}
                        />
                    )}
                    {activeTab === 'match-by-match' && (
                        <MatchByMatchTab
                            teamId={teamId}
                        />
                    )}
                    {activeTab === 'usage-stats' && (
                        <UsageStatsTab
                            replays={replays}
                            team={team}
                        />
                    )}
                    {activeTab === 'matchup-stats' && (
                        <MatchupStatsTab
                            replays={replays}
                        />
                    )}
                    {activeTab === 'move-usage' && (
                        <MoveUsageTab
                            replays={replays}
                            team={team}
                        />
                    )}
                    {activeTab === 'opponent-planner' && (
                        <OpponentPlannerTab
                            team={team}
                            teamId={teamId}
                        />
                    )}
                    {activeTab === 'pokemon-notes' && (
                        <PokemonNotesTab
                            teamId={teamId}
                            team={team}
                        />
                    )}
                    {activeTab === 'match-calc' && (
                        <DamageCalcTab />
                    )}
                </div>

                {/* Modals */}
                {showDeleteModal && (
                    <ConfirmationModal
                        title="Delete Team"
                        message={<DeleteTeamMessage team={team} gamesPlayed={gamesPlayed} />}
                        onConfirm={handleDeleteTeam}
                        onCancel={() => setShowDeleteModal(false)}
                        loading={deleting}
                        confirmText="Delete Team"
                        confirmButtonClass="bg-red-600 hover:bg-red-700"
                    />
                )}

                {showAddReplayModal && (
                    <AddReplayModal
                        onClose={() => setShowAddReplayModal(false)}
                        onAddReplay={handleAddReplay}
                    />
                )}

                {showEditTeamModal && (
                    <EditTeamModal
                        isOpen={showEditTeamModal}
                        onClose={() => setShowEditTeamModal(false)}
                        teamData={team}
                        onTeamUpdated={handleTeamUpdated}
                    />
                )}

                {showExportModal && (
                    <ExportTeamModal
                        team={team}
                        onClose={() => setShowExportModal(false)}
                    />
                )}
            </div>
        </div>
    );
};

// Loading Screen Component
const LoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        </div>
    </div>
);

// Team Not Found Component
const TeamNotFound = () => (
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

// Team Header Component
const TeamHeader = ({ team, onAddReplay, onEditTeam, onExportTeam, onDeleteTeam }) => (
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
                <p className="text-gray-400">{team.regulation}</p>
            </div>
        </div>

        <div className="flex gap-2">
            <button
                onClick={onAddReplay}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <Plus className="h-4 w-4" />
                Add Replay
            </button>
            <button
                onClick={onEditTeam}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <Edit3 className="h-4 w-4" />
                Edit Team
            </button>
            <button
                onClick={onExportTeam}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <Share2 className="h-4 w-4" />
                Export
            </button>
            <button
                onClick={onDeleteTeam}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
                <Trash2 className="h-4 w-4" />
                Delete
            </button>
        </div>
    </div>
);

// Enhanced Team Info Card Component
const TeamInfoCard = ({
                          team,
                          gamesPlayed,
                          wins,
                          losses,
                          winRate,
                          statsLoading,
                          hasGames,
                          perfectRecord,
                          lastGameResult
                      }) => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pokemon Display */}
            <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">Team</h3>
                <PokemonTeam
                    pokepaste={team.pokepaste}
                    size="lg"
                    showNames={true}
                    maxDisplay={6}
                    className="justify-start"
                />
                {team.description && (
                    <p className="text-gray-300 mt-4">{team.description}</p>
                )}
            </div>

            {/* Stats */}
            <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-3">Performance</h3>
                {statsLoading ? (
                    <div className="space-y-2">
                        <div className="animate-pulse bg-slate-700 h-4 rounded w-20"></div>
                        <div className="animate-pulse bg-slate-700 h-4 rounded w-16"></div>
                        <div className="animate-pulse bg-slate-700 h-4 rounded w-24"></div>
                        <div className="animate-pulse bg-slate-700 h-4 rounded w-18"></div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Games:</span>
                            <span className="text-gray-100">{gamesPlayed}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Wins:</span>
                            <span className="text-green-400">{wins}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Losses:</span>
                            <span className="text-red-400">{losses}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Win Rate:</span>
                            <span className="text-emerald-400 font-semibold">{winRate}%</span>
                        </div>

                        {/* Additional insights */}
                        {perfectRecord && hasGames && (
                            <div className="mt-3 px-2 py-1 bg-yellow-600/20 border border-yellow-600/30 rounded text-xs text-yellow-400">
                                🏆 Perfect Record!
                            </div>
                        )}
                        {lastGameResult && (
                            <div className="text-xs text-gray-500 mt-2">
                                Last game: <span className={lastGameResult === 'win' ? 'text-green-400' : 'text-red-400'}>
                                    {lastGameResult.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                )}
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
    </div>
);

// Tab Navigation Component
const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
    const handleTabClick = (e, tabId) => {
        e.preventDefault();
        onTabChange(tabId);
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg mb-8">
            <div className="flex overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={(e) => handleTabClick(e, tab.id)}
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
    );
};

// Delete Team Message Component
const DeleteTeamMessage = ({ team, gamesPlayed }) => (
    <div>
        <p className="mb-4">
            Are you sure you want to delete <strong>{team.name}</strong>?
        </p>
        <div className="bg-slate-700 rounded-lg p-4 text-sm">
            <p className="text-gray-300 mb-2">This will permanently delete:</p>
            <ul className="text-gray-400 space-y-1">
                <li>• The team and all its data</li>
                <li>• {gamesPlayed} associated replays</li>
                <li>• All analysis and statistics</li>
            </ul>
        </div>
        <p className="mt-4 text-red-400 font-medium">
            This action cannot be undone.
        </p>
    </div>
);

export default TeamPage;