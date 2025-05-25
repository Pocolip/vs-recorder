// src/pages/HomePage.jsx - Updated with Replay Counts
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/StorageService';
import NewTeamModal from '../components/NewTeamModal';

const HomePage = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState({});
  const [stats, setStats] = useState({ totalTeams: 0, totalReplays: 0, overallWinRate: 0 });
  const [teamStats, setTeamStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, overallStats] = await Promise.all([
        StorageService.getTeams(),
        StorageService.getStats()
      ]);

      setTeams(teamsData);
      setStats(overallStats);

      // Load individual team stats
      const teamStatsData = {};
      for (const teamId of Object.keys(teamsData)) {
        teamStatsData[teamId] = await StorageService.getTeamStats(teamId);
      }
      setTeamStats(teamStatsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamCreated = (newTeam) => {
    setTeams(prev => ({
      ...prev,
      [newTeam.id]: newTeam
    }));
    loadData(); // Reload to update stats
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

  const getLastBattleText = (lastBattle) => {
    if (!lastBattle) return 'No battles yet';
    return `Last battle ${formatTimeAgo(lastBattle)}`;
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
    );
  }

  const teamArray = Object.values(teams);

  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
                VS Recorder
              </h1>
              <p className="text-gray-300 text-lg mb-6">
                Analyze your Pokémon VGC battles and improve your competitive gameplay
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">{stats.totalTeams}</div>
                  <div className="text-sm text-gray-400">Active Teams</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-emerald-400">{stats.totalReplays}</div>
                  <div className="text-sm text-gray-400">Total Replays</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">{stats.overallWinRate}%</div>
                  <div className="text-sm text-gray-400">Overall Win Rate</div>
                </div>
              </div>

              <button
                  onClick={() => setShowNewTeamModal(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Create New Team
              </button>
            </div>
          </div>

          {/* Teams Grid */}
          {teamArray.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-gray-300 mb-4">No teams yet</h2>
                <p className="text-gray-400 mb-8">Create your first team to start analyzing your battles</p>
                <button
                    onClick={() => setShowNewTeamModal(true)}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg"
                >
                  Create Your First Team
                </button>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamArray.map(team => {
                  const stats = teamStats[team.id] || { totalGames: 0, winRate: 0, wins: 0, losses: 0, lastBattle: null };

                  return (
                      <div
                          key={team.id}
                          onClick={() => navigate(`/team/${team.id}`)}
                          className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 hover:border-slate-600 cursor-pointer transition-all duration-200 hover:transform hover:scale-105"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-100 mb-2">{team.name}</h3>
                            {team.description && (
                                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{team.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-100">{stats.winRate}%</div>
                            <div className="text-xs text-gray-400">Win Rate</div>
                          </div>
                        </div>

                        {/* Team Pokemon Sprites - Placeholder */}
                        <div className="flex gap-1 mb-4">
                          {Array.from({ length: 6 }, (_, i) => (
                              <div key={i} className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">
                                <span className="text-xs">🔥</span>
                              </div>
                          ))}
                        </div>

                        {/* Team Stats */}
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-sm text-gray-400">
                            {stats.totalGames > 0 ? (
                                <span>{stats.wins}W - {stats.losses}L ({stats.totalGames} battles)</span>
                            ) : (
                                <span>No battles yet</span>
                            )}
                          </div>
                        </div>

                        {/* Tags and Format */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {team.format && (
                              <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                        {team.format}
                      </span>
                          )}
                          {team.tags?.slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-1 bg-slate-700 text-gray-300 rounded text-xs">
                        {tag}
                      </span>
                          ))}
                          {team.tags && team.tags.length > 2 && (
                              <span className="px-2 py-1 bg-slate-700 text-gray-300 rounded text-xs">
                        +{team.tags.length - 2} more
                      </span>
                          )}
                        </div>

                        {/* Last Activity */}
                        <div className="text-xs text-gray-500">
                          {getLastBattleText(stats.lastBattle)}
                        </div>
                      </div>
                  );
                })}
              </div>
          )}
        </div>

        {/* New Team Modal */}
        <NewTeamModal
            isOpen={showNewTeamModal}
            onClose={() => setShowNewTeamModal(false)}
            onTeamCreated={handleTeamCreated}
        />
      </div>
  );
};

export default HomePage;