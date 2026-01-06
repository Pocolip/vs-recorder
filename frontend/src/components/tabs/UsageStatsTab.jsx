import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Spinner } from '@/components/common';
import { useAnalytics } from '@/hooks';

/**
 * Usage Stats tab - shows Pokemon usage statistics and win rates
 * @param {Object} props
 * @param {Object} props.team - Team object
 */
const UsageStatsTab = ({ team }) => {
  const { data: usageData, loading } = useAnalytics(team?.id, 'usage');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!usageData || usageData.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400">
          No usage data available yet. Add replays to see statistics.
        </p>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = usageData.map((stat) => ({
    name: stat.pokemonName || 'Unknown',
    'Usage %': parseFloat(stat.usagePercentage?.toFixed(1) || 0),
    'Win Rate %': parseFloat(stat.winRate?.toFixed(1) || 0),
    gamesPlayed: stat.gamesPlayed || 0,
    wins: stat.wins || 0,
    losses: stat.losses || 0,
  }));

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Usage Statistics</h2>

      {/* Chart */}
      <div className="card mb-6">
        <h3 className="text-lg font-medium text-gray-300 mb-4">
          Usage & Win Rate by Pokemon
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
              height={80}
            />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#F3F4F6',
              }}
            />
            <Legend />
            <Bar dataKey="Usage %" fill="#10B981" />
            <Bar dataKey="Win Rate %" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Stats Table */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-300 mb-4">Detailed Statistics</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-sm font-medium text-gray-400 pb-3">
                  Pokemon
                </th>
                <th className="text-center text-sm font-medium text-gray-400 pb-3">
                  Games Played
                </th>
                <th className="text-center text-sm font-medium text-gray-400 pb-3">
                  Usage %
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
              {usageData.map((stat, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 text-white font-medium">
                    {stat.pokemonName || 'Unknown'}
                  </td>
                  <td className="py-3 text-center text-gray-300">
                    {stat.gamesPlayed || 0}
                  </td>
                  <td className="py-3 text-center text-emerald-400 font-medium">
                    {stat.usagePercentage?.toFixed(1) || 0}%
                  </td>
                  <td className="py-3 text-center text-emerald-400">
                    {stat.wins || 0}
                  </td>
                  <td className="py-3 text-center text-red-400">
                    {stat.losses || 0}
                  </td>
                  <td className="py-3 text-center text-blue-400 font-medium">
                    {stat.winRate?.toFixed(1) || 0}%
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

export default UsageStatsTab;
