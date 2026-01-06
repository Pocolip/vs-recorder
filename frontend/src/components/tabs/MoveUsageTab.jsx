import React from 'react';
import { Spinner } from '@/components/common';
import { useAnalytics } from '@/hooks';

/**
 * Move Usage tab - shows which moves were used and their effectiveness
 * @param {Object} props
 * @param {Object} props.team - Team object
 */
const MoveUsageTab = ({ team }) => {
  const { data: moveData, loading } = useAnalytics(team?.id, 'moves');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!moveData || moveData.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400">
          No move usage data available yet. Add replays to see statistics.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Move Usage Analysis</h2>

      {/* Pokemon sections */}
      <div className="space-y-6">
        {moveData.map((pokemon, pokemonIdx) => (
          <div key={pokemonIdx} className="card">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">
              {pokemon.pokemonName || 'Unknown'}
            </h3>

            {pokemon.moves && pokemon.moves.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-sm font-medium text-gray-400 pb-3">
                        Move
                      </th>
                      <th className="text-center text-sm font-medium text-gray-400 pb-3">
                        Times Used
                      </th>
                      <th className="text-center text-sm font-medium text-gray-400 pb-3">
                        Usage %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pokemon.moves.map((move, moveIdx) => (
                      <tr
                        key={moveIdx}
                        className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 text-white font-medium">
                          {move.moveName || 'Unknown'}
                        </td>
                        <td className="py-3 text-center text-gray-300">
                          {move.timesUsed || 0}
                        </td>
                        <td className="py-3 text-center text-blue-400 font-medium">
                          {move.usagePercentage?.toFixed(1) || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No move data recorded</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoveUsageTab;
