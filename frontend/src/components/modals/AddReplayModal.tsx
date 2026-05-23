import React, { useState, useEffect } from "react";
import {
  Link as LinkIcon,
  Plus,
  AlertCircle,
  FileText,
  Copy,
  Check,
  ArrowLeft,
  Download,
  HelpCircle,
} from "lucide-react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import PokemonTeam from "../pokemon/PokemonTeam";
import * as replayService from "../../services/replayService";
import { resolveAnalyticsKey } from "../../utils/pokemonNameUtils";

interface AddReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  teamId: number;
}

const REPLAY_URL_PATTERN = /^https?:\/\/replay\.pokemonshowdown\.com\/.+$/;

/**
 * A bucket of replays that share the same team-of-six (or the catch-all bucket of
 * replays whose side couldn't be identified). `unidentified` rows have no meaningful
 * representative team and only ever get a copy action.
 */
interface TeamGroup {
  key: string;
  teamNames: string[];
  urls: string[];
  matchesTeam: boolean;
  unidentified: boolean;
}

const UNIDENTIFIED_KEY = "__unidentified__";

/**
 * Group previews by the team-of-six the owner ran (collapsing forme noise via
 * resolveAnalyticsKey so the same team always lands together). Mirrors sort_replays.py:
 * the active team's group is pinned first, then remaining groups by replay count desc,
 * with the unidentified bucket last.
 */
function buildGroups(previews: replayService.ReplayPreview[]): TeamGroup[] {
  const byKey = new Map<string, TeamGroup>();

  for (const preview of previews) {
    if (!preview.identified) {
      const existing = byKey.get(UNIDENTIFIED_KEY);
      if (existing) {
        existing.urls.push(preview.url);
      } else {
        byKey.set(UNIDENTIFIED_KEY, {
          key: UNIDENTIFIED_KEY,
          teamNames: [],
          urls: [preview.url],
          matchesTeam: false,
          unidentified: true,
        });
      }
      continue;
    }

    const key = (preview.userTeam || [])
      .map((name) => resolveAnalyticsKey(name))
      .sort()
      .join("|");

    const existing = byKey.get(key);
    if (existing) {
      existing.urls.push(preview.url);
      existing.matchesTeam = existing.matchesTeam || preview.matchesTeam;
    } else {
      byKey.set(key, {
        key,
        teamNames: preview.userTeam || [],
        urls: [preview.url],
        matchesTeam: preview.matchesTeam,
        unidentified: false,
      });
    }
  }

  const groups = Array.from(byKey.values());
  groups.sort((a, b) => {
    // Unidentified bucket always last.
    if (a.unidentified !== b.unidentified) return a.unidentified ? 1 : -1;
    // Matching team pinned to the top.
    if (a.matchesTeam !== b.matchesTeam) return a.matchesTeam ? -1 : 1;
    // Otherwise by replay count descending.
    return b.urls.length - a.urls.length;
  });
  return groups;
}

const AddReplayModal: React.FC<AddReplayModalProps> = ({
  isOpen,
  onClose,
  onAdded,
  teamId,
}) => {
  const [replayUrl, setReplayUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [markReviewed, setMarkReviewed] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Bulk preview/grouping step
  const [bulkPhase, setBulkPhase] = useState<"input" | "preview">("input");
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const resetState = () => {
    setReplayUrl("");
    setNotes("");
    setMarkReviewed(false);
    setBulkMode(false);
    setBulkUrls("");
    setError("");
    setProgress(null);
    setBulkPhase("input");
    setGroups([]);
    setFailedCount(0);
    setCopiedKey(null);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetState();
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
      await replayService.createFromUrl(teamId, cleanUrl, notes.trim() || undefined, markReviewed);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add replay. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of bulk import: parse (without saving) and group by team.
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
      const result = await replayService.previewManyFromUrls(
        teamId,
        cleanUrls,
        (current, total) => setProgress({ current, total })
      );

      if (result.previews.length === 0) {
        setError(
          result.failed.length > 0
            ? `Couldn't load any replays: ${result.failed[0].error}`
            : "No replays could be parsed."
        );
        return;
      }

      setGroups(buildGroups(result.previews));
      setFailedCount(result.failed.length);
      setBulkPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse replays. Please try again.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleCopyGroup = async (group: TeamGroup) => {
    try {
      await navigator.clipboard.writeText(group.urls.join("\n"));
      setCopiedKey(group.key);
      setTimeout(() => setCopiedKey((k) => (k === group.key ? null : k)), 2000);
    } catch (err) {
      console.error("Failed to copy replay URLs:", err);
    }
  };

  // Step 2 of bulk import: actually persist the chosen group.
  const handleImportGroup = async (group: TeamGroup) => {
    try {
      setLoading(true);
      setError("");

      const result = await replayService.createManyFromUrls(
        teamId,
        group.urls,
        (current, total) => setProgress({ current, total }),
        markReviewed
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

  const hasMatchingGroup = groups.some((g) => g.matchesTeam);

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

          {/* Mark as reviewed */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={markReviewed}
                onChange={(e) => setMarkReviewed(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800"
              />
              Mark as reviewed
            </label>
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
      ) : bulkPhase === "input" ? (
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
                  We'll parse each replay and group them by the team you ran, so you can
                  import only the group that belongs to this team (and copy the others).
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          {progress && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Parsing {progress.current} of {progress.total}...
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
                  Parsing Replays...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Sort by Team
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Bulk preview: grouped teams */
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {groups.filter((g) => !g.unidentified).length} team
              {groups.filter((g) => !g.unidentified).length === 1 ? "" : "s"} across your replays.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={markReviewed}
                onChange={(e) => setMarkReviewed(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800"
              />
              Mark as reviewed
            </label>
          </div>

          {!hasMatchingGroup && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                None of these groups match this team's roster. You can copy any group to use
                elsewhere.
              </p>
            </div>
          )}

          <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div
                key={group.key}
                className={`rounded-lg border p-3 ${
                  group.matchesTeam
                    ? "border-brand-400 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {group.unidentified ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <HelpCircle className="h-4 w-4 shrink-0" />
                      <span>Unidentified ({group.urls.length})</span>
                    </div>
                  ) : (
                    <PokemonTeam pokemonNames={group.teamNames} size="sm" />
                  )}

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyGroup(group)}
                      disabled={loading}
                      title="Copy these replay URLs"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {copiedKey === group.key ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                    {group.matchesTeam && (
                      <button
                        type="button"
                        onClick={() => handleImportGroup(group)}
                        disabled={loading}
                        title="Import these replays into this team"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Import
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {group.urls.length} replay{group.urls.length === 1 ? "" : "s"}
                  {group.matchesTeam ? " · matches this team" : ""}
                </p>
              </div>
            ))}
          </div>

          {failedCount > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {failedCount} replay{failedCount === 1 ? "" : "s"} failed to load and were skipped.
            </p>
          )}

          {/* Progress */}
          {progress && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Importing {progress.current} of {progress.total}...
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
          <div className="flex justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setBulkPhase("input");
                setError("");
                setProgress(null);
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AddReplayModal;
