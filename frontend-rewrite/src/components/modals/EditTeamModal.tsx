import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import TagInput from "../form/TagInput";
import PokemonTeam from "../pokemon/PokemonTeam";
import { teamApi } from "../../services/api/teamApi";
import { teamMemberApi } from "../../services/api/teamMemberApi";
import * as pokepasteService from "../../services/pokepasteService";
import { cleanPokemonName } from "../../utils/pokemonNameUtils";
import type { Team } from "../../types";

interface EditTeamModalProps {
  isOpen: boolean;
  team: Team;
  onClose: () => void;
  onUpdated: (updatedTeam: Team) => void;
}

interface PendingWarning {
  added: string[];
  removed: string[];
}

const REGULATIONS = [
  "VGC 2025 Regulation H",
  "VGC 2025 Regulation G",
  "VGC 2025 Regulation F",
  "VGC 2025 Regulation E",
  "VGC 2025 Regulation D",
  "VGC 2025 Regulation C",
  "VGC 2025 Regulation B",
  "VGC 2025 Regulation A",
];

const EditTeamModal: React.FC<EditTeamModalProps> = ({ isOpen, team, onClose, onUpdated }) => {
  const [name, setName] = useState("");
  const [pokepaste, setPokepaste] = useState("");
  const [regulation, setRegulation] = useState("");
  const [showdownUsernames, setShowdownUsernames] = useState<string[]>([]);
  const [previewNames, setPreviewNames] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingWarning, setPendingWarning] = useState<PendingWarning | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Populate form when modal opens or team changes
  useEffect(() => {
    if (isOpen && team) {
      setName(team.name);
      setPokepaste(team.pokepaste || "");
      setRegulation(team.regulation || "");
      setShowdownUsernames(team.showdownUsernames || []);
      setPreviewNames(null);
      setError(null);
      setPendingWarning(null);
    }
  }, [isOpen, team]);

  // Debounced pokepaste preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!pokepaste || !pokepasteService.isValidPokepasteUrl(pokepaste)) {
      setPreviewNames(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const names = await pokepasteService.getPokemonNames(pokepaste, 6);
        setPreviewNames(names);
      } catch {
        setPreviewNames(null);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pokepaste]);

  const isValidUrl = pokepaste === "" || pokepasteService.isValidPokepasteUrl(pokepaste);

  const saveAndSync = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const updated = await teamApi.update(team.id, {
        name: name.trim(),
        pokepaste: pokepaste.trim(),
        regulation,
        showdownUsernames,
      });

      // Sync members if pokepaste changed
      if (pokepaste.trim() !== (team.pokepaste || "")) {
        await teamMemberApi.sync(team.id);
      }

      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (pokepaste && !pokepasteService.isValidPokepasteUrl(pokepaste)) return;

    const pokepasteChanged = pokepaste.trim() !== (team.pokepaste || "");

    if (!pokepasteChanged) {
      // No pokepaste change — save normally without sync
      setSubmitting(true);
      setError(null);
      try {
        const updated = await teamApi.update(team.id, {
          name: name.trim(),
          pokepaste: pokepaste.trim(),
          regulation,
          showdownUsernames,
        });
        onUpdated(updated);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update team");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Pokepaste changed — check for roster mismatch
    setSubmitting(true);
    setError(null);

    try {
      const [currentMembers, newNames] = await Promise.all([
        teamMemberApi.getByTeamId(team.id),
        pokepasteService.getPokemonNames(pokepaste.trim(), 6),
      ]);

      // If no existing members (backfill scenario), skip warning
      if (currentMembers.length === 0) {
        await saveAndSync();
        return;
      }

      // Normalize both sets for comparison
      const currentSet = new Set(currentMembers.map((m) => cleanPokemonName(m.pokemonName)));
      const newSet = new Set(newNames.map((n) => cleanPokemonName(n)));

      const added = newNames.filter((n) => !currentSet.has(cleanPokemonName(n)));
      const removed = currentMembers
        .map((m) => m.pokemonName)
        .filter((n) => !newSet.has(cleanPokemonName(n)));

      if (added.length === 0 && removed.length === 0) {
        // Same Pokemon (possibly different order/moves) — save + sync without warning
        await saveAndSync();
        return;
      }

      // Show warning
      setPendingWarning({ added, removed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check pokepaste changes");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSync = async () => {
    await saveAndSync();
    setPendingWarning(null);
  };

  const handleCancelWarning = () => {
    setPendingWarning(null);
  };

  const canSubmit = name.trim() && !submitting && isValidUrl;

  // Warning step
  if (pendingWarning) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Team Roster Changed
          </h2>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          The new pokepaste has different Pokemon. Syncing will update your team members:
        </p>

        <div className="space-y-3 mb-6">
          {pendingWarning.removed.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                Removed — notes & calcs will be deleted
              </p>
              {pendingWarning.removed.map((name) => (
                <span
                  key={name}
                  className="mr-2 inline-block rounded bg-red-100 px-2 py-0.5 text-sm text-red-800 dark:bg-red-500/20 dark:text-red-300"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          {pendingWarning.added.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-500/30 dark:bg-green-500/10">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                Added
              </p>
              {pendingWarning.added.map((name) => (
                <span
                  key={name}
                  className="mr-2 inline-block rounded bg-green-100 px-2 py-0.5 text-sm text-green-800 dark:bg-green-500/20 dark:text-green-300"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancelWarning}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSync}
            disabled={submitting}
            className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Confirm & Save"}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        Edit Team
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Team Name */}
        <div>
          <Label htmlFor="edit-team-name">Team Name</Label>
          <input
            id="edit-team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Team"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>

        {/* Pokepaste URL */}
        <div>
          <Label htmlFor="edit-pokepaste-url">Pokepaste URL</Label>
          <input
            id="edit-pokepaste-url"
            type="text"
            value={pokepaste}
            onChange={(e) => setPokepaste(e.target.value)}
            placeholder="https://pokepast.es/..."
            className={`h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 ${
              !isValidUrl
                ? "border-red-400 focus:border-red-400 focus:ring-red-500/10 dark:border-red-500"
                : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
            }`}
          />
          {!isValidUrl && (
            <p className="mt-1 text-xs text-red-500">Enter a valid pokepast.es or pokebin.com URL</p>
          )}
          {previewNames && previewNames.length > 0 && (
            <div className="mt-3">
              <PokemonTeam pokemonNames={previewNames} size="sm" />
            </div>
          )}
        </div>

        {/* Regulation */}
        <div>
          <Label htmlFor="edit-regulation">Regulation</Label>
          <div className="relative">
            <select
              id="edit-regulation"
              value={regulation}
              onChange={(e) => setRegulation(e.target.value)}
              className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800 ${
                regulation ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400"
              }`}
            >
              <option value="">Select regulation (optional)</option>
              {REGULATIONS.map((reg) => (
                <option key={reg} value={reg} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  {reg}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Showdown Usernames */}
        <div>
          <Label>Showdown Usernames</Label>
          <TagInput
            tags={showdownUsernames}
            onTagsChange={setShowdownUsernames}
            placeholder="Type a username and press Enter..."
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Press Enter after each username to add it.</p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTeamModal;
