import React, { useState, useEffect } from "react";
import { Link as LinkIcon, Plus, AlertCircle, FileText } from "lucide-react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import * as replayService from "../../services/replayService";

interface AddReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  teamId: number;
}

const REPLAY_URL_PATTERN = /^https?:\/\/replay\.pokemonshowdown\.com\/.+$/;

const AddReplayModal: React.FC<AddReplayModalProps> = ({
  isOpen,
  onClose,
  onAdded,
  teamId,
}) => {
  const [replayUrl, setReplayUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReplayUrl("");
      setNotes("");
      setBulkMode(false);
      setBulkUrls("");
      setError("");
      setProgress(null);
    }
  }, [isOpen]);

  const validateReplayUrl = (url: string) => {
    return REPLAY_URL_PATTERN.test(url.trim());
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUrl = replayUrl.trim();
    if (!trimmedUrl) {
      setError("Please enter a replay URL");
      return;
    }

    if (!validateReplayUrl(trimmedUrl)) {
      setError("Please enter a valid Pokemon Showdown replay URL");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const cleanUrl = trimmedUrl.split("?")[0];
      await replayService.createFromUrl(teamId, cleanUrl, notes.trim() || undefined);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add replay. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const urls = bulkUrls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url);

    if (urls.length === 0) {
      setError("Please enter at least one replay URL");
      return;
    }

    const invalidUrls = urls.filter((url) => !validateReplayUrl(url));
    if (invalidUrls.length > 0) {
      setError(
        `Invalid URLs found: ${invalidUrls.slice(0, 3).join(", ")}${invalidUrls.length > 3 ? "..." : ""}`
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const cleanUrls = urls.map((url) => url.split("?")[0]);
      const result = await replayService.createManyFromUrls(
        teamId,
        cleanUrls,
        (current, total) => setProgress({ current, total })
      );

      if (result.failed.length > 0) {
        setError(
          `${result.success.length} added, ${result.failed.length} failed: ${result.failed[0].error}`
        );
        onAdded();
      } else {
        onAdded();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import replays. Please try again.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        Add Replay
      </h2>

      {/* Mode Toggle */}
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setBulkMode(false);
            setError("");
          }}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            !bulkMode
              ? "bg-brand-500 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          Single Replay
        </button>
        <button
          type="button"
          onClick={() => {
            setBulkMode(true);
            setError("");
          }}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            bulkMode
              ? "bg-brand-500 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
        >
          <Plus className="h-4 w-4" />
          Bulk Import
        </button>
      </div>

      {!bulkMode ? (
        <form onSubmit={handleSingleSubmit} className="space-y-5">
          {/* URL Input */}
          <div>
            <Label htmlFor="replay-url">Replay URL</Label>
            <input
              id="replay-url"
              type="url"
              value={replayUrl}
              onChange={(e) => {
                setReplayUrl(e.target.value);
                setError("");
              }}
              placeholder="https://replay.pokemonshowdown.com/..."
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Paste the URL from a Pokemon Showdown replay page
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="replay-notes">Notes (optional)</Label>
            <textarea
              id="replay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this game..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !replayUrl.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Adding Replay...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Replay
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-5">
          {/* Bulk URLs */}
          <div>
            <Label htmlFor="bulk-urls">Replay URLs</Label>
            <textarea
              id="bulk-urls"
              value={bulkUrls}
              onChange={(e) => {
                setBulkUrls(e.target.value);
                setError("");
              }}
              placeholder={`https://replay.pokemonshowdown.com/game1\nhttps://replay.pokemonshowdown.com/game2\nhttps://replay.pokemonshowdown.com/game3`}
              rows={8}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 font-mono text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Enter one replay URL per line
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-400">Bulk Import</p>
                <p className="mt-1 text-blue-600 dark:text-gray-300">
                  This will import multiple replays at once. Each replay will be processed
                  individually, so if some fail, others may still succeed.
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          {progress && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processing {progress.current} of {progress.total}...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !bulkUrls.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importing Replays...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Import All
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AddReplayModal;
