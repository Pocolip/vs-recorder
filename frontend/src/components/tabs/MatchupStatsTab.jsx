import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Spinner } from '@/components/common';
import { useAnalytics } from '@/hooks';

/**
 * Matchup Stats tab - shows performance against specific opponent Pokemon
 * @param {Object} props
 * @param {Object} props.team - Team object
 */
const MatchupStatsTab = ({ team }) => {
  const { data: matchupData, loading } = useAnalytics(team?.id, 'matchups');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!matchupData || matchupData.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400">
          No matchup data available yet. Add replays to see statistics.
        </p>
      </div>
    );
  }

  // Transform data for Recharts (top 20 most common matchups)
  const chartData = matchupData
    .slice(0, 20)
    .map((stat) => ({
      name: stat.opponentPokemon || 'Unknown',
      'Win Rate %': parseFloat(stat.winRate?.toFixed(1) || 0),
      encounters: stat.encountersCount || 0,
      wins: stat.wins || 0,
      losses: stat.losses || 0,
    }));

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Matchup Statistics</h2>

      {/* Chart */}
      <div className="card mb-6">
        <h3 className="text-lg font-medium text-gray-300 mb-4">
          Top 20 Opponent Pokemon (Win Rate)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#F3F4F6',
              }}
            />
            <Legend />
            <Bar dataKey="Win Rate %" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Stats Table */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-300 mb-4">
          All Matchups ({matchupData.length})
        </h3>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="border-b border-slate-700">
                <th className="text-left text-sm font-medium text-gray-400 pb-3 pl-2">
                  Opponent Pokemon
                </th>
                <th className="text-center text-sm font-medium text-gray-400 pb-3">
                  Encounters
                </th>
                <th className="text-center text-sm font-medium text-gray-400 pb-3">
                  Wins
                </th>
                <th className="text-center text-sm font-medium text-gray-400 pb-3">
                  Losses
                </th>
                <th className="text-center text-sm font-medium text-gray-400 pb-3">
                  Win Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {matchupData.map((stat, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 pl-2 text-white font-medium">
                    {stat.opponentPokemon || 'Unknown'}
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {stat.encountersCount || 0}
                  </td>
                  <td className="py-3 text-center text-emerald-400">
                    {stat.wins || 0}
                  </td>
                  <td className="py-3 text-center text-red-400">
                    {stat.losses || 0}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`font-medium ${
                        stat.winRate >= 60
                          ? 'text-emerald-400'
                          : stat.winRate >= 40
                          ? 'text-blue-400'
                          : 'text-red-400'
                      }`}
                    >
                      {stat.winRate?.toFixed(1) || 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MatchupStatsTab;
