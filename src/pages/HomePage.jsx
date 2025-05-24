import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StorageService from '../services/StorageService';
import NewTeamModal from '../components/NewTeamModal';

const HomePage = () => {
  const [teams, setTeams] = useState([]);
  const [overallStats, setOverallStats] = useState({
    overallWinRate: 0,
    totalGames: 0,
    activeTeams: 0
  });
  const [loading, setLoading] = useState(true);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Initialize storage if needed
      await StorageService.initialize();

      // Load teams
      const teamsData = await StorageService.getTeams();
      setTeams(teamsData);

      // Calculate overall stats
      const stats = await StorageService.calculateOverallStats();
      setOverallStats(stats);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTeam = () => {
    setShowNewTeamModal(true);
  };

  const handleTeamCreated = async (newTeam) => {
    console.log('New team created:', newTeam);
    // Reload data to reflect the new team
    await loadData();
  };

  const handleAddReplay = () => {
    // TODO: Implement replay addition
    console.log('Add replay - to be implemented');
  };

  const handleImportTeam = () => {
    // TODO: Implement team import from Pokepaste
    console.log('Import team - to be implemented');
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span className="text-gray-300">Loading your data...</span>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8 mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
              VS Recorder
            </h1>
            <p className="text-gray-300 text-lg">
              Analyze your Pokémon VGC Showdown replays and improve your competitive gameplay
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
              <div className="text-2xl font-bold text-emerald-400">{overallStats.overallWinRate}%</div>
              <div className="text-gray-400">Overall Win Rate</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
              <div className="text-2xl font-bold text-blue-400">{overallStats.totalGames}</div>
              <div className="text-gray-400">Total Games</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
              <div className="text-2xl font-bold text-purple-400">{overallStats.activeTeams}</div>
              <div className="text-gray-400">Active Teams</div>
            </div>
          </div>

          {/* Teams Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Your Teams</h2>
              <button
                  onClick={handleNewTeam}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                + New Team
              </button>
            </div>

            {teams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-bold text-gray-200 mb-2">No Teams Yet</h3>
                  <p className="text-gray-400 mb-6">Create your first team to start analyzing your battles</p>
                  <button
                      onClick={handleNewTeam}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Create Your First Team
                  </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams
                      .filter(team => !team.isArchived)
                      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
                      .map((team) => (
                          <Link
                              key={team.id}
                              to={`/team/${team.id}`}
                              className="block"
                          >
                            <div className="bg-slate-700/50 hover:bg-slate-700/70 rounded-lg p-4 transition-all duration-200 hover:transform hover:scale-105 cursor-pointer border border-slate-600 hover:border-slate-500">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-semibold text-gray-200 truncate">{team.name}</h3>
                                <span className="text-xs text-gray-400 bg-slate-800 px-2 py-1 rounded">
                        {team.format}
                      </span>
                              </div>

                              <div className="text-2xl mb-3">{team.pokemon}</div>

                              <div className="flex justify-between items-end">
                                <div className="flex gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-emerald-400">{team.winRate}%</div>
                                    <div className="text-xs text-gray-400">Win Rate</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-blue-400">{team.gamesPlayed}</div>
                                    <div className="text-xs text-gray-400">Games</div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {StorageService.formatTimeAgo(team.lastUsed)}
                                </div>
                              </div>

                              {/* Tags */}
                              {team.customTags && team.customTags.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {team.customTags.slice(0, 2).map((tag, index) => (
                                        <span
                                            key={index}
                                            className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded"
                                        >
                            {tag}
                          </span>
                                    ))}
                                    {team.customTags.length > 2 && (
                                        <span className="text-xs text-gray-500">
                            +{team.customTags.length - 2}
                          </span>
                                    )}
                                  </div>
                              )}
                            </div>
                          </Link>
                      ))}
                </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                  onClick={handleAddReplay}
                  className="p-4 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg transition-colors text-left"
              >
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-semibold text-gray-200">Add Replay</h3>
                <p className="text-sm text-gray-400">Import a new Pokémon Showdown replay</p>
              </button>
              <button
                  onClick={handleImportTeam}
                  className="p-4 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg transition-colors text-left"
              >
                <div className="text-2xl mb-2">🏆</div>
                <h3 className="font-semibold text-gray-200">Import Team</h3>
                <p className="text-sm text-gray-400">Add a new team from Pokepaste</p>
              </button>
            </div>
          </div>

          {/* New Team Modal */}
          <NewTeamModal
              isOpen={showNewTeamModal}
              onClose={() => setShowNewTeamModal(false)}
              onTeamCreated={handleTeamCreated}
          />

          {/* Debug Section (development only) */}
          {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 bg-red-900/20 border border-red-700 rounded-lg p-4">
                <h3 className="text-red-400 font-bold mb-2">Debug Info</h3>
                <div className="text-sm text-gray-400">
                  <p>Teams loaded: {teams.length}</p>
                  <p>Total games: {overallStats.totalGames}</p>
                  <p>Active teams: {overallStats.activeTeams}</p>
                  <p>Modal open: {showNewTeamModal ? 'Yes' : 'No'}</p>
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default HomePage;