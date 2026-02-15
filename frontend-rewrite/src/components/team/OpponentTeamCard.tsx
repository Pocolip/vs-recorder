import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X as XIcon,
  ExternalLink,
} from "lucide-react";
import PokemonTeam from "../pokemon/PokemonTeam";
import PokemonSprite from "../pokemon/PokemonSprite";
import PokemonDropdown from "../form/PokemonDropdown";
import ConfirmationModal from "../modals/ConfirmationModal";
import * as pokepasteService from "../../services/pokepasteService";
import type { Composition } from "../../types";

const COLOR_OPTIONS: Record<string, { border: string; bg: string }> = {
  blue: { border: "border-l-blue-500", bg: "bg-blue-500" },
  red: { border: "border-l-red-500", bg: "bg-red-500" },
  green: { border: "border-l-green-500", bg: "bg-green-500" },
  yellow: { border: "border-l-yellow-500", bg: "bg-yellow-500" },
  purple: { border: "border-l-purple-500", bg: "bg-purple-500" },
  pink: { border: "border-l-pink-500", bg: "bg-pink-500" },
  orange: { border: "border-l-orange-500", bg: "bg-orange-500" },
  teal: { border: "border-l-teal-500", bg: "bg-teal-500" },
  gray: { border: "border-l-gray-500", bg: "bg-gray-500" },
};

export interface OpponentTeam {
  id: number;
  teamId: number;
  gamePlanId: number;
  pokepaste: string;
  notes: string;
  color: string;
  compositions: Composition[];
  createdAt: string;
}

interface OpponentTeamCardProps {
  opponentTeam: OpponentTeam;
  myTeamPokemon: string[];
  onUpdateNotes: (
    id: number,
    updates: { pokepaste?: string; notes?: string; color?: string },
  ) => Promise<void>;
  onAddComposition: (id: number, composition: Composition) => Promise<unknown>;
  onUpdateComposition: (
    id: number,
    index: number,
    composition: Composition,
  ) => Promise<unknown>;
  onDeleteComposition: (id: number, index: number) => Promise<unknown>;
  onDeleteTeam: (id: number) => Promise<unknown>;
}

const OpponentTeamCard: React.FC<OpponentTeamCardProps> = ({
  opponentTeam,
  myTeamPokemon = [],
  onUpdateNotes,
  onAddComposition,
  onUpdateComposition,
  onDeleteComposition,
  onDeleteTeam,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(opponentTeam.notes || "");
  const [editedPokepaste, setEditedPokepaste] = useState(
    opponentTeam.pokepaste || "",
  );
  const [pasteTitle, setPasteTitle] = useState<string | null>(null);
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [deletingPlanIndex, setDeletingPlanIndex] = useState<number | null>(
    null,
  );
  const [isAddingPlan, setIsAddingPlan] = useState(false);

  const teamColor = COLOR_OPTIONS[opponentTeam.color] || COLOR_OPTIONS.blue;

  useEffect(() => {
    const fetchTitle = async () => {
      if (!opponentTeam.pokepaste) {
        setPasteTitle(null);
        return;
      }

      setLoadingTitle(true);
      try {
        const parsed = await pokepasteService.fetchAndParse(
          opponentTeam.pokepaste,
        );
        const firstMon = parsed[0];
        setPasteTitle(firstMon?.name || null);
      } catch {
        setPasteTitle(null);
      } finally {
        setLoadingTitle(false);
      }
    };

    fetchTitle();
  }, [opponentTeam.pokepaste]);

  const handleSaveNotes = async () => {
    try {
      await onUpdateNotes(opponentTeam.id, {
        notes: editedNotes,
        pokepaste: editedPokepaste,
      });
      setIsEditingNotes(false);
    } catch (error) {
      console.error("Failed to save notes:", error);
    }
  };

  const handleCancelEditNotes = () => {
    setEditedNotes(opponentTeam.notes || "");
    setEditedPokepaste(opponentTeam.pokepaste || "");
    setIsEditingNotes(false);
  };

  const handleDeletePlanClick = (index: number) => {
    setDeletingPlanIndex(index);
    setShowDeletePlanModal(true);
  };

  const handleConfirmDeletePlan = async () => {
    if (deletingPlanIndex === null) return;
    try {
      await onDeleteComposition(opponentTeam.id, deletingPlanIndex);
      setShowDeletePlanModal(false);
      setDeletingPlanIndex(null);
    } catch (error) {
      console.error("Failed to delete plan:", error);
    }
  };

  const handleConfirmDeleteTeam = async () => {
    try {
      await onDeleteTeam(opponentTeam.id);
      setShowDeleteTeamModal(false);
    } catch (error) {
      console.error("Failed to delete team:", error);
    }
  };

  const compositions = opponentTeam.compositions || [];

  return (
    <div
      className={`rounded-lg border border-l-4 border-gray-200 dark:border-gray-700 ${teamColor.border}`}
    >
      {/* Header */}
      <div className="rounded-t-lg border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
        <div className="flex items-start gap-4">
          {/* Opponent Team Sprites */}
          <div className="w-fit flex-shrink-0">
            <div className="mb-2 flex max-w-[280px] items-center gap-2">
              <h3
                className="truncate text-sm font-semibold text-gray-800 dark:text-white/90"
                title={pasteTitle || "Matchup Team"}
              >
                {loadingTitle
                  ? "Loading..."
                  : pasteTitle || "Matchup Team"}
              </h3>
              {opponentTeam.pokepaste && (
                <a
                  href={opponentTeam.pokepaste}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-gray-400 transition-colors hover:text-brand-500"
                  title="View Pokepaste"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {opponentTeam.pokepaste && (
              <PokemonTeam pokepasteUrl={opponentTeam.pokepaste} size="md" />
            )}
          </div>

          {/* Notes */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Notes
              </h4>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Pokepaste URL
                  </label>
                  <input
                    type="text"
                    value={editedPokepaste}
                    onChange={(e) => setEditedPokepaste(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-white/90 dark:placeholder-gray-500"
                    placeholder="https://pokepast.es/..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Notes
                  </label>
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-white/90 dark:placeholder-gray-500"
                    rows={2}
                    placeholder="Add notes about this matchup..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Card Color
                  </label>
                  <div className="flex gap-1.5">
                    {Object.entries(COLOR_OPTIONS).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          onUpdateNotes(opponentTeam.id, { color: key })
                        }
                        className={`h-5 w-5 rounded ${val.bg} transition-transform hover:scale-110 ${
                          (opponentTeam.color || "blue") === key
                            ? "ring-2 ring-white ring-offset-1 ring-offset-white dark:ring-offset-gray-900"
                            : ""
                        }`}
                        title={key}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 rounded bg-brand-500 px-3 py-1 text-xs text-white transition-colors hover:bg-brand-600"
                  >
                    <Save className="h-3 w-3" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditNotes}
                    className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <XIcon className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-gray-500 dark:text-gray-400">
                {opponentTeam.notes || "No notes. Click Edit to add."}
              </p>
            )}
          </div>

          {/* Delete Team Button */}
          <button
            onClick={() => setShowDeleteTeamModal(true)}
            className="flex-shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            title="Delete matchup team"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Strategy Plans Section */}
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Strategy Plans ({compositions.length})
          </h4>
          {!isAddingPlan && (
            <button
              onClick={() => setIsAddingPlan(true)}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
              title="Add strategy plan"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {isAddingPlan && (
            <AddPlanRow
              myTeamPokemon={myTeamPokemon}
              onSave={async (composition) => {
                await onAddComposition(opponentTeam.id, composition);
                setIsAddingPlan(false);
              }}
              onCancel={() => setIsAddingPlan(false)}
            />
          )}

          {compositions.map((composition, index) => (
            <PlanRow
              key={index}
              composition={composition}
              index={index}
              myTeamPokemon={myTeamPokemon}
              onUpdate={(updated) =>
                onUpdateComposition(opponentTeam.id, index, updated)
              }
              onDelete={() => handleDeletePlanClick(index)}
            />
          ))}
        </div>
      </div>

      {/* Delete Plan Modal */}
      <ConfirmationModal
        isOpen={showDeletePlanModal}
        title="Delete Strategy Plan"
        message="Are you sure you want to delete this strategy plan? This action cannot be undone."
        onConfirm={handleConfirmDeletePlan}
        onCancel={() => {
          setShowDeletePlanModal(false);
          setDeletingPlanIndex(null);
        }}
        confirmText="Delete Plan"
        variant="danger"
      />

      {/* Delete Team Modal */}
      <ConfirmationModal
        isOpen={showDeleteTeamModal}
        title="Delete Matchup Team"
        message={
          <div>
            <p className="mb-2">
              Are you sure you want to delete this matchup team?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This will delete {compositions.length} strategy{" "}
              {compositions.length === 1 ? "plan" : "plans"} associated with
              this team.
            </p>
            <p className="mt-2 text-sm font-medium text-red-500 dark:text-red-400">
              This action cannot be undone.
            </p>
          </div>
        }
        onConfirm={handleConfirmDeleteTeam}
        onCancel={() => setShowDeleteTeamModal(false)}
        confirmText="Delete Team"
        variant="danger"
      />
    </div>
  );
};

/* ---------- PlanRow ---------- */

interface PlanRowProps {
  composition: Composition;
  index: number;
  myTeamPokemon: string[];
  onUpdate: (updated: Composition) => Promise<unknown>;
  onDelete: () => void;
}

const PlanRow: React.FC<PlanRowProps> = ({
  composition,
  index,
  myTeamPokemon,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    lead1: composition.lead1 || "",
    lead2: composition.lead2 || "",
    back1: composition.back1 || "",
    back2: composition.back2 || "",
    notes: composition.notes || "",
  });
  const [validationError, setValidationError] = useState("");

  const handleSave = async () => {
    const { lead1, lead2, back1, back2 } = formData;
    if (!lead1 || !lead2 || !back1 || !back2) {
      setValidationError("All 4 Pokemon must be selected");
      return;
    }

    if (new Set([lead1, lead2, back1, back2]).size !== 4) {
      setValidationError("Cannot select the same Pokemon twice");
      return;
    }

    try {
      setValidationError("");
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update plan:", error);
    }
  };

  const handleCancel = () => {
    setFormData({
      lead1: composition.lead1 || "",
      lead2: composition.lead2 || "",
      back1: composition.back1 || "",
      back2: composition.back2 || "",
      notes: composition.notes || "",
    });
    setValidationError("");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-brand-300 bg-brand-50/50 p-3 dark:border-brand-500/40 dark:bg-brand-500/5">
        {validationError && (
          <p className="mb-2 text-xs text-red-500 dark:text-red-400">
            {validationError}
          </p>
        )}
        <div className="grid grid-cols-12 items-stretch gap-2">
          <div className="col-span-1 pt-2">
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
              Plan {index + 1}
            </span>
          </div>

          <div className="col-span-4 flex justify-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-center text-xs text-brand-600 dark:text-brand-400">
                Leads
              </p>
              <div className="space-y-1">
                <PokemonDropdown
                  options={myTeamPokemon}
                  value={formData.lead1}
                  onChange={(value) =>
                    setFormData({ ...formData, lead1: value })
                  }
                  placeholder="Lead 1"
                  showSprite={false}
                />
                <PokemonDropdown
                  options={myTeamPokemon}
                  value={formData.lead2}
                  onChange={(value) =>
                    setFormData({ ...formData, lead2: value })
                  }
                  placeholder="Lead 2"
                  showSprite={false}
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-center text-xs text-blue-600 dark:text-blue-400">
                Back
              </p>
              <div className="space-y-1">
                <PokemonDropdown
                  options={myTeamPokemon}
                  value={formData.back1}
                  onChange={(value) =>
                    setFormData({ ...formData, back1: value })
                  }
                  placeholder="Back 1"
                  showSprite={false}
                />
                <PokemonDropdown
                  options={myTeamPokemon}
                  value={formData.back2}
                  onChange={(value) =>
                    setFormData({ ...formData, back2: value })
                  }
                  placeholder="Back 2"
                  showSprite={false}
                />
              </div>
            </div>
          </div>

          <div className="col-span-6 flex flex-col">
            <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">
              Notes
            </p>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Strategy notes..."
              className="w-full flex-1 resize-none rounded border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-600 dark:text-white/90 dark:placeholder-gray-500"
            />
          </div>

          <div className="col-span-1 flex justify-end gap-1 pt-2">
            <button
              onClick={handleSave}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
              title="Save"
            >
              <Save className="h-3 w-3" />
            </button>
            <button
              onClick={handleCancel}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Cancel"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-gray-600">
      <div className="grid grid-cols-12 items-start gap-2">
        <div className="col-span-1 pt-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Plan {index + 1}
          </span>
        </div>

        <div className="col-span-4 flex justify-center gap-2">
          <div>
            <p className="mb-0.5 text-center text-xs text-brand-600 dark:text-brand-400">
              Leads
            </p>
            <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-1 dark:border-brand-400/30 dark:bg-brand-200/10">
              <div className="flex gap-0.5">
                <PokemonSprite
                  name={composition.lead1}
                  size="md"
                  showTooltip={true}
                />
                <PokemonSprite
                  name={composition.lead2}
                  size="md"
                  showTooltip={true}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-0.5 text-center text-xs text-blue-600 dark:text-blue-400">
              Back
            </p>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-1 dark:border-blue-400/30 dark:bg-blue-200/10">
              <div className="flex gap-0.5">
                <PokemonSprite
                  name={composition.back1}
                  size="md"
                  showTooltip={true}
                />
                <PokemonSprite
                  name={composition.back2}
                  size="md"
                  showTooltip={true}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-6">
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">
            Notes
          </p>
          <div className="rounded-lg bg-gray-50 p-2 dark:bg-white/[0.03]">
            {composition.notes ? (
              <p className="break-words whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {composition.notes}
              </p>
            ) : (
              <p className="text-sm italic text-gray-400 dark:text-gray-500">
                No notes
              </p>
            )}
          </div>
        </div>

        <div className="col-span-1 flex justify-end gap-1 pt-2">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            title="Edit"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- AddPlanRow ---------- */

interface AddPlanRowProps {
  myTeamPokemon: string[];
  onSave: (composition: Composition) => Promise<void>;
  onCancel: () => void;
}

const AddPlanRow: React.FC<AddPlanRowProps> = ({
  myTeamPokemon,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    lead1: "",
    lead2: "",
    back1: "",
    back2: "",
    notes: "",
  });
  const [validationError, setValidationError] = useState("");

  const handleSave = async () => {
    const { lead1, lead2, back1, back2 } = formData;
    if (!lead1 || !lead2 || !back1 || !back2) {
      setValidationError("All 4 Pokemon must be selected");
      return;
    }

    if (new Set([lead1, lead2, back1, back2]).size !== 4) {
      setValidationError("Cannot select the same Pokemon twice");
      return;
    }

    try {
      setValidationError("");
      await onSave(formData);
    } catch (error) {
      console.error("Failed to add plan:", error);
    }
  };

  return (
    <div className="rounded-lg border border-brand-300 bg-brand-50/30 p-3 dark:border-brand-500/40 dark:bg-brand-900/20">
      {validationError && (
        <p className="mb-2 text-xs text-red-500 dark:text-red-400">
          {validationError}
        </p>
      )}
      <div className="grid grid-cols-12 items-stretch gap-2">
        <div className="col-span-1 pt-2">
          <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
            New
          </span>
        </div>

        <div className="col-span-4 flex justify-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-center text-xs text-brand-600 dark:text-brand-400">
              Leads
            </p>
            <div className="space-y-1">
              <PokemonDropdown
                options={myTeamPokemon}
                value={formData.lead1}
                onChange={(value) =>
                  setFormData({ ...formData, lead1: value })
                }
                placeholder="Lead 1"
                showSprite={false}
              />
              <PokemonDropdown
                options={myTeamPokemon}
                value={formData.lead2}
                onChange={(value) =>
                  setFormData({ ...formData, lead2: value })
                }
                placeholder="Lead 2"
                showSprite={false}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-center text-xs text-blue-600 dark:text-blue-400">
              Back
            </p>
            <div className="space-y-1">
              <PokemonDropdown
                options={myTeamPokemon}
                value={formData.back1}
                onChange={(value) =>
                  setFormData({ ...formData, back1: value })
                }
                placeholder="Back 1"
                showSprite={false}
              />
              <PokemonDropdown
                options={myTeamPokemon}
                value={formData.back2}
                onChange={(value) =>
                  setFormData({ ...formData, back2: value })
                }
                placeholder="Back 2"
                showSprite={false}
              />
            </div>
          </div>
        </div>

        <div className="col-span-6 flex flex-col">
          <p className="mb-0.5 text-xs text-gray-500 dark:text-gray-400">
            Notes
          </p>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Strategy notes..."
            className="w-full flex-1 resize-none rounded border border-gray-300 bg-transparent px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-600 dark:text-white/90 dark:placeholder-gray-500"
          />
        </div>

        <div className="col-span-1 flex justify-end gap-1 pt-2">
          <button
            onClick={handleSave}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
            title="Save"
          >
            <Save className="h-3 w-3" />
          </button>
          <button
            onClick={onCancel}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Cancel"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpponentTeamCard;
