// src/components/cards/OpponentTeamCard.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X as XIcon, ExternalLink } from 'lucide-react';
import PokemonTeam from '../PokemonTeam';
import PokemonSprite from '../PokemonSprite';
import PokemonDropdown from '../PokemonDropdown';
import ConfirmationModal from '../ConfirmationModal';
import PokepasteService from '../../services/PokepasteService';

// Consistent blue color for team cards
const TEAM_COLOR = { border: 'border-l-blue-500', bg: 'bg-blue-500/10' };

/**
 * Card component for displaying an opponent team and its strategies
 * @param {Object} opponentTeam - The opponent team data
 * @param {Array<string>} myTeamPokemon - Array of 6 Pokemon names from user's team
 * @param {Function} onUpdateNotes - Callback when notes are updated
 * @param {Function} onAddComposition - Callback when a composition is added
 * @param {Function} onUpdateComposition - Callback when a composition is updated
 * @param {Function} onDeleteComposition - Callback when a composition is deleted
 * @param {Function} onDeleteTeam - Callback when team is deleted
 */
const OpponentTeamCard = ({
  opponentTeam,
  myTeamPokemon = [],
  onUpdateNotes,
  onAddComposition,
  onUpdateComposition,
  onDeleteComposition,
  onDeleteTeam,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(opponentTeam.notes || '');
  const [editedPokepaste, setEditedPokepaste] = useState(opponentTeam.pokepaste || '');
  const [pasteTitle, setPasteTitle] = useState(null);
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [deletingPlanIndex, setDeletingPlanIndex] = useState(null);
  const [isAddingPlan, setIsAddingPlan] = useState(false);

  // Fetch paste title when pokepaste URL changes
  useEffect(() => {
    const fetchTitle = async () => {
      if (!opponentTeam.pokepaste) {
        setPasteTitle(null);
        return;
      }

      setLoadingTitle(true);
      try {
        const parsed = await PokepasteService.fetchAndParse(opponentTeam.pokepaste, { useCache: true });
        setPasteTitle(parsed.title || null);
      } catch (error) {
        console.error('Failed to fetch paste title:', error);
        setPasteTitle(null);
      } finally {
        setLoadingTitle(false);
      }
    };

    fetchTitle();
  }, [opponentTeam.pokepaste]);

  const handleSaveNotes = async () => {
    try {
      await onUpdateNotes(opponentTeam.id, { notes: editedNotes, pokepaste: editedPokepaste });
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleCancelEditNotes = () => {
    setEditedNotes(opponentTeam.notes || '');
    setEditedPokepaste(opponentTeam.pokepaste || '');
    setIsEditingNotes(false);
  };

  const handleDeletePlanClick = (index) => {
    setDeletingPlanIndex(index);
    setShowDeletePlanModal(true);
  };

  const handleConfirmDeletePlan = async () => {
    try {
      await onDeleteComposition(opponentTeam.id, deletingPlanIndex);
      setShowDeletePlanModal(false);
      setDeletingPlanIndex(null);
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const handleConfirmDeleteTeam = async () => {
    try {
      await onDeleteTeam(opponentTeam.id);
      setShowDeleteTeamModal(false);
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const compositions = opponentTeam.compositions || [];

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-lg border-l-4 ${TEAM_COLOR.border}`}>
      {/* Header with Team Info and Notes */}
      <div className="p-4 bg-slate-700/30 border-b border-slate-700 rounded-t-lg">
        <div className="flex items-start gap-4">
          {/* Opponent Team Sprites - Left */}
          <div className="flex-shrink-0 w-fit">
            <div className="flex items-center gap-2 mb-2 max-w-[280px]">
              <h3 className="text-sm font-semibold text-gray-100 truncate" title={pasteTitle || 'Matchup Team'}>
                {loadingTitle ? 'Loading...' : (pasteTitle || 'Matchup Team')}
              </h3>
              {opponentTeam.pokepaste && (
                <a
                  href={opponentTeam.pokepaste}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                  title="View Pokepaste"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {opponentTeam.pokepaste && (
              <PokemonTeam
                pokepaste={opponentTeam.pokepaste}
                size="md"
                showNames={false}
                maxDisplay={6}
              />
            )}
          </div>

          {/* Notes - Middle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-100">Notes</h4>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Pokepaste URL</label>
                  <input
                    type="text"
                    value={editedPokepaste}
                    onChange={(e) => setEditedPokepaste(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400 text-sm"
                    placeholder="https://pokepast.es/..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                  <textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400 text-sm"
                    rows={2}
                    placeholder="Add notes about this matchup..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-colors flex items-center gap-1"
                  >
                    <Save className="h-3 w-3" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditNotes}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded transition-colors flex items-center gap-1"
                  >
                    <XIcon className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 whitespace-pre-wrap">
                {opponentTeam.notes || 'No notes. Click Edit to add.'}
              </p>
            )}
          </div>

          {/* Delete Team Button - Right */}
          <button
            onClick={() => setShowDeleteTeamModal(true)}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded transition-colors"
            title="Delete matchup team"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Strategy Plans Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-100">
            Strategy Plans ({compositions.length})
          </h4>
          {!isAddingPlan && (
            <button
              onClick={() => setIsAddingPlan(true)}
              className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-600/10 rounded transition-colors"
              title="Add strategy plan"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* Add New Plan Row */}
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

          {/* Existing Plans */}
          {compositions.map((composition, index) => (
            <PlanRow
              key={index}
              composition={composition}
              index={index}
              myTeamPokemon={myTeamPokemon}
              onUpdate={(updated) => onUpdateComposition(opponentTeam.id, index, updated)}
              onDelete={() => handleDeletePlanClick(index)}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {showDeletePlanModal && (
        <ConfirmationModal
          title="Delete Strategy Plan"
          message="Are you sure you want to delete this strategy plan? This action cannot be undone."
          onConfirm={handleConfirmDeletePlan}
          onCancel={() => {
            setShowDeletePlanModal(false);
            setDeletingPlanIndex(null);
          }}
          confirmText="Delete Plan"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}

      {showDeleteTeamModal && (
        <ConfirmationModal
          title="Delete Matchup Team"
          message={
            <div>
              <p className="mb-2">
                Are you sure you want to delete this matchup team?
              </p>
              <p className="text-sm text-gray-400">
                This will delete {compositions.length} strategy{' '}
                {compositions.length === 1 ? 'plan' : 'plans'} associated with this team.
              </p>
              <p className="mt-2 text-red-400 font-medium text-sm">
                This action cannot be undone.
              </p>
            </div>
          }
          onConfirm={handleConfirmDeleteTeam}
          onCancel={() => setShowDeleteTeamModal(false)}
          confirmText="Delete Team"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
};

/**
 * Row component for displaying and editing a single plan
 */
const PlanRow = ({ composition, index, myTeamPokemon, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    lead1: composition.lead1 || '',
    lead2: composition.lead2 || '',
    back1: composition.back1 || '',
    back2: composition.back2 || '',
    notes: composition.notes || '',
  });

  const handleSave = async () => {
    // Validate
    const { lead1, lead2, back1, back2 } = formData;
    if (!lead1 || !lead2 || !back1 || !back2) {
      alert('All 4 Pokemon must be selected');
      return;
    }

    const selected = [lead1, lead2, back1, back2];
    if (new Set(selected).size !== 4) {
      alert('Cannot select the same Pokemon twice');
      return;
    }

    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update plan:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      lead1: composition.lead1 || '',
      lead2: composition.lead2 || '',
      back1: composition.back1 || '',
      back2: composition.back2 || '',
      notes: composition.notes || '',
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-slate-700/50 border border-emerald-500/40 rounded-lg p-3">
        <div className="grid grid-cols-12 gap-2 items-stretch">
          {/* Plan Label */}
          <div className="col-span-1 pt-2">
            <span className="text-xs font-semibold text-emerald-400">Plan {index + 1}</span>
          </div>

          {/* Dropdowns - Grouped */}
          <div className="col-span-4 flex gap-2 justify-center">
            {/* Leads Group */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-400 mb-0.5 text-center">Leads</p>
              <div className="space-y-1">
                <PokemonDropdown
                  options={myTeamPokemon}
                  value={formData.lead1}
                  onChange={(value) => setFormData({ ...formData, lead1: value })}
                  placeholder="Lead 1"
                  showSprite={false}
                />
                <PokemonDropdown
                  options={myTeamPokemon}
                  value={formData.lead2}
                  onChange={(value) => setFormData({ ...formData, lead2: value })}
                  placeholder="Lead 2"
                  showSprite={false}
                />
              </div>
            </div>

            {/* Back Group */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-400 mb-0.5 text-center">Back</p>
              <div className="space-y-1">
                <PokemonDropdown
                  options={myTeamPokemon}
                  value={formData.back1}
                  onChange={(value) => setFormData({ ...formData, back1: value })}
                  placeholder="Back 1"
                  showSprite={false}
                />
                <PokemonDropdown
                  options={myTeamPokemon}
                  value={formData.back2}
                  onChange={(value) => setFormData({ ...formData, back2: value })}
                  placeholder="Back 2"
                  showSprite={false}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="col-span-6 flex flex-col">
            <p className="text-xs text-gray-400 mb-0.5">Notes</p>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Strategy notes..."
              className="w-full flex-1 px-2 py-1.5 bg-slate-600 border border-slate-500 rounded text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="col-span-1 flex gap-1 justify-end pt-2">
            <button
              onClick={handleSave}
              className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-600/10 rounded transition-colors"
              title="Save"
            >
              <Save className="h-3 w-3" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-slate-600/10 rounded transition-colors"
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
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 hover:border-slate-500 transition-colors">
      <div className="grid grid-cols-12 gap-2 items-start">
        {/* Plan Label */}
        <div className="col-span-1 pt-2">
          <span className="text-xs font-semibold text-gray-400">Plan {index + 1}</span>
        </div>

        {/* Pokemon Sprites - Grouped */}
        <div className="col-span-4 flex gap-2 justify-center">
          {/* Leads Group */}
          <div>
            <p className="text-xs text-emerald-400 mb-0.5 text-center">Leads</p>
            <div className="bg-emerald-200/10 border border-emerald-400/30 rounded-lg p-1">
              <div className="flex gap-0.5">
                <PokemonSprite name={composition.lead1} size="md" showName={false} />
                <PokemonSprite name={composition.lead2} size="md" showName={false} />
              </div>
            </div>
          </div>

          {/* Back Group */}
          <div>
            <p className="text-xs text-blue-400 mb-0.5 text-center">Back</p>
            <div className="bg-blue-200/10 border border-blue-400/30 rounded-lg p-1">
              <div className="flex gap-0.5">
                <PokemonSprite name={composition.back1} size="md" showName={false} />
                <PokemonSprite name={composition.back2} size="md" showName={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-6">
          <p className="text-xs text-gray-400 mb-0.5">Notes</p>
          <div className="bg-slate-700/30 rounded-lg p-2">
            {composition.notes ? (
              <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">{composition.notes}</p>
            ) : (
              <p className="text-gray-500 text-sm italic">No notes</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex gap-1 justify-end pt-2">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-600/10 rounded transition-colors"
            title="Edit"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Row component for adding a new plan inline
 */
const AddPlanRow = ({ myTeamPokemon, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    lead1: '',
    lead2: '',
    back1: '',
    back2: '',
    notes: '',
  });

  const handleSave = async () => {
    // Validate
    const { lead1, lead2, back1, back2 } = formData;
    if (!lead1 || !lead2 || !back1 || !back2) {
      alert('All 4 Pokemon must be selected');
      return;
    }

    const selected = [lead1, lead2, back1, back2];
    if (new Set(selected).size !== 4) {
      alert('Cannot select the same Pokemon twice');
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to add plan:', error);
    }
  };

  return (
    <div className="bg-emerald-900/20 border border-emerald-500/40 rounded-lg p-3">
      <div className="grid grid-cols-12 gap-2 items-stretch">
        {/* Label */}
        <div className="col-span-1 pt-2">
          <span className="text-xs font-semibold text-emerald-400">New</span>
        </div>

        {/* Dropdowns - Grouped */}
        <div className="col-span-4 flex gap-2 justify-center">
          {/* Leads Group */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-400 mb-0.5 text-center">Leads</p>
            <div className="space-y-1">
              <PokemonDropdown
                options={myTeamPokemon}
                value={formData.lead1}
                onChange={(value) => setFormData({ ...formData, lead1: value })}
                placeholder="Lead 1"
                showSprite={false}
              />
              <PokemonDropdown
                options={myTeamPokemon}
                value={formData.lead2}
                onChange={(value) => setFormData({ ...formData, lead2: value })}
                placeholder="Lead 2"
                showSprite={false}
              />
            </div>
          </div>

          {/* Back Group */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-400 mb-0.5 text-center">Back</p>
            <div className="space-y-1">
              <PokemonDropdown
                options={myTeamPokemon}
                value={formData.back1}
                onChange={(value) => setFormData({ ...formData, back1: value })}
                placeholder="Back 1"
                showSprite={false}
              />
              <PokemonDropdown
                options={myTeamPokemon}
                value={formData.back2}
                onChange={(value) => setFormData({ ...formData, back2: value })}
                placeholder="Back 2"
                showSprite={false}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-6 flex flex-col">
          <p className="text-xs text-gray-400 mb-0.5">Notes</p>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Strategy notes..."
            className="w-full flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-400 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="col-span-1 flex gap-1 justify-end pt-2">
          <button
            onClick={handleSave}
            className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-600/10 rounded transition-colors"
            title="Save"
          >
            <Save className="h-3 w-3" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-slate-600/10 rounded transition-colors"
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
