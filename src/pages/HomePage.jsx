// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, TrendingUp, Trophy } from 'lucide-react';
import { NewTeamModal, PokemonTeam, Footer } from '../components';
import TeamService from '../services/TeamService';
import ReplayService from '../services/ReplayService';

const HomePage = () => {
  const [teams, setTeams] = useState([]);
  const [overallStats, setOverallStats] = useState({
    totalTeams: 0,
    totalGames: 0,
    totalWins: 0,
    winRate: 0
  });
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load teams
      const teamsList = await TeamService.getList();
      setTeams(teamsList);

      // Calculate overall stats
      let totalGames = 0;
      let totalWins = 0;

      for (const team of teamsList) {
        const teamReplays = await ReplayService.getByTeamId(team.id);
        const teamWins = teamReplays.filter(r => r.result === 'win').length;

        totalGames += teamReplays.length;
        totalWins += teamWins;
      }

      setOverallStats({
        totalTeams: teamsList.length,
        totalGames,
        totalWins,
        winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (teamData) => {
    try {
      await TeamService.create(teamData);
      await loadData(); // Refresh data
      setShowNewTeamModal(false);
    } catch (error) {
      console.error('Error creating team:', error);
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
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-2">
                VS Recorder
              </h1>
              <p className="text-gray-300">Analyze your VGC performance and improve your gameplay</p>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-emerald-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{overallStats.totalTeams}</p>
                    <p className="text-gray-400 text-sm">Teams</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{overallStats.totalGames}</p>
                    <p className="text-gray-400 text-sm">Games Played</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{overallStats.totalWins}</p>
                    <p className="text-gray-400 text-sm">Wins</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-yellow-400 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-100">{overallStats.winRate}%</p>
                    <p className="text-gray-400 text-sm">Win Rate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Teams Section */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Your Teams</h2>
              <button
                  onClick={() => setShowNewTeamModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Team
              </button>
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
                          formatTimeAgo={formatTimeAgo}
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
          </div>
        </div>
        <Footer />
      </div>
  );
};

// Updated TeamCard component with Pokemon integration
const TeamCard = ({ team, formatTimeAgo }) => {
  const [teamStats, setTeamStats] = useState({
    gamesPlayed: 0,
    wins: 0,
    winRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamStats();
  }, [team.id]);

  const loadTeamStats = async () => {
    try {
      const replays = await ReplayService.getByTeamId(team.id);
      const wins = replays.filter(r => r.result === 'win').length;

      setTeamStats({
        gamesPlayed: replays.length,
        wins,
        winRate: replays.length > 0 ? Math.round((wins / replays.length) * 100) : 0
      });
    } catch (error) {
      console.error('Error loading team stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
      <Link
          to={`/team/${team.id}`}
          className="block bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-100 mb-1">{team.name}</h3>
            <p className="text-sm text-gray-400">{team.format}</p>
          </div>
          <div className="text-right">
            {loading ? (
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
          {loading ? (
              <span>Loading stats...</span>
          ) : (
              <span>{teamStats.gamesPlayed} games • {teamStats.wins} wins</span>
          )}
          <span>{formatTimeAgo(team.updatedAt)}</span>
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