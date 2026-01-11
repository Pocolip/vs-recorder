// src/components/modals/ImportTeamModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, AlertCircle, Check, Loader2, Download } from 'lucide-react';
import { exportApi } from '../../services/api';

/**
 * Modal for importing a team from share code or JSON
 * @param {Function} onClose - Callback to close the modal
 * @param {Function} onImportSuccess - Callback when import succeeds (teamId, teamName)
 */
const ImportTeamModal = ({ onClose, onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState('code'); // 'code' or 'file'
  const [shareCode, setShareCode] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Reset state when switching tabs
  useEffect(() => {
    setPreviewData(null);
    setError('');
  }, [activeTab]);

  const handleCodeChange = (e) => {
    // Auto-uppercase and limit to 6 chars
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setShareCode(value);
    setPreviewData(null);
    setError('');
  };

  const handlePreviewCode = async () => {
    if (shareCode.length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await exportApi.getByCode(shareCode);
      setPreviewData(data);
    } catch (err) {
      setError(err.message || 'Invalid or expired share code');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        setJsonText(content);
        // Try to parse and preview
        const data = JSON.parse(content);
        setPreviewData(data);
        setError('');
      } catch (err) {
        setError('Invalid JSON file');
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleJsonTextChange = (e) => {
    const text = e.target.value;
    setJsonText(text);
    setPreviewData(null);
    setError('');
  };

  const handlePreviewJson = () => {
    if (!jsonText.trim()) {
      setError('Please enter or upload JSON data');
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      if (!data.team || !data.team.name) {
        setError('Invalid export format: missing team data');
        return;
      }
      setPreviewData(data);
      setError('');
    } catch (err) {
      setError('Invalid JSON format');
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError('');

      let result;
      if (activeTab === 'code') {
        result = await exportApi.importFromCode(shareCode);
      } else {
        result = await exportApi.importFromJson(jsonText);
      }

      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join(', '));
        return;
      }

      // Success
      if (onImportSuccess) {
        onImportSuccess(result.teamId, result.teamName);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to import team');
    } finally {
      setImporting(false);
    }
  };

  const getPreviewSummary = () => {
    if (!previewData) return null;
    return {
      teamName: previewData.team?.name || 'Unknown',
      replays: previewData.replays?.length || 0,
      matches: previewData.matches?.length || 0,
      opponentPlans: previewData.opponentPlans?.length || 0,
    };
  };

  const summary = getPreviewSummary();

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-400" />
            Import Team
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'code'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-700/50'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Share Code
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'file'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-700/50'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            JSON File
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          )}

          {activeTab === 'code' ? (
            <>
              {/* Share Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter Share Code
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={shareCode}
                    onChange={handleCodeChange}
                    placeholder="ABC123"
                    maxLength={6}
                    className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-xl tracking-widest text-center uppercase focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={handlePreviewCode}
                    disabled={shareCode.length !== 6 || loading}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Preview'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Enter the 6-character code shared by another user
                </p>
              </div>
            </>
          ) : (
            <>
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload JSON File
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-8 border-2 border-dashed border-slate-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-slate-500 transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8" />
                  <span>Click to upload JSON file</span>
                </button>
              </div>

              {/* Or paste JSON */}
              <div className="text-center text-gray-500 text-sm">or paste JSON below</div>

              <div>
                <textarea
                  value={jsonText}
                  onChange={handleJsonTextChange}
                  placeholder='{"version": "1.0", "team": {...}}'
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-emerald-400 h-32 resize-none"
                />
                <button
                  onClick={handlePreviewJson}
                  disabled={!jsonText.trim() || loading}
                  className="mt-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Validate & Preview
                </button>
              </div>
            </>
          )}

          {/* Preview */}
          {summary && (
            <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-emerald-300">Ready to Import</h3>
              </div>
              <div className="text-lg font-semibold text-gray-100 mb-3">
                {summary.teamName}
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-emerald-400">{summary.replays}</div>
                  <div className="text-xs text-gray-400">Replays</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-400">{summary.matches}</div>
                  <div className="text-xs text-gray-400">Matches</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-400">{summary.opponentPlans}</div>
                  <div className="text-xs text-gray-400">Opponent Plans</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!previewData || importing}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Import Team
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImportTeamModal;
