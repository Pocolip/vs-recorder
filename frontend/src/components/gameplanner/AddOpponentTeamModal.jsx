// src/components/gameplanner/AddOpponentTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, AlertCircle } from 'lucide-react';

const AddOpponentTeamModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    pokepaste: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const validatePokepasteUrl = (url) => {
    if (!url.trim()) return false;
    const pokepastePattern = /^https?:\/\/(www\.)?pokepast\.es\/[a-zA-Z0-9]+\/?$/;
    return pokepastePattern.test(url.trim());
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.pokepaste.trim()) {
      setError('Pokepaste URL is required');
      return;
    }

    if (!validatePokepasteUrl(formData.pokepaste)) {
      setError('Please enter a valid Pokepaste URL (e.g., https://pokepast.es/abc123)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const teamData = {
        pokepaste: formData.pokepaste.trim(),
        notes: formData.notes.trim() || null,
      };

      await onSubmit(teamData);
      // Modal will be closed by parent component on success
    } catch (err) {
      setError(err.message || 'Failed to add opponent team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-gray-100">Add Opponent Team</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          )}

          {/* Pokepaste URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <LinkIcon className="h-4 w-4 inline mr-1" />
              Pokepaste URL *
            </label>
            <input
              type="url"
              value={formData.pokepaste}
              onChange={(e) => handleInputChange('pokepaste', e.target.value)}
              placeholder="https://pokepast.es/..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Link to the opponent's team on Pokepaste
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add opponent's name, team notes, or playstyle observations..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
              rows={4}
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Tip: Start with the player's name for easy identification
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOpponentTeamModal;
