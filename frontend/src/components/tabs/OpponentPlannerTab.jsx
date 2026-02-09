// src/components/tabs/OpponentPlannerTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Target, AlertTriangle } from 'lucide-react';
import OpponentTeamCard from '../cards/OpponentTeamCard';
import AddOpponentTeamModal from '../modals/AddOpponentTeamModal';
import TagInput from '../TagInput';
import useOpponentTeams from '../../hooks/useOpponentTeams';
import { useTeamPokemon } from '../../hooks';
import PokepasteService from '../../services/PokepasteService';
import { matchesPokemonTags } from '../../utils/pokemonNameUtils';

/**
 * Main tab for opponent team planning
 * @param {Object} team - The current team object
 * @param {string} teamId - The team ID
 */
const OpponentPlannerTab = ({ team, teamId }) => {
  const [myTeamPokemon, setMyTeamPokemon] = useState([]);
  const [parsingPokepaste, setParsingPokepaste] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);

  const [searchTags, setSearchTags] = useState([]);

  const {
    opponentTeams,
    loading,
    error,
    createOpponentTeam,
    updateOpponentTeam,
    deleteOpponentTeam,
    addComposition,
    updateComposition,
    deleteComposition,
    refresh,
    isEmpty,
  } = useOpponentTeams(teamId);

  const { teamPokemon } = useTeamPokemon(opponentTeams);

  const filteredOpponentTeams = useMemo(() => {
    if (searchTags.length === 0) return opponentTeams;
    return opponentTeams.filter(ot => {
      const pokemonNames = teamPokemon[ot.id] || [];
      return matchesPokemonTags(pokemonNames, searchTags);
    });
  }, [opponentTeams, searchTags, teamPokemon]);

  // Parse my team's Pokemon from pokepaste
  useEffect(() => {
    if (team?.pokepaste) {
      parseMyTeamPokepaste();
    } else {
      setMyTeamPokemon([]);
      setParseError(null);
    }
  }, [team?.pokepaste]);

  const parseMyTeamPokepaste = async () => {
    try {
      setParsingPokepaste(true);
      setParseError(null);

      const parsed = await PokepasteService.fetchAndParse(team.pokepaste);
      const pokemonNames = parsed.pokemon.map((p) => p.name).filter(Boolean);

      setMyTeamPokemon(pokemonNames);
    } catch (err) {
      console.error('Failed to parse my team pokepaste:', err);
      setParseError('Failed to parse your team. Make sure your Pokepaste URL is valid.');
      setMyTeamPokemon([]);
    } finally {
      setParsingPokepaste(false);
    }
  };

  const handleAddOpponentTeam = async (data) => {
    try {
      await createOpponentTeam(data);
      setShowAddTeamModal(false);
    } catch (error) {
      console.error('Failed to create opponent team:', error);
      throw error;
    }
  };

  const handleUpdateNotes = async (opponentTeamId, updates) => {
    try {
      await updateOpponentTeam(opponentTeamId, updates);
    } catch (error) {
      console.error('Failed to update opponent team:', error);
      throw error;
    }
  };

  const handleDeleteOpponentTeam = async (opponentTeamId) => {
    try {
      await deleteOpponentTeam(opponentTeamId);
    } catch (error) {
      console.error('Failed to delete opponent team:', error);
      throw error;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">Error loading matchup teams: {error}</div>
        <button
          onClick={refresh}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-400" />
            Matchup Planning
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Plan strategies for specific matchups
          </p>
        </div>
        <button
          onClick={() => setShowAddTeamModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Matchup Team
        </button>
      </div>

      {/* Warning if my team has no pokepaste */}
      {!team?.pokepaste && (
        <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-200 font-medium">Your team needs a Pokepaste URL</p>
            <p className="text-yellow-300 text-sm mt-1">
              Add a Pokepaste URL to your team to be able to create strategy plans. Edit your team
              to add one.
            </p>
          </div>
        </div>
      )}

      {/* Warning if pokepaste parsing failed */}
      {parseError && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-200 font-medium">Failed to load your team</p>
            <p className="text-red-300 text-sm mt-1">{parseError}</p>
          </div>
        </div>
      )}

      {/* Pokepaste parsing state */}
      {parsingPokepaste && (
        <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          <span className="text-blue-200 text-sm">Loading your team...</span>
        </div>
      )}

      {/* Pokemon Tag Filter */}
      {!isEmpty && !loading && (
        <div>
          <TagInput
            tags={searchTags}
            onAddTag={(tag) => setSearchTags(prev => [...prev, tag])}
            onRemoveTag={(tag) => setSearchTags(prev => prev.filter(t => t !== tag))}
            placeholder="Filter by opponent pokemon..."
          />
          {searchTags.length > 0 && (
            <p className="text-gray-400 text-sm mt-2">
              Showing {filteredOpponentTeams.length} of {opponentTeams.length} matchup teams
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !loading && (
        <div className="text-center py-16 bg-slate-700/30 rounded-lg border-2 border-dashed border-slate-600">
          <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No matchup teams yet
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Add matchup teams to plan your strategies. You'll be able to define different
            compositions and notes for each matchup.
          </p>
          <button
            onClick={() => setShowAddTeamModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors mx-auto"
          >
            <Plus className="h-5 w-5" />
            Add Your First Matchup Team
          </button>
        </div>
      )}

      {/* Opponent Teams List */}
      {!isEmpty && filteredOpponentTeams.length === 0 && searchTags.length > 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No matchup teams match your filters</p>
          <button
            onClick={() => setSearchTags([])}
            className="mt-2 text-emerald-400 hover:text-emerald-300 text-sm"
          >
            Clear filters
          </button>
        </div>
      ) : !isEmpty && (
        <div className="space-y-6">
          {filteredOpponentTeams.map((opponentTeam) => (
            <OpponentTeamCard
              key={opponentTeam.id}
              opponentTeam={opponentTeam}
              myTeamPokemon={myTeamPokemon}
              onUpdateNotes={handleUpdateNotes}
              onAddComposition={addComposition}
              onUpdateComposition={updateComposition}
              onDeleteComposition={deleteComposition}
              onDeleteTeam={handleDeleteOpponentTeam}
            />
          ))}
        </div>
      )}

      {/* Add Opponent Team Modal */}
      {showAddTeamModal && (
        <AddOpponentTeamModal
          onClose={() => setShowAddTeamModal(false)}
          onSubmit={handleAddOpponentTeam}
        />
      )}
    </div>
  );
};

export default OpponentPlannerTab;
