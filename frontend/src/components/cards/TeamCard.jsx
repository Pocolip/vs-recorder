import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Team card component for displaying team summary
 * @param {Object} props
 * @param {Object} props.team - Team data
 * @param {number} props.team.id - Team ID
 * @param {string} props.team.name - Team name
 * @param {string} props.team.regulation - Regulation
 * @param {number} [props.team.winRate] - Win rate percentage
 * @param {number} [props.team.gamesPlayed] - Number of games played
 * @param {string} [props.viewMode] - View mode: 'grid' or 'list'
 */
const TeamCard = ({ team, viewMode = 'grid' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/team/${team.id}`);
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        className="card hover:border-emerald-500 cursor-pointer transition-all flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{team.name}</h3>
            <p className="text-sm text-gray-400">{team.regulation || 'No regulation'}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-gray-400">Win Rate</p>
            <p className="text-emerald-400 font-semibold">
              {team.winRate != null ? `${team.winRate.toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Battles</p>
            <p className="text-white font-semibold">{team.gamesPlayed || 0}</p>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      onClick={handleClick}
      className="card hover:border-emerald-500 cursor-pointer transition-all"
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white truncate">{team.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="inline-block px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
            {team.regulation || 'No regulation'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="text-center flex-1">
          <p className="text-sm text-gray-400 mb-1">Win Rate</p>
          <p className="text-xl font-bold text-emerald-400">
            {team.winRate != null ? `${team.winRate.toFixed(1)}%` : 'N/A'}
          </p>
        </div>
        <div className="h-12 w-px bg-slate-700"></div>
        <div className="text-center flex-1">
          <p className="text-sm text-gray-400 mb-1">Battles</p>
          <p className="text-xl font-bold text-white">{team.gamesPlayed || 0}</p>
        </div>
      </div>

      {/* Hover indicator */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Click to view details →
      </div>
    </div>
  );
};

export default TeamCard;
