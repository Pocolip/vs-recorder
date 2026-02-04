// src/components/modals/AddOpponentTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import PokepasteService from '../../services/PokepasteService';

/**
 * Modal for adding a new opponent team
 * @param {Function} onClose - Callback to close the modal
 * @param {Function} onSubmit - Callback when team is submitted (data) => Promise<void>
 */
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

  const validatePasteUrl = (url) => {
    if (!url.trim()) return false;
    return PokepasteService.isValidPokepasteUrl(url.trim());
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
      setError('Pokepaste or Pokebin URL is required');
      return;
    }

    if (!validatePasteUrl(formData.pokepaste)) {
      setError('Please enter a valid Pokepaste or Pokebin URL (e.g., https://pokepast.es/abc123 or https://pokebin.com/abc123)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const teamData = {
        pokepaste: formData.pokepaste.trim(),
        notes: formData.notes.trim() || '',
      };

      await onSubmit(teamData);
      // Modal will be closed by parent component on success
    } catch (err) {
      setError(err.message || 'Failed to add matchup team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Use portal to render at document.body level, bypassing parent stacking contexts
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-gray-100">Add Matchup Team</h2>
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

          {/* Paste URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <LinkIcon className="h-4 w-4 inline mr-1" />
              Pokepaste / Pokebin URL *
            </label>
            <input
              type="url"
              value={formData.pokepaste}
              onChange={(e) => handleInputChange('pokepaste', e.target.value)}
              placeholder="https://pokepast.es/... or https://pokebin.com/..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Link to the matchup team on Pokepaste or Pokebin
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
              placeholder="Add player name, team notes, or playstyle observations..."
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
    </div>,
    document.body
  );
};

export default AddOpponentTeamModal;
