// src/components/GamePlannerTab.jsx
import React, { useState } from 'react';
import { Plus, FileText, Trash2, Edit3, Save, X } from 'lucide-react';
import { useGamePlans, useGamePlan } from '../hooks';
import {
  OpponentTeamCard,
  CreateGamePlanModal,
  AddOpponentTeamModal,
} from './gameplanner';
import ConfirmationModal from './ConfirmationModal';

const GamePlannerTab = ({ team }) => {
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editedPlanName, setEditedPlanName] = useState('');
  const [editedPlanNotes, setEditedPlanNotes] = useState('');

  // Fetch all game plans
  const {
    gamePlans,
    loading: plansLoading,
    createGamePlan,
    updateGamePlan,
    deleteGamePlan,
  } = useGamePlans();

  // Fetch selected game plan details
  const {
    gamePlan,
    loading: planLoading,
    addTeam,
    updateTeam,
    deleteTeam,
    addComposition,
    deleteComposition,
  } = useGamePlan(selectedPlanId);

  const handleCreateGamePlan = async (data) => {
    try {
      const newPlan = await createGamePlan(data);
      setSelectedPlanId(newPlan.id);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create game plan:', error);
      throw error;
    }
  };

  const handleAddOpponentTeam = async (teamData) => {
    try {
      await addTeam(teamData);
      setShowAddTeamModal(false);
    } catch (error) {
      console.error('Failed to add opponent team:', error);
      throw error;
    }
  };

  const handleDeleteGamePlan = async () => {
    try {
      await deleteGamePlan(selectedPlanId);
      setSelectedPlanId(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete game plan:', error);
    }
  };

  const handleEditPlan = () => {
    if (gamePlan) {
      setEditedPlanName(gamePlan.name);
      setEditedPlanNotes(gamePlan.notes || '');
      setIsEditingPlan(true);
    }
  };

  const handleSavePlan = async () => {
    try {
      await updateGamePlan(selectedPlanId, {
        name: editedPlanName,
        notes: editedPlanNotes || null,
      });
      setIsEditingPlan(false);
    } catch (error) {
      console.error('Failed to update game plan:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingPlan(false);
    setEditedPlanName(gamePlan?.name || '');
    setEditedPlanNotes(gamePlan?.notes || '');
  };

  // Loading state
  if (plansLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Game Plan Selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          {gamePlans.length > 0 ? (
            <select
              value={selectedPlanId || ''}
              onChange={(e) => setSelectedPlanId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:border-emerald-400"
            >
              <option value="">Select a game plan...</option>
              {gamePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-gray-400 text-sm">No game plans yet. Create your first one!</p>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          New Game Plan
        </button>
      </div>

      {/* Game Plan Details */}
      {selectedPlanId && gamePlan && (
        <div className="space-y-6">
          {/* Game Plan Info Card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              {isEditingPlan ? (
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={editedPlanName}
                    onChange={(e) => setEditedPlanName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 text-xl font-bold focus:outline-none focus:border-emerald-400"
                  />
                  <textarea
                    value={editedPlanNotes}
                    onChange={(e) => setEditedPlanNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:border-emerald-400"
                    rows={3}
                    placeholder="Add notes about this game plan..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePlan}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded flex items-center gap-1.5 transition-colors"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded flex items-center gap-1.5 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-6 w-6 text-emerald-400" />
                    <h2 className="text-2xl font-bold text-gray-100">{gamePlan.name}</h2>
                  </div>
                  {gamePlan.notes && (
                    <p className="text-gray-400 mt-2">{gamePlan.notes}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-3">
                    {gamePlan.teams?.length || 0} {gamePlan.teams?.length === 1 ? 'opponent team' : 'opponent teams'}
                  </p>
                </div>
              )}

              {!isEditingPlan && (
                <div className="flex gap-2">
                  <button
                    onClick={handleEditPlan}
                    className="p-2 text-gray-400 hover:text-gray-200 hover:bg-slate-700 rounded transition-colors"
                    title="Edit game plan"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                    title="Delete game plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Opponent Teams */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">Opponent Teams</h3>
              <button
                onClick={() => setShowAddTeamModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Opponent Team
              </button>
            </div>

            {planLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
              </div>
            ) : gamePlan.teams && gamePlan.teams.length > 0 ? (
              <div className="space-y-4">
                {gamePlan.teams.map((opponentTeam) => (
                  <OpponentTeamCard
                    key={opponentTeam.id}
                    team={opponentTeam}
                    onAddComposition={addComposition}
                    onDeleteComposition={deleteComposition}
                    onDelete={() => deleteTeam(opponentTeam.id)}
                    onUpdate={updateTeam}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-12 text-center">
                <p className="text-gray-400 mb-4">No opponent teams added yet</p>
                <button
                  onClick={() => setShowAddTeamModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Opponent Team
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedPlanId && gamePlans.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">Select a game plan to get started</p>
          <p className="text-gray-500 text-sm">or create a new one using the button above</p>
        </div>
      )}

      {gamePlans.length === 0 && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No game plans yet</p>
          <p className="text-gray-500 text-sm mb-6">
            Create a game plan to track opponent teams and strategies for tournaments
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Your First Game Plan
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateGamePlanModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGamePlan}
        />
      )}

      {showAddTeamModal && (
        <AddOpponentTeamModal
          onClose={() => setShowAddTeamModal(false)}
          onSubmit={handleAddOpponentTeam}
        />
      )}

      {showDeleteModal && (
        <ConfirmationModal
          title="Delete Game Plan"
          message={
            <div>
              <p className="mb-4">
                Are you sure you want to delete <strong>{gamePlan?.name}</strong>?
              </p>
              <p className="text-sm text-gray-400">
                This will delete all opponent teams and strategies in this game plan.
              </p>
              <p className="mt-3 text-red-400 font-medium text-sm">
                This action cannot be undone.
              </p>
            </div>
          }
          onConfirm={handleDeleteGamePlan}
          onCancel={() => setShowDeleteModal(false)}
          confirmText="Delete Game Plan"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
};

export default GamePlannerTab;
