import React, { useState } from 'react';
import { Button, Input, Modal } from '@/components/common';

/**
 * Replays tab - displays all replays for the team
 * @param {Object} props
 * @param {Object[]} props.replays - Array of replay objects
 * @param {Function} props.addReplay - Add replay function
 * @param {Function} props.deleteReplay - Delete replay function
 */
const ReplaysTab = ({ replays, addReplay, deleteReplay }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [replayUrl, setReplayUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddReplay = async (e) => {
    e.preventDefault();
    if (!replayUrl.trim()) return;

    try {
      setLoading(true);
      await addReplay(replayUrl, notes);
      setReplayUrl('');
      setNotes('');
      setIsAddModalOpen(false);
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (replayId) => {
    if (!window.confirm('Are you sure you want to delete this replay?')) {
      return;
    }

    try {
      await deleteReplay(replayId);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">
          Replays ({replays.length})
        </h2>
        <Button onClick={() => setIsAddModalOpen(true)}>+ Add Replay</Button>
      </div>

      {/* Empty State */}
      {replays.length === 0 && (
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
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No replays yet
          </h3>
          <p className="text-gray-500 mb-6">
            Add your first replay to start tracking your battles
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            + Add Your First Replay
          </Button>
        </div>
      )}

      {/* Replays List */}
      {replays.length > 0 && (
        <div className="space-y-4">
          {replays.map((replay) => (
            <div key={replay.id} className="card hover:border-emerald-500 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      vs {replay.opponentName || 'Unknown'}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
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

                  {replay.notes && (
                    <p className="text-sm text-gray-400 mb-2">{replay.notes}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {replay.date
                        ? new Date(replay.date).toLocaleDateString()
                        : 'No date'}
                    </span>
                    {replay.replayUrl && (
                      <a
                        href={replay.replayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View Replay →
                      </a>
                    )}
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(replay.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Replay Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Replay"
        size="md"
      >
        <form onSubmit={handleAddReplay} className="space-y-4">
          <Input
            label="Showdown Replay URL"
            type="url"
            value={replayUrl}
            onChange={(e) => setReplayUrl(e.target.value)}
            placeholder="https://replay.pokemonshowdown.com/..."
            required
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this battle..."
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
              {loading ? 'Adding...' : 'Add Replay'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReplaysTab;
