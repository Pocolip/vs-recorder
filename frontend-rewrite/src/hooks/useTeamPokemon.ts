import { useState, useEffect, useMemo } from "react";
import * as pokepasteService from "../services/pokepasteService";
import type { Team } from "../types";

const useTeamPokemon = (teams: Team[]) => {
  const [teamPokemon, setTeamPokemon] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(false);

  // Create a stable key based on team IDs and pokepaste URLs
  const teamsKey = useMemo(() => {
    if (!teams || teams.length === 0) return "";
    return teams.map((t) => `${t.id}:${t.pokepaste || ""}`).join("|");
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
          if (!team.pokepaste) return { teamId: team.id, names: [] as string[] };
          const names = await pokepasteService.getPokemonNames(team.pokepaste, 6);
          return { teamId: team.id, names };
        }),
      );

      if (cancelled) return;

      const pokemon: Record<number, string[]> = {};
      for (const result of results) {
        if (result.status === "fulfilled") {
          pokemon[result.value.teamId] = result.value.names;
        }
      }

      setTeamPokemon(pokemon);
      setLoading(false);
    };

    resolveAll();

    return () => {
      cancelled = true;
    };
  }, [teamsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { teamPokemon, loading };
};

export default useTeamPokemon;
