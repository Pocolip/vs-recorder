import { useState, useEffect, useMemo } from 'react';
import PokepasteService from '../services/PokepasteService';

/**
 * Hook that batch-resolves pokepaste URLs to pokemon names for all teams.
 * Leverages the existing 24-hour PokepasteService cache.
 */
const useTeamPokemon = (teams) => {
  const [teamPokemon, setTeamPokemon] = useState({});
  const [loading, setLoading] = useState(false);

  // Create a stable key based on team IDs and pokepaste URLs
  const teamsKey = useMemo(() => {
    if (!teams || teams.length === 0) return '';
    return teams
      .map(t => `${t.id}:${t.pokepaste || ''}`)
      .join('|');
  }, [teams]);

  useEffect(() => {
    if (!teams || teams.length === 0) {
      setTeamPokemon({});
      return;
    }

    let cancelled = false;

    const resolveAll = async () => {
      setLoading(true);

      const results = await Promise.allSettled(
        teams.map(async (team) => {
          if (!team.pokepaste) return { teamId: team.id, names: [] };
          const names = await PokepasteService.getPokemonNames(team.pokepaste, 6);
          return { teamId: team.id, names };
        })
      );

      if (cancelled) return;

      const pokemon = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          pokemon[result.value.teamId] = result.value.names;
        }
      }

      setTeamPokemon(pokemon);
      setLoading(false);
    };

    resolveAll();

    return () => { cancelled = true; };
  }, [teamsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { teamPokemon, loading };
};

export default useTeamPokemon;
