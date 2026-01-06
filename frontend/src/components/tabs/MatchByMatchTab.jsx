import React, { useState } from 'react';
import { Button, Input, Modal } from '@/components/common';

/**
 * Match by Match tab - shows Bo3 match records
 * @param {Object} props
 * @param {Object[]} props.matches - Array of match objects
 * @param {Function} props.createMatch - Create match function
 * @param {Function} props.deleteMatch - Delete match function
 */
const MatchByMatchTab = ({ matches, createMatch, deleteMatch }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [matchNotes, setMatchNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!opponentName.trim()) return;

    try {
      setLoading(true);
      await createMatch({
        opponentName: opponentName.trim(),
        notes: matchNotes.trim(),
      });
      setOpponentName('');
      setMatchNotes('');
      setIsAddModalOpen(false);
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match?')) {
      return;
    }

    try {
      await deleteMatch(matchId);
    } catch (error) {
      // Error handled by hook
    }
  };

  const calculateMatchResult = (match) => {
    if (!match.replays || match.replays.length === 0) {
      return { wins: 0, losses: 0, result: 'PENDING' };
    }

    const wins = match.replays.filter((r) => r.result === 'win').length;
    const losses = match.replays.filter((r) => r.result === 'loss').length;

    let result = 'IN PROGRESS';
    if (wins >= 2) result = 'WON';
    else if (losses >= 2) result = 'LOST';

    return { wins, losses, result };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">
          Matches ({matches.length})
        </h2>
        <Button onClick={() => setIsAddModalOpen(true)}>+ Create Match</Button>
      </div>

      {/* Empty State */}
      {matches.length === 0 && (
        <div className="card text-center py-12">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No matches yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create Bo3 matches to group your replays
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            + Create Your First Match
          </Button>
        </div>
      )}

      {/* Matches List */}
      {matches.length > 0 && (
        <div className="space-y-4">
          {matches.map((match) => {
            const { wins, losses, result } = calculateMatchResult(match);

            return (
              <div key={match.id} className="card hover:border-emerald-500 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        vs {match.opponentName}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          result === 'WON'
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : result === 'LOST'
                            ? 'bg-red-600/20 text-red-400'
                            : 'bg-blue-600/20 text-blue-400'
                        }`}
                      >
                        {result}
                      </span>
                      <span className="text-sm text-gray-400">
                        ({wins}-{losses})
                      </span>
                    </div>

                    {match.notes && (
                      <p className="text-sm text-gray-400 mb-2">{match.notes}</p>
                    )}

                    <div className="text-xs text-gray-500">
                      {match.replays && match.replays.length > 0 ? (
                        <span>{match.replays.length} game(s) recorded</span>
                      ) : (
                        <span>No games recorded yet</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(match.id)}
                  >
                    Delete
                  </Button>
                </div>

                {/* Show replays in match */}
                {match.replays && match.replays.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-gray-500 mb-2">Games:</p>
                    <div className="space-y-1">
                      {match.replays.map((replay, idx) => (
                        <div
                          key={replay.id}
                          className="text-sm text-gray-400 flex items-center gap-2"
                        >
                          <span className="text-gray-600">Game {idx + 1}:</span>
                          <span
                            className={`font-medium ${
                              replay.result === 'win'
                                ? 'text-emerald-400'
                                : replay.result === 'loss'
                                ? 'text-red-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {replay.result ? replay.result.toUpperCase() : 'UNKNOWN'}
                          </span>
                          {replay.replayUrl && (
                            <a
                              href={replay.replayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              View →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Match Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Match"
        size="md"
      >
        <form onSubmit={handleCreateMatch} className="space-y-4">
          <Input
            label="Opponent Name"
            type="text"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            placeholder="Opponent's name"
            required
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={matchNotes}
              onChange={(e) => setMatchNotes(e.target.value)}
              placeholder="Notes about this match..."
              className="input min-h-[100px] resize-y"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
              disabled={loading}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={loading}>
              {loading ? 'Creating...' : 'Create Match'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MatchByMatchTab;
