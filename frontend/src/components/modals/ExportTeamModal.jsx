// src/components/modals/ExportTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Copy, Share2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { exportApi } from '../../services/api';

/**
 * Modal for exporting a team with share code generation
 * @param {Object} team - The team to export
 * @param {Function} onClose - Callback to close the modal
 */
const ExportTeamModal = ({ team, onClose }) => {
  const [options, setOptions] = useState({
    includeReplays: true,
    includeReplayNotes: true,
    includeMatchNotes: true,
    includeOpponentPlans: true,
    includeTeamMembers: true,
  });
  const [exportData, setExportData] = useState(null);
  const [shareCode, setShareCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Preview export when options change
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await exportApi.previewExport(team.id, options);
        setExportData(data);
      } catch (err) {
        setError(err.message || 'Failed to generate export preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [team.id, options]);

  const handleOptionChange = (option) => {
    setOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
    // Reset share code when options change
    setShareCode(null);
  };

  const handleGenerateCode = async () => {
    try {
      setGeneratingCode(true);
      setError('');
      const result = await exportApi.generateCode(team.id, options);
      setShareCode(result);
    } catch (err) {
      if (err.message?.includes('Rate limit')) {
        setError('Daily limit reached. You can generate up to 10 share codes per day.');
      } else {
        setError(err.message || 'Failed to generate share code');
      }
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!shareCode?.code) return;
    try {
      await navigator.clipboard.writeText(shareCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareCode.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyJson = async () => {
    if (!exportData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(exportData, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getExportSummary = () => {
    if (!exportData) return null;
    return {
      replays: exportData.replays?.length || 0,
      matches: exportData.matches?.length || 0,
      opponentPlans: exportData.opponentPlans?.length || 0,
      teamMembers: exportData.team?.teamMembers?.length || 0,
    };
  };

  const summary = getExportSummary();

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-emerald-400" />
            Export Team
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          )}

          {/* Export Options */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Export Options</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeReplays}
                  onChange={() => handleOptionChange('includeReplays')}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-gray-300">Include Replays</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={options.includeReplayNotes}
                  onChange={() => handleOptionChange('includeReplayNotes')}
                  disabled={!options.includeReplays}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className={`${options.includeReplays ? 'text-gray-300' : 'text-gray-500'}`}>
                  Include Replay Notes
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={options.includeMatchNotes}
                  onChange={() => handleOptionChange('includeMatchNotes')}
                  disabled={!options.includeReplays}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className={`${options.includeReplays ? 'text-gray-300' : 'text-gray-500'}`}>
                  Include Match Notes
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeOpponentPlans}
                  onChange={() => handleOptionChange('includeOpponentPlans')}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-gray-300">Include Opponent Plans</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeTeamMembers}
                  onChange={() => handleOptionChange('includeTeamMembers')}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-gray-300">Include Pokemon Notes & Calcs</span>
              </label>
            </div>
          </div>

          {/* Export Summary */}
          {summary && !loading && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Export Summary</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{summary.replays}</div>
                  <div className="text-xs text-gray-400">Replays</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{summary.matches}</div>
                  <div className="text-xs text-gray-400">Matches</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{summary.opponentPlans}</div>
                  <div className="text-xs text-gray-400">Opponent Plans</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-400">{summary.teamMembers}</div>
                  <div className="text-xs text-gray-400">Pokemon Notes</div>
                </div>
              </div>
            </div>
          )}

          {/* Share Code Section */}
          {shareCode && (
            <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-emerald-300 mb-3">Share Code Generated!</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-900 rounded-lg px-4 py-3 font-mono text-2xl text-center text-emerald-400 tracking-widest">
                  {shareCode.code}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              {shareCode.isExisting && (
                <p className="text-xs text-emerald-300/70 mt-2">
                  Using existing code (no changes since last export)
                </p>
              )}
            </div>
          )}

          {/* JSON Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">JSON Preview</h3>
              <button
                onClick={handleCopyJson}
                className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
                disabled={!exportData}
              >
                {copiedJson ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 max-h-48 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                  {exportData ? JSON.stringify(exportData, null, 2).slice(0, 2000) : 'No data'}
                  {exportData && JSON.stringify(exportData, null, 2).length > 2000 && '...'}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={!exportData || loading}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download JSON
          </button>
          <button
            onClick={handleGenerateCode}
            disabled={!exportData || loading || generatingCode}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {generatingCode ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Generate Share Code
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExportTeamModal;
