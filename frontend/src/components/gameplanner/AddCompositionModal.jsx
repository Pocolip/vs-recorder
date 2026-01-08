// src/components/gameplanner/AddCompositionModal.jsx
import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const AddCompositionModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    lead1: '',
    lead2: '',
    back1: '',
    back2: '',
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
    if (!formData.lead1.trim() || !formData.lead2.trim()) {
      setError('Both lead Pokemon are required');
      return;
    }

    if (!formData.back1.trim() || !formData.back2.trim()) {
      setError('Both back Pokemon are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const composition = {
        lead1: formData.lead1.trim(),
        lead2: formData.lead2.trim(),
        back1: formData.back1.trim(),
        back2: formData.back2.trim(),
        notes: formData.notes.trim() || null,
      };

      await onSubmit(composition);
      // Modal will be closed by parent component on success
    } catch (err) {
      setError(err.message || 'Failed to add composition. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-gray-100">Add Strategy</h2>
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

          <div className="grid grid-cols-2 gap-4">
            {/* Lead Pokemon */}
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Lead Pokemon</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Lead 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.lead1}
                    onChange={(e) => handleInputChange('lead1', e.target.value)}
                    placeholder="e.g., Urshifu-Rapid-Strike"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Lead 2 *
                  </label>
                  <input
                    type="text"
                    value={formData.lead2}
                    onChange={(e) => handleInputChange('lead2', e.target.value)}
                    placeholder="e.g., Rillaboom"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Back Pokemon */}
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Back Pokemon</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Back 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.back1}
                    onChange={(e) => handleInputChange('back1', e.target.value)}
                    placeholder="e.g., Incineroar"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Back 2 *
                  </label>
                  <input
                    type="text"
                    value={formData.back2}
                    onChange={(e) => handleInputChange('back2', e.target.value)}
                    placeholder="e.g., Calyrex-Shadow"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Optional notes about this composition..."
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                rows={3}
                disabled={loading}
              />
            </div>
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
              {loading ? 'Adding...' : 'Add Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompositionModal;
