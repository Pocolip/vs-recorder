import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../ui/modal";
import { exportApi } from "../../services/api/exportApi";
import PokemonTeam from "../pokemon/PokemonTeam";

interface ImportTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Tab = "code" | "json";

interface PreviewData {
  teamName: string;
  pokepaste?: string;
  replays: number;
  matches: number;
  opponentPlans: number;
  pokemonNotes: number;
}

function extractPreview(data: Record<string, any>): PreviewData {
  const team = data.team || data;
  return {
    teamName: team.name || data.teamName || "Unknown Team",
    pokepaste: team.pokepaste || data.pokepaste,
    replays: data.replays?.length || 0,
    matches: data.matches?.length || 0,
    opponentPlans: data.opponentPlans?.length || 0,
    pokemonNotes: team.teamMembers?.length || 0,
  };
}

function PreviewPanel({ data }: { data: PreviewData }) {
  const counts = [
    { label: "Replays", value: data.replays, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Matches", value: data.matches, color: "text-blue-600 dark:text-blue-400" },
    { label: "Plans", value: data.opponentPlans, color: "text-purple-600 dark:text-purple-400" },
    { label: "Notes", value: data.pokemonNotes, color: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <p className="mb-3 font-medium text-gray-800 dark:text-white/90">
        {data.teamName}
      </p>
      {data.pokepaste && (
        <div className="mb-3">
          <PokemonTeam pokepasteUrl={data.pokepaste} size="sm" />
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 text-center">
        {counts.map((c) => (
          <div key={c.label}>
            <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ImportTeamModal: React.FC<ImportTeamModalProps> = ({ isOpen, onClose, onImported }) => {
  const [tab, setTab] = useState<Tab>("code");

  // Share code state
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // JSON state
  const [jsonText, setJsonText] = useState("");
  const [jsonPreview, setJsonPreview] = useState<PreviewData | null>(null);
  const [jsonValidating, setJsonValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab("code");
      setCode("");
      setPreview(null);
      setPreviewing(false);
      setJsonText("");
      setJsonPreview(null);
      setJsonValidating(false);
      setImporting(false);
      setError(null);
    }
  }, [isOpen]);

  // Reset state when switching tabs
  useEffect(() => {
    setError(null);
    setPreview(null);
    setJsonPreview(null);
  }, [tab]);

  const handlePreview = async () => {
    if (!code.trim()) return;
    setPreviewing(true);
    setError(null);
    setPreview(null);

    try {
      const data = await exportApi.getByCode(code.trim());
      setPreview(extractPreview(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid share code");
    } finally {
      setPreviewing(false);
    }
  };

  const handleImportCode = async () => {
    if (!code.trim()) return;
    setImporting(true);
    setError(null);

    try {
      const result = await exportApi.importFromCode(code.trim());
      if (result.teamId) {
        onImported();
        onClose();
      } else {
        setError(result.error || "Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setJsonPreview(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setJsonText(evt.target?.result as string);
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleValidateJson = () => {
    if (!jsonText.trim()) return;
    setJsonValidating(true);
    setError(null);
    setJsonPreview(null);

    try {
      const parsed = JSON.parse(jsonText.trim());
      if (!parsed.team && !parsed.name && !parsed.teamName) {
        setError("Invalid export format: missing team data");
        return;
      }
      setJsonPreview(extractPreview(parsed));
    } catch {
      setError("Invalid JSON format");
    } finally {
      setJsonValidating(false);
    }
  };

  const handleImportJson = async () => {
    if (!jsonText.trim()) return;
    setImporting(true);
    setError(null);

    try {
      const result = await exportApi.importFromJson(jsonText.trim());
      if (result.teamId) {
        onImported();
        onClose();
      } else {
        setError(result.error || "Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import JSON");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        Import Team
      </h2>

      {/* Tab Toggle */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setTab("code")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "code"
              ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Share Code
        </button>
        <button
          type="button"
          onClick={() => setTab("json")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "json"
              ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          JSON
        </button>
      </div>

      {/* Share Code Tab */}
      {tab === "code" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                setPreview(null);
              }}
              placeholder="Enter share code..."
              maxLength={6}
              className="h-11 flex-1 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm uppercase shadow-theme-xs placeholder:normal-case placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <button
              type="button"
              onClick={handlePreview}
              disabled={code.length !== 6 || previewing}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {previewing ? "Loading..." : "Preview"}
            </button>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Enter the 6-character code shared by another user
          </p>

          {preview && <PreviewPanel data={preview} />}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportCode}
              disabled={!code.trim() || importing}
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      )}

      {/* JSON Tab */}
      {tab === "json" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                Paste JSON
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                or load from file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonPreview(null);
              }}
              placeholder='{"version": "1.0", "team": {...}}'
              rows={6}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 font-mono text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <button
            type="button"
            onClick={handleValidateJson}
            disabled={!jsonText.trim() || jsonValidating}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {jsonValidating ? "Validating..." : "Validate"}
          </button>

          {jsonPreview && <PreviewPanel data={jsonPreview} />}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportJson}
              disabled={!jsonPreview || importing}
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      )}
    </Modal>
  );
};

export default ImportTeamModal;
