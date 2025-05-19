import React, { useState, useEffect } from 'react';

const HomePage = () => {
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);

  // Sample team data (this will come from Chrome storage later)
  const sampleTeams = [
    {
      id: 1,
      name: "Grassy Terrain Control",
      battleCount: 47,
      winRate: 68.1,
      pokemon: ["🌱", "⚡", "🔥", "💧", "🌪️", "🪨"],
      format: "VGC 2025",
      lastUsed: new Date('2024-12-15'),
    },
    {
      id: 2,
      name: "Trick Room Setup",
      battleCount: 23,
      winRate: 56.5,
      pokemon: ["👻", "🧠", "⭐", "🌙", "🛡️", "💎"],
      format: "VGC 2025",
      lastUsed: new Date('2024-12-10'),
    },
    {
      id: 3,
      name: "Water/Electric Core",
      battleCount: 35,
      winRate: 74.3,
      pokemon: ["💧", "⚡", "🐉", "❄️", "🌿", "🔥"],
      format: "VGC 2025",
      lastUsed: new Date('2024-12-18'),
    }
  ];

  // Load teams on component mount (stubbed for now)
  useEffect(() => {
    // TODO: Load from Chrome storage
    setTeams(sampleTeams);
    setFilteredTeams(sampleTeams);
  }, []);

  // Filter teams based on search input
  useEffect(() => {
    const filtered = teams.filter(team =>
        team.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        team.format.toLowerCase().includes(searchFilter.toLowerCase())
    );
    setFilteredTeams(filtered);
  }, [searchFilter, teams]);

  const handleTeamClick = (teamId) => {
    // TODO: Navigate to team analysis page
    console.log(`Navigate to team ${teamId}`);
  };

  const handleAddTeam = () => {
    setShowAddTeamModal(true);
  };

  const handleCreateTeam = (teamData) => {
    // TODO: Save new team to Chrome storage
    const newTeam = {
      id: Date.now(),
      battleCount: 0,
      winRate: 0,
      lastUsed: new Date(),
      ...teamData
    };
    setTeams([...teams, newTeam]);
    setShowAddTeamModal(false);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWinRateColor = (winRate) => {
    if (winRate >= 70) return 'text-emerald-400';
    if (winRate >= 60) return 'text-blue-400';
    if (winRate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
              Team Manager
            </h1>
            <p className="text-gray-300 text-lg">
              Manage and analyze your VGC teams
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            {/* Search Filter */}
            <div className="flex-1">
              <input
                  type="text"
                  placeholder="Search teams by name or format..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/70 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Add Team Button */}
            <button
                onClick={handleAddTeam}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              + Add New Team
            </button>
          </div>

          {/* Teams List */}
          <div className="space-y-4">
            {filteredTeams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-4">
                    {searchFilter ? 'No teams match your search' : 'No teams found'}
                  </div>
                  {!searchFilter && (
                      <button
                          onClick={handleAddTeam}
                          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-200"
                      >
                        Create Your First Team
                      </button>
                  )}
                </div>
            ) : (
                filteredTeams.map((team) => (
                    <div
                        key={team.id}
                        onClick={() => handleTeamClick(team.id)}
                        className="group bg-slate-800/70 backdrop-blur-sm border border-slate-600 rounded-lg p-6 cursor-pointer hover:bg-slate-700/70 hover:border-slate-500 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h3 className="text-xl font-bold text-gray-100 group-hover:text-blue-400 transition-colors duration-200">
                              {team.name}
                            </h3>
                            <span className="px-3 py-1 bg-slate-700 text-gray-300 text-sm rounded-full">
                        {team.format}
                      </span>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-gray-300">
                      <span>
                        <span className="text-gray-400">Battles:</span> {team.battleCount}
                      </span>
                            <span>
                        <span className="text-gray-400">Win Rate:</span>
                        <span className={`ml-1 font-semibold ${getWinRateColor(team.winRate)}`}>
                          {team.winRate}%
                        </span>
                      </span>
                            <span>
                        <span className="text-gray-400">Last Used:</span> {formatDate(team.lastUsed)}
                      </span>
                          </div>
                        </div>

                        {/* Pokemon Team Display */}
                        <div className="flex items-center">
                          <div className="flex gap-2 mr-4">
                            {team.pokemon.map((pokemon, index) => (
                                <div
                                    key={index}
                                    className="text-2xl p-2 bg-slate-700/50 rounded-lg group-hover:bg-slate-600/50 transition-colors duration-200"
                                >
                                  {pokemon}
                                </div>
                            ))}
                          </div>

                          {/* Chevron */}
                          <div className="text-gray-400 group-hover:text-blue-400 transition-colors duration-200">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Add Team Modal */}
        {showAddTeamModal && (
            <AddTeamModal
                onClose={() => setShowAddTeamModal(false)}
                onSubmit={handleCreateTeam}
            />
        )}
      </div>
  );
};

// Add Team Modal Component
const AddTeamModal = ({ onClose, onSubmit }) => {
  const [teamName, setTeamName] = useState('');
  const [format, setFormat] = useState('VGC 2025');
  const [pokepaste, setPokepaste] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (teamName.trim()) {
      onSubmit({
        name: teamName.trim(),
        format,
        pokepaste,
        pokemon: ["❓", "❓", "❓", "❓", "❓", "❓"], // Placeholder until we parse pokepaste
      });
    }
  };

  return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Add New Team</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Team Name
              </label>
              <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter team name..."
                  required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Format
              </label>
              <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="VGC 2025">VGC 2025</option>
                <option value="VGC 2024">VGC 2024</option>
                <option value="BSS">Battle Stadium Singles</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Pokepaste URL (Optional)
              </label>
              <input
                  type="url"
                  value={pokepaste}
                  onChange={(e) => setPokepaste(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://pokepast.es/..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-gray-200 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg transition-all duration-200"
              >
                Create Team
              </button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default HomePage;