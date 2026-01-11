// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calendar, TrendingUp, Trophy, LogOut, Download } from 'lucide-react';
import { NewTeamModal, PokemonTeam, Footer } from '../components';
import ImportTeamModal from '../components/modals/ImportTeamModal';
import { useAuth } from '../contexts';
import TeamService from '../services/TeamService';
import { useMultipleTeamStats } from '@/hooks/useTeamStats';
import { formatTimeAgo } from '@/utils/timeUtils';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [teams, setTeams] = useState([]);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get team IDs for the stats hook
  const teamIds = teams.map(team => team.id);

  // Use the custom hook to load all team stats
  const {
    teamStats,
    overallStats,
    loading: statsLoading,
    refreshAll: refreshAllStats
  } = useMultipleTeamStats(teamIds);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsList = await TeamService.getList();
      setTeams(teamsList);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (teamData) => {
    try {
      await TeamService.create(teamData);
      await loadTeams(); // Refresh teams list
      // The useMultipleTeamStats hook will automatically refresh when teamIds change
      setShowNewTeamModal(false);
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  };

  const handleImportSuccess = async (teamId, teamName) => {
    // Refresh teams list after import
    await loadTeams();
    setShowImportModal(false);
    // Navigate to the newly imported team
    if (teamId) {
      navigate(`/team/${teamId}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  VS Recorder
                </h1>
                <p className="text-gray-300">Analyze your VGC performance and improve your gameplay</p>
              </div>

              {/* User info and logout */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-gray-300 text-sm font-medium">{user?.username}</p>
                  <p className="text-gray-500 text-xs">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-emerald-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{teams.length}</p>
                    <p className="text-gray-400 text-sm">Teams</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-100">
                      {statsLoading ? '...' : overallStats.totalGames}
                    </p>
                    <p className="text-gray-400 text-sm">Games Played</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-100">
                      {statsLoading ? '...' : overallStats.totalWins}
                    </p>
                    <p className="text-gray-400 text-sm">Wins</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-yellow-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-100">
                      {statsLoading ? '...' : `${overallStats.overallWinRate}%`}
                    </p>
                    <p className="text-gray-400 text-sm">Win Rate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Teams Section */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Your Teams</h2>
              <div className="flex gap-2">
                <button
                    onClick={() => setShowImportModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Import Team
                </button>
                <button
                    onClick={() => setShowNewTeamModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Team
                </button>
              </div>
            </div>

            {/* Teams Grid */}
            {teams.length === 0 ? (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 text-center">
                  <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No teams yet</h3>
                  <p className="text-gray-400 mb-4">Create your first team to start analyzing your VGC performance</p>
                  <button
                      onClick={() => setShowNewTeamModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Create Your First Team
                  </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map((team) => (
                      <TeamCard
                          key={team.id}
                          team={team}
                          stats={teamStats[team.id]}
                          statsLoading={statsLoading}
                      />
                  ))}
                </div>
            )}

            {/* New Team Modal */}
            {showNewTeamModal && (
                <NewTeamModal
                    onClose={() => setShowNewTeamModal(false)}
                    onCreateTeam={handleCreateTeam}
                />
            )}

            {/* Import Team Modal */}
            {showImportModal && (
                <ImportTeamModal
                    onClose={() => setShowImportModal(false)}
                    onImportSuccess={handleImportSuccess}
                />
            )}
          </div>
        </div>
        <Footer />
      </div>
  );
};

// Simplified TeamCard component - no longer manages its own stats
const TeamCard = ({ team, stats, statsLoading }) => {
  // Use the stats passed from parent (from the hook)
  const teamStats = stats || {
    gamesPlayed: 0,
    wins: 0,
    winRate: 0
  };

  return (
      <Link
          to={`/team/${team.id}`}
          className="block bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-100 mb-1">{team.name}</h3>
            <p className="text-sm text-gray-400">{team.regulation}</p>
          </div>
          <div className="text-right">
            {statsLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
            ) : (
                <>
                  <p className="text-lg font-bold text-emerald-400">{teamStats.winRate}%</p>
                  <p className="text-xs text-gray-400">Win Rate</p>
                </>
            )}
          </div>
        </div>

        {team.description && (
            <p className="text-gray-300 text-sm mb-4 line-clamp-2">{team.description}</p>
        )}

        <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
          {statsLoading ? (
              <span>Loading stats...</span>
          ) : (
              <span>{teamStats.gamesPlayed} games • {teamStats.wins} wins</span>
          )}
          <span>{formatTimeAgo(team.updatedAt || team.createdAt)}</span>
        </div>

        <div className="mb-4">
          <PokemonTeam
              pokepaste={team.pokepaste}
              size="md"
              maxDisplay={6}
              className="justify-center"
          />
        </div>

        {/* Tags */}
        {team.tags && team.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {team.tags.map((tag, index) => (
                  <span
                      key={index}
                      className="bg-slate-700 text-gray-300 px-2 py-1 rounded text-xs"
                  >
              {tag}
            </span>
              ))}
            </div>
        )}
      </Link>
  );
};

export default HomePage;