import React, { useState } from "react";
import { Save, MessageSquare, ChevronDown, X } from "lucide-react";
import PokemonSprite from "../pokemon/PokemonSprite";
import type { TeamMember } from "../../types";

interface PokemonNoteCardProps {
  member: TeamMember;
  isEditingNote: boolean;
  isSavingNote: boolean;
  noteText: string;
  onStartEditingNote: (member: TeamMember) => void;
  onCancelEditingNote: () => void;
  onSaveNote: (memberId: number) => void;
  onNoteTextChange: (text: string) => void;
  onKeyPress: (e: React.KeyboardEvent, memberId: number) => void;
  onAddCalc: (memberId: number, calcText: string) => Promise<void>;
  onRemoveCalc: (memberId: number, index: number) => Promise<void>;
}

const PokemonNoteCard: React.FC<PokemonNoteCardProps> = ({
  member,
  isEditingNote,
  isSavingNote,
  noteText,
  onStartEditingNote,
  onCancelEditingNote,
  onSaveNote,
  onNoteTextChange,
  onKeyPress,
  onAddCalc,
  onRemoveCalc,
}) => {
  const [isNoteExpanded, setIsNoteExpanded] = useState(true);
  const [isCalcsExpanded, setIsCalcsExpanded] = useState(true);
  const [calcInput, setCalcInput] = useState("");

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <PokemonSprite name={member.pokemonName} size="lg" showTooltip={false} />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-gray-800 dark:text-white/90">
              {member.pokemonName}
            </span>
            {!member.notes && !isEditingNote && (
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                No notes yet
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => onStartEditingNote(member)}
          disabled={isEditingNote || isSavingNote}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
          title="Edit notes"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>

      {/* Collapsible Notes */}
      {member.notes && !isEditingNote && (
        <button
          type="button"
          onClick={() => setIsNoteExpanded(!isNoteExpanded)}
          className={`group mt-2 flex w-full items-start gap-1.5 rounded-b-md border-t border-gray-200 pt-2 text-left dark:border-gray-700 ${
            isNoteExpanded ? "bg-gray-50 p-2 dark:bg-white/[0.03]" : ""
          }`}
        >
          <ChevronDown
            className={`mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${
              isNoteExpanded ? "rotate-180" : ""
            }`}
          />
          <p
            className={`text-sm ${
              isNoteExpanded
                ? "break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300"
                : "truncate text-gray-500 dark:text-gray-400"
            }`}
          >
            {member.notes}
          </p>
        </button>
      )}

      {/* Inline Note Editor */}
      {isEditingNote && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <textarea
            value={noteText}
            onChange={(e) => onNoteTextChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, member.id)}
            placeholder={`Add notes about ${member.pokemonName}...`}
            rows={6}
            className="w-full resize-none rounded border border-gray-300 bg-transparent px-3 py-2 text-base text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:text-white/90 dark:placeholder-gray-500"
            disabled={isSavingNote}
            autoFocus
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Ctrl+Enter to save, Escape to cancel
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => onSaveNote(member.id)}
                disabled={isSavingNote}
                className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingNote ? (
                  <>
                    <div className="h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-2 w-2" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={onCancelEditingNote}
                disabled={isSavingNote}
                className="px-3 py-1 text-xs text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Calcs Section */}
      <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setIsCalcsExpanded(!isCalcsExpanded)}
          className="group flex w-full items-center gap-1.5 text-left"
        >
          <ChevronDown
            className={`h-3 w-3 flex-shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${
              isCalcsExpanded ? "rotate-180" : ""
            }`}
          />
          <span className="text-xs font-medium text-gray-500 transition-colors group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300">
            Calcs
          </span>
          {member.calcs?.length > 0 && (
            <span className="rounded-full bg-gray-200 px-1.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {member.calcs.length}
            </span>
          )}
        </button>

        {isCalcsExpanded && (
          <div className="mt-2 space-y-1">
            {member.calcs?.map((calc, index) => (
              <div
                key={index}
                className="group/calc flex items-start gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-white/[0.03]"
              >
                <span className="flex-1 break-words text-sm text-gray-700 dark:text-gray-300">
                  {calc}
                </span>
                <button
                  onClick={() => onRemoveCalc(member.id, index)}
                  className="flex-shrink-0 p-0.5 text-gray-400 opacity-0 transition-all hover:text-red-500 group-hover/calc:opacity-100 dark:text-gray-500 dark:hover:text-red-400"
                  title="Remove calc"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            <input
              type="text"
              value={calcInput}
              onChange={(e) => setCalcInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && calcInput.trim()) {
                  e.preventDefault();
                  onAddCalc(member.id, calcInput.trim());
                  setCalcInput("");
                }
              }}
              placeholder="Paste a calc result and press Enter..."
              className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-800 placeholder-gray-400 transition-colors focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PokemonNoteCard;
