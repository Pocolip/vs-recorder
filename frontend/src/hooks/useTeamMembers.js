import { useState, useEffect, useCallback } from 'react';
import { teamMemberApi } from '../services/api';
import PokepasteService from '../services/PokepasteService';

/**
 * Hook that manages team members (per-pokemon notes) for a team.
 * Auto-syncs team members from pokepaste when they don't exist yet.
 */
const useTeamMembers = (teamId, pokepaste) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTeamMembers = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      let members = await teamMemberApi.getByTeamId(teamId);

      // If no members exist but we have a pokepaste, auto-create them
      if (members.length === 0 && pokepaste) {
        const pokemonNames = await PokepasteService.getPokemonNames(pokepaste, 6);

        if (pokemonNames.length > 0) {
          const createPromises = pokemonNames.map((name, index) =>
            teamMemberApi.create(teamId, {
              pokemonName: name,
              slot: index + 1,
              notes: '',
            })
          );

          members = await Promise.all(createPromises);
        }
      }

      setTeamMembers(members);
    } catch (err) {
      console.error('Error loading team members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamId, pokepaste]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  const updateMemberNotes = useCallback(async (memberId, notes) => {
    const updated = await teamMemberApi.update(memberId, { notes });
    setTeamMembers(prev =>
      prev.map(m => m.id === memberId ? updated : m)
    );
    return updated;
  }, []);

  const refreshMembers = useCallback(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  return {
    teamMembers,
    loading,
    error,
    updateMemberNotes,
    refreshMembers,
  };
};

export default useTeamMembers;
