// src/components/modals/EditPlanModal.jsx
import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info } from 'lucide-react';
import PokemonDropdown from '../PokemonDropdown';

/**
 * Modal for editing an existing plan (composition)
 * @param {Function} onClose - Callback to close the modal
 * @param {Function} onSubmit - Callback when plan is submitted (composition) => Promise<void>
 * @param {Array<string>} myTeamPokemon - Array of 6 Pokemon names from user's team
 * @param {Object} initialData - Initial composition data { lead1, lead2, back1, back2, notes }
 */
const EditPlanModal = ({ onClose, onSubmit, myTeamPokemon = [], initialData = {} }) => {
  const [formData, setFormData] = useState({
    lead1: initialData.lead1 || '',
    lead2: initialData.lead2 || '',
    back1: initialData.back1 || '',
    back2: initialData.back2 || '',
    notes: initialData.notes || '',
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

  const handlePokemonChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (error) setError('');
  };

  const handleNotesChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      notes: value,
    }));
  };

  // Validation
  const validatePlan = () => {
    const { lead1, lead2, back1, back2 } = formData;

    // Check all 4 Pokemon are selected
    if (!lead1 || !lead2 || !back1 || !back2) {
      return 'All 4 Pokemon must be selected (2 leads, 2 back)';
    }

    // Check for duplicates
    const selectedPokemon = [lead1, lead2, back1, back2];
    const uniquePokemon = new Set(selectedPokemon);
    if (uniquePokemon.size !== 4) {
      return 'Cannot select the same Pokemon twice. Each position must be unique.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const validationError = validatePlan();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const composition = {
        lead1: formData.lead1,
        lead2: formData.lead2,
        back1: formData.back1,
        back2: formData.back2,
        notes: formData.notes.trim() || '',
      };

      await onSubmit(composition);
      // Modal will be closed by parent component on success
    } catch (err) {
      setError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get available options for each dropdown (excluding already selected Pokemon)
  const getAvailableOptions = (currentField) => {
    const { lead1, lead2, back1, back2 } = formData;
    const currentValue = formData[currentField];
    const otherSelections = [
      currentField !== 'lead1' ? lead1 : null,
      currentField !== 'lead2' ? lead2 : null,
      currentField !== 'back1' ? back1 : null,
      currentField !== 'back2' ? back2 : null,
    ].filter(Boolean);

    // If no Pokemon in my team, return empty
    if (!myTeamPokemon || myTeamPokemon.length === 0) {
      return [];
    }

    // Return all options, but the dropdown will handle disabling selected ones
    return myTeamPokemon;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-gray-100">Edit Strategy Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Banner */}
          {myTeamPokemon.length === 0 ? (
            <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-yellow-200 text-sm">
                <p className="font-medium">No Pokemon available</p>
                <p className="text-yellow-300 mt-1">
                  Make sure your team has a valid Pokepaste URL to select Pokemon from.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-blue-200 text-sm">
                Update your strategy by changing Pokemon selections or notes. All 4 Pokemon must
                be unique.
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          )}

          {/* Lead Pokemon */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Lead Pokemon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PokemonDropdown
                label="Lead 1"
                options={getAvailableOptions('lead1')}
                value={formData.lead1}
                onChange={(value) => handlePokemonChange('lead1', value)}
                placeholder="Select lead 1"
                disabled={loading || myTeamPokemon.length === 0}
                required
              />
              <PokemonDropdown
                label="Lead 2"
                options={getAvailableOptions('lead2')}
                value={formData.lead2}
                onChange={(value) => handlePokemonChange('lead2', value)}
                placeholder="Select lead 2"
                disabled={loading || myTeamPokemon.length === 0}
                required
              />
            </div>
          </div>

          {/* Back Pokemon */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Back Pokemon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PokemonDropdown
                label="Back 1"
                options={getAvailableOptions('back1')}
                value={formData.back1}
                onChange={(value) => handlePokemonChange('back1', value)}
                placeholder="Select back 1"
                disabled={loading || myTeamPokemon.length === 0}
                required
              />
              <PokemonDropdown
                label="Back 2"
                options={getAvailableOptions('back2')}
                value={formData.back2}
                onChange={(value) => handlePokemonChange('back2', value)}
                placeholder="Select back 2"
                disabled={loading || myTeamPokemon.length === 0}
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Strategy Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Describe your strategy for this composition (e.g., 'Spore the Incineroar turn 1, protect Urshifu...')"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
              rows={4}
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Optional: Add notes about your strategy, turn 1 plays, win conditions, etc.
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
              disabled={loading || myTeamPokemon.length === 0}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlanModal;
