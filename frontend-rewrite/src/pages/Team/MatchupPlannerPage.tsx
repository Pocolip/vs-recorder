import { useState, useEffect, useMemo } from "react";
import { Plus, Target, AlertTriangle } from "lucide-react";
import OpponentTeamCard from "../../components/team/OpponentTeamCard";
import AddOpponentTeamModal from "../../components/modals/AddOpponentTeamModal";
import TagInput from "../../components/form/TagInput";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useOpponentTeams } from "../../hooks/useOpponentTeams";
import useTeamPokemon from "../../hooks/useTeamPokemon";
import * as pokepasteService from "../../services/pokepasteService";
import { matchesPokemonTags } from "../../utils/pokemonNameUtils";

export default function MatchupPlannerPage() {
  const { team } = useActiveTeam();
  const [myTeamPokemon, setMyTeamPokemon] = useState<string[]>([]);
  const [parsingPokepaste, setParsingPokepaste] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [searchTags, setSearchTags] = useState<string[]>([]);

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
  } = useOpponentTeams(team?.id ?? null);

  const { teamPokemon } = useTeamPokemon(opponentTeams);

  const filteredOpponentTeams = useMemo(() => {
    if (searchTags.length === 0) return opponentTeams;
    return opponentTeams.filter((ot) => {
      const pokemonNames = teamPokemon[ot.id] || [];
      return matchesPokemonTags(pokemonNames, searchTags);
    });
  }, [opponentTeams, searchTags, teamPokemon]);

  useEffect(() => {
    if (team?.pokepaste) {
      parseMyTeamPokepaste();
    } else {
      setMyTeamPokemon([]);
      setParseError(null);
    }
  }, [team?.pokepaste]); // eslint-disable-line react-hooks/exhaustive-deps

  const parseMyTeamPokepaste = async () => {
    if (!team?.pokepaste) return;
    try {
      setParsingPokepaste(true);
      setParseError(null);
      const parsed = await pokepasteService.fetchAndParse(team.pokepaste);
      setMyTeamPokemon(parsed.map((p) => p.name).filter(Boolean));
    } catch {
      setParseError(
        "Failed to parse your team. Make sure your Pokepaste URL is valid.",
      );
      setMyTeamPokemon([]);
    } finally {
      setParsingPokepaste(false);
    }
  };

  const handleAddOpponentTeam = async (data: {
    pokepaste: string;
    notes?: string;
    color?: string;
  }) => {
    await createOpponentTeam(data);
    setShowAddTeamModal(false);
  };

  const handleUpdateNotes = async (
    opponentTeamId: number,
    updates: { pokepaste?: string; notes?: string; color?: string },
  ) => {
    await updateOpponentTeam(opponentTeamId, updates);
  };

  const handleDeleteOpponentTeam = async (opponentTeamId: number) => {
    await deleteOpponentTeam(opponentTeamId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-500 dark:text-red-400">
          Error loading matchup teams: {error}
        </div>
        <button
          onClick={refresh}
          className="rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600"
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
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-white/90">
            <Target className="h-6 w-6 text-brand-500" />
            Matchup Planning
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Plan strategies for specific matchups
          </p>
        </div>
        <button
          onClick={() => setShowAddTeamModal(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          Add Matchup Team
        </button>
      </div>

      {/* Warning if team has no pokepaste */}
      {!team?.pokepaste && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-500/50 dark:bg-yellow-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Your team needs a Pokepaste URL
            </p>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              Add a Pokepaste URL to your team to be able to create strategy
              plans. Edit your team to add one.
            </p>
          </div>
        </div>
      )}

      {/* Warning if pokepaste parsing failed */}
      {parseError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-500/50 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              Failed to load your team
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {parseError}
            </p>
          </div>
        </div>
      )}

      {/* Pokepaste parsing loading */}
      {parsingPokepaste && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 p-3 dark:border-blue-500/50 dark:bg-blue-900/20">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Loading your team...
          </span>
        </div>
      )}

      {/* Tag Filter */}
      {!isEmpty && !loading && (
        <div>
          <TagInput
            tags={searchTags}
            onTagsChange={setSearchTags}
            placeholder="Filter by opponent pokemon..."
          />
          {searchTags.length > 0 && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredOpponentTeams.length} of {opponentTeams.length}{" "}
              matchup teams
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !loading && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-600 dark:bg-white/[0.02]">
          <Target className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
          <h3 className="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-300">
            No matchup teams yet
          </h3>
          <p className="mx-auto mb-6 max-w-md text-gray-500 dark:text-gray-400">
            Add matchup teams to plan your strategies. You'll be able to define
            different compositions and notes for each matchup.
          </p>
          <button
            onClick={() => setShowAddTeamModal(true)}
            className="mx-auto flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-5 w-5" />
            Add Your First Matchup Team
          </button>
        </div>
      )}

      {/* Filtered empty */}
      {!isEmpty && filteredOpponentTeams.length === 0 && searchTags.length > 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No matchup teams match your filters
          </p>
          <button
            onClick={() => setSearchTags([])}
            className="mt-2 text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        !isEmpty && (
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
        )
      )}

      {/* Add Modal */}
      <AddOpponentTeamModal
        isOpen={showAddTeamModal}
        onClose={() => setShowAddTeamModal(false)}
        onSubmit={handleAddOpponentTeam}
      />
    </div>
  );
}
