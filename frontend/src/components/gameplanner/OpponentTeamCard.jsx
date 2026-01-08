// src/components/gameplanner/OpponentTeamCard.jsx
import React, { useState } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import PokemonTeam from '../PokemonTeam';
import CompositionDisplay from './CompositionDisplay';
import AddCompositionModal from './AddCompositionModal';

const OpponentTeamCard = ({ team, onAddComposition, onDeleteComposition, onDelete, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddCompModal, setShowAddCompModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(team.notes || '');

  const handleSaveNotes = async () => {
    if (onUpdate) {
      try {
        await onUpdate(team.id, { notes: editedNotes });
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to update notes:', error);
      }
    }
  };

  const handleAddComposition = async (composition) => {
    try {
      await onAddComposition(team.id, composition);
      setShowAddCompModal(false);
    } catch (error) {
      console.error('Failed to add composition:', error);
      throw error;
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-700/30 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-100">
                Opponent Team #{team.id}
              </h3>
              <p className="text-xs text-gray-400">
                {team.compositions?.length || 0} {team.compositions?.length === 1 ? 'strategy' : 'strategies'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCompModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded flex items-center gap-1.5 transition-colors"
              title="Add strategy"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Strategy
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
              title="Delete team"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Pokemon Team */}
          {team.pokepaste && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Team</h4>
              <PokemonTeam
                pokepaste={team.pokepaste}
                size="md"
                showNames={false}
                maxDisplay={6}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">Notes</h4>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400 text-sm"
                  rows={3}
                  placeholder="Add notes about this opponent's team, tendencies, or strategies..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedNotes(team.notes || '');
                    }}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {team.notes || 'No notes yet. Click Edit to add notes.'}
              </p>
            )}
          </div>

          {/* Compositions/Strategies */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Strategies</h4>
            {team.compositions && team.compositions.length > 0 ? (
              <div className="space-y-2">
                {team.compositions.map((comp, index) => (
                  <CompositionDisplay
                    key={index}
                    composition={comp}
                    onDelete={() => onDeleteComposition(team.id, index)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No strategies added yet. Click "Add Strategy" to add your first composition.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Composition Modal */}
      {showAddCompModal && (
        <AddCompositionModal
          onClose={() => setShowAddCompModal(false)}
          onSubmit={handleAddComposition}
        />
      )}
    </div>
  );
};

export default OpponentTeamCard;
