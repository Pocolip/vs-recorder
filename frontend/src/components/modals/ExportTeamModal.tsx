import React, { useState, useEffect } from "react";
import { Copy, Check, Download } from "lucide-react";
import { Modal } from "../ui/modal";
import { exportApi } from "../../services/api/exportApi";
import type { Team, ExportOptions } from "../../types";

interface ExportTeamModalProps {
  isOpen: boolean;
  team: Team;
  onClose: () => void;
}

const ExportTeamModal: React.FC<ExportTeamModalProps> = ({ isOpen, team, onClose }) => {
  const [options, setOptions] = useState<ExportOptions & { includeTeamMembers?: boolean }>({
    includeReplays: true,
    includeReplayNotes: true,
    includeMatchNotes: true,
    includeOpponentPlans: true,
    includeTeamMembers: true,
  });
  const [exportData, setExportData] = useState<Record<string, any> | null>(null);
  const [shareCode, setShareCode] = useState<{ code: string; isExisting: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Fetch preview when modal opens or options change
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await exportApi.previewExport(team.id, options);
        if (!cancelled) setExportData(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to generate preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPreview();
    return () => { cancelled = true; };
  }, [isOpen, team.id, options]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setShareCode(null);
      setCopiedCode(false);
      setCopiedJson(false);
      setError(null);
    }
  }, [isOpen]);

  const toggleOption = (key: string) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    setShareCode(null);
  };

  const summary = exportData
    ? {
        replays: (exportData.replays as any[])?.length || 0,
        matches: (exportData.matches as any[])?.length || 0,
        opponentPlans: (exportData.opponentPlans as any[])?.length || 0,
        pokemonNotes: (exportData.team as any)?.teamMembers?.length || 0,
      }
    : null;

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    setError(null);
    try {
      const result = await exportApi.generateCode(team.id, options);
      setShareCode({ code: result.code, isExisting: result.isExisting });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate code";
      setError(msg.includes("Rate limit") ? "Daily limit reached (10 codes/day)." : msg);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!shareCode) return;
    await navigator.clipboard.writeText(shareCode.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyJson = async () => {
    if (!exportData) return;
    await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${team.name.replace(/[^a-z0-9]/gi, "_")}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const checkboxItems = [
    { key: "includeReplays", label: "Include Replays", indent: false },
    { key: "includeReplayNotes", label: "Include Replay Notes", indent: true, parent: "includeReplays" },
    { key: "includeMatchNotes", label: "Include Match Notes", indent: true, parent: "includeReplays" },
    { key: "includeOpponentPlans", label: "Include Opponent Plans", indent: false },
    { key: "includeTeamMembers", label: "Include Pokemon Notes", indent: false },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        Export Team
      </h2>

      <div className="space-y-5">
        {/* Options */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Options</span>
          {checkboxItems.map((item) => {
            const disabled = item.parent ? !options[item.parent as keyof typeof options] : false;
            return (
              <label
                key={item.key}
                className={`flex items-center gap-2.5 cursor-pointer ${item.indent ? "ml-6" : ""} ${disabled ? "opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={!!options[item.key as keyof typeof options]}
                  onChange={() => toggleOption(item.key)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              </label>
            );
          })}
        </div>

        {/* Summary */}
        {summary && !loading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">Summary</span>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Replays", value: summary.replays, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Matches", value: summary.matches, color: "text-blue-600 dark:text-blue-400" },
                { label: "Plans", value: summary.opponentPlans, color: "text-purple-600 dark:text-purple-400" },
                { label: "Notes", value: summary.pokemonNotes, color: "text-amber-600 dark:text-amber-400" },
              ].map((c) => (
                <div key={c.label}>
                  <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          </div>
        )}

        {/* Share Code Result */}
        {shareCode && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
            <span className="mb-2 block text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Share Code
            </span>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-white px-4 py-2.5 text-center font-mono text-xl tracking-widest text-emerald-600 dark:bg-gray-800 dark:text-emerald-400">
                {shareCode.code}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
              >
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedCode ? "Copied" : "Copy"}
              </button>
            </div>
            {shareCode.isExisting && (
              <p className="mt-1.5 text-xs text-emerald-600/70 dark:text-emerald-400/60">
                Using existing code (no changes since last export)
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            disabled={!exportData || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {copiedJson ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedJson ? "Copied" : "Copy JSON"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!exportData || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={!exportData || loading || generatingCode}
            className="ml-auto rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generatingCode ? "Generating..." : "Generate Share Code"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportTeamModal;
