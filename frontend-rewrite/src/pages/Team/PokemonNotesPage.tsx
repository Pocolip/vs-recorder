import { useState } from "react";
import { FileText } from "lucide-react";
import PokemonNoteCard from "../../components/team/PokemonNoteCard";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import useTeamMembers from "../../hooks/useTeamMembers";
import type { TeamMember } from "../../types";

export default function PokemonNotesPage() {
  const { team } = useActiveTeam();
  const { teamMembers, loading, error, updateMemberNotes, updateMemberCalcs } =
    useTeamMembers(team?.id ?? null, team?.pokepaste ?? null);

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  const startEditingNote = (member: TeamMember) => {
    setEditingNoteId(member.id);
    setNoteText(member.notes || "");
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setNoteText("");
  };

  const saveNote = async (memberId: number) => {
    try {
      setSavingNoteId(memberId);
      await updateMemberNotes(memberId, noteText.trim());
      setEditingNoteId(null);
      setNoteText("");
    } catch (err) {
      console.error("Error updating note:", err);
    } finally {
      setSavingNoteId(null);
    }
  };

  const addCalc = async (memberId: number, calcText: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    const currentCalcs = member?.calcs || [];
    await updateMemberCalcs(memberId, [...currentCalcs, calcText]);
  };

  const removeCalc = async (memberId: number, index: number) => {
    const member = teamMembers.find((m) => m.id === memberId);
    const currentCalcs = member?.calcs || [];
    await updateMemberCalcs(
      memberId,
      currentCalcs.filter((_, i) => i !== index),
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent, memberId: number) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveNote(memberId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditingNote();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 dark:text-red-400">
          Error loading team members: {error}
        </p>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
        <h3 className="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-300">
          No team members
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Add a pokepaste to your team to start adding notes for each Pokemon
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Pokemon Notes
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add notes for each Pokemon on your team
        </p>
      </div>

      <div className="space-y-3">
        {teamMembers.map((member) => (
          <PokemonNoteCard
            key={member.id}
            member={member}
            isEditingNote={editingNoteId === member.id}
            isSavingNote={savingNoteId === member.id}
            noteText={noteText}
            onStartEditingNote={startEditingNote}
            onCancelEditingNote={cancelEditingNote}
            onSaveNote={saveNote}
            onNoteTextChange={setNoteText}
            onKeyPress={handleKeyPress}
            onAddCalc={addCalc}
            onRemoveCalc={removeCalc}
          />
        ))}
      </div>
    </div>
  );
}
