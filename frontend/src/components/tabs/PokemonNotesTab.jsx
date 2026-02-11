import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import useTeamMembers from '../../hooks/useTeamMembers';
import PokemonNoteCard from '../cards/PokemonNoteCard';

const PokemonNotesTab = ({ teamId, team }) => {
    const {
        teamMembers,
        loading,
        error,
        updateMemberNotes,
        updateMemberCalcs,
    } = useTeamMembers(teamId, team?.pokepaste);

    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [savingNoteId, setSavingNoteId] = useState(null);

    const startEditingNote = (member) => {
        setEditingNoteId(member.id);
        setNoteText(member.notes || '');
    };

    const cancelEditingNote = () => {
        setEditingNoteId(null);
        setNoteText('');
    };

    const saveNote = async (memberId) => {
        try {
            setSavingNoteId(memberId);
            await updateMemberNotes(memberId, noteText.trim());
            setEditingNoteId(null);
            setNoteText('');
        } catch (err) {
            console.error('Error updating note:', err);
        } finally {
            setSavingNoteId(null);
        }
    };

    const addCalc = async (memberId, calcText) => {
        const member = teamMembers.find(m => m.id === memberId);
        const currentCalcs = member?.calcs || [];
        await updateMemberCalcs(memberId, [...currentCalcs, calcText]);
    };

    const removeCalc = async (memberId, index) => {
        const member = teamMembers.find(m => m.id === memberId);
        const currentCalcs = member?.calcs || [];
        const newCalcs = currentCalcs.filter((_, i) => i !== index);
        await updateMemberCalcs(memberId, newCalcs);
    };

    const handleKeyPress = (e, memberId) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveNote(memberId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditingNote();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Error loading team members: {error}</p>
            </div>
        );
    }

    if (teamMembers.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No team members</h3>
                <p className="text-gray-400">Add a pokepaste to your team to start adding notes for each Pokemon</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-100">Pokemon Notes</h3>
                <p className="text-gray-400">Add notes for each Pokemon on your team</p>
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
};

export default PokemonNotesTab;
