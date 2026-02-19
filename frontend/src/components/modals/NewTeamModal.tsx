import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import TagInput from "../form/TagInput";
import PokemonTeam from "../pokemon/PokemonTeam";
import { teamApi } from "../../services/api/teamApi";
import * as pokepasteService from "../../services/pokepasteService";

interface NewTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const REGULATIONS = [
  "VGC 2025 Regulation J",
  "VGC 2025 Regulation I",
  "VGC 2025 Regulation H",
  "VGC 2025 Regulation G",
  "VGC 2025 Regulation F",
  "VGC 2025 Regulation E",
  "VGC 2025 Regulation D",
  "VGC 2025 Regulation C",
  "VGC 2025 Regulation B",
  "VGC 2025 Regulation A",
];



const NewTeamModal: React.FC<NewTeamModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [pokepaste, setPokepaste] = useState("");
  const [regulation, setRegulation] = useState("");
  const [showdownUsernames, setShowdownUsernames] = useState<string[]>([]);
  const [previewNames, setPreviewNames] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setPokepaste("");
      setRegulation("");
      setShowdownUsernames([]);
      setPreviewNames(null);
      setError(null);
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pokepaste.trim() || !pokepasteService.isValidPokepasteUrl(pokepaste) || showdownUsernames.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      await teamApi.create({
        name: name.trim(),
        pokepaste: pokepaste.trim(),
        regulation: regulation || undefined,
        showdownUsernames: showdownUsernames.length > 0 ? showdownUsernames : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim() && pokepaste.trim() && pokepasteService.isValidPokepasteUrl(pokepaste) && showdownUsernames.length > 0 && !submitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        New Team
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Team Name */}
        <div>
          <Label htmlFor="team-name">Team Name</Label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Team"
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>

        {/* Pokepaste URL */}
        <div>
          <Label htmlFor="pokepaste-url">Pokepaste URL</Label>
          <input
            id="pokepaste-url"
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
          <Label htmlFor="regulation">Regulation</Label>
          <div className="relative">
            <select
              id="regulation"
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
          <Label>
            Showdown Usernames <span className="text-red-500">*</span>
          </Label>
          <TagInput
            tags={showdownUsernames}
            onTagsChange={setShowdownUsernames}
            placeholder="Type a username and press Enter..."
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Required — we use these to identify your side in replays. Press Enter after each username.
          </p>
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
            {submitting ? "Creating..." : "Create Team"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NewTeamModal;
