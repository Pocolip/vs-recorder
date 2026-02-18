import React, { useState } from "react";
import { Link as LinkIcon, AlertCircle } from "lucide-react";
import { Modal } from "../ui/modal";
import * as pokepasteService from "../../services/pokepasteService";

const COLOR_CHOICES = [
  { key: "blue", bg: "bg-blue-500" },
  { key: "red", bg: "bg-red-500" },
  { key: "green", bg: "bg-green-500" },
  { key: "yellow", bg: "bg-yellow-500" },
  { key: "purple", bg: "bg-purple-500" },
  { key: "pink", bg: "bg-pink-500" },
  { key: "orange", bg: "bg-orange-500" },
  { key: "teal", bg: "bg-teal-500" },
  { key: "gray", bg: "bg-gray-500" },
];

interface AddOpponentTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { pokepaste: string; notes?: string; color?: string }) => Promise<void>;
}

const AddOpponentTeamModal: React.FC<AddOpponentTeamModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    pokepaste: "",
    notes: "",
    color: "blue",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pokepaste.trim()) {
      setError("Pokepaste or Pokebin URL is required");
      return;
    }

    if (!pokepasteService.isValidPokepasteUrl(formData.pokepaste.trim())) {
      setError(
        "Please enter a valid Pokepaste or Pokebin URL (e.g., https://pokepast.es/abc123 or https://pokebin.com/abc123)",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      await onSubmit({
        pokepaste: formData.pokepaste.trim(),
        notes: formData.notes.trim() || "",
        color: formData.color,
      });

      setFormData({ pokepaste: "", notes: "", color: "blue" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add matchup team. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
          Add Matchup Team
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-500/50 dark:bg-red-900/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Paste URL */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <LinkIcon className="mr-1 inline h-4 w-4" />
              Pokepaste / Pokebin URL *
            </label>
            <input
              type="url"
              value={formData.pokepaste}
              onChange={(e) => handleInputChange("pokepaste", e.target.value)}
              placeholder="https://pokepast.es/... or https://pokebin.com/..."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder-gray-500"
              disabled={loading}
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Link to the matchup team on Pokepaste or Pokebin
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Add player name, team notes, or playstyle observations..."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder-gray-500"
              rows={4}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tip: Start with the player's name for easy identification
            </p>
          </div>

          {/* Card Color */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Card Color
            </label>
            <div className="flex gap-2">
              {COLOR_CHOICES.map(({ key, bg }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleInputChange("color", key)}
                  className={`h-6 w-6 rounded ${bg} transition-transform hover:scale-110 ${
                    formData.color === key
                      ? "ring-2 ring-white ring-offset-1 ring-offset-white dark:ring-offset-gray-900"
                      : ""
                  }`}
                  title={key}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Team"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddOpponentTeamModal;
