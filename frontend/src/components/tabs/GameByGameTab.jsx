import React from 'react';

/**
 * Game by Game tab - shows detailed breakdown of each game
 * @param {Object} props
 * @param {Object[]} props.replays - Array of replay objects
 * @param {Object} props.stats - Team stats
 */
const GameByGameTab = ({ replays, stats }) => {
  if (!replays || replays.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400">No games recorded yet. Add replays to see analysis.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">
        Game by Game Analysis ({replays.length} games)
      </h2>

      <div className="space-y-4">
        {replays.map((replay, index) => (
          <div key={replay.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 font-mono text-sm">
                  #{replays.length - index}
                </span>
                <h3 className="font-semibold text-white">
                  vs {replay.opponentName || 'Unknown'}
                </h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    replay.result === 'win'
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : replay.result === 'loss'
                      ? 'bg-red-600/20 text-red-400'
                      : 'bg-gray-600/20 text-gray-400'
                  }`}
                >
                  {replay.result ? replay.result.toUpperCase() : 'UNKNOWN'}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {replay.date
                  ? new Date(replay.date).toLocaleDateString()
                  : 'No date'}
              </span>
            </div>

            {replay.notes && (
              <p className="text-sm text-gray-400 mb-2">{replay.notes}</p>
            )}

            {replay.replayUrl && (
              <a
                href={replay.replayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View Replay →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameByGameTab;
