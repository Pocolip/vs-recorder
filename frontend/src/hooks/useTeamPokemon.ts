import { useState, useEffect, useMemo } from "react";
import * as pokepasteService from "../services/pokepasteService";

type TeamLike = { id: number; pokepaste?: string | null };

const useTeamPokemon = (teams: TeamLike[]) => {
  const [teamPokemon, setTeamPokemon] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [teamSets, setTeamSets] = useState<Record<number, pokepasteService.PokemonData[]>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loadedKey, setLoadedKey] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Create a stable key based on team IDs and pokepaste URLs
  const teamsKey = useMemo(() => {
    if (!teams || teams.length === 0) return "";
    return teams.map((t) => `${t.id}:${t.pokepaste || ""}`).join("|");
  }, [teams]);

  useEffect(() => {
    if (!teams || teams.length === 0) {
      setTeamPokemon({});
      setTeamSets({});
      setErrors({});
      setLoading(false);
      setLoadedKey("");
      return;
    }

    let cancelled = false;

    const resolveAll = async () => {
      setLoading(true);

      const results = await Promise.allSettled(
        teams.map(async (team) => {
          if (!team.pokepaste) return { teamId: team.id, members: [] };
          const members = await pokepasteService.fetchAndParse(team.pokepaste, { maxPokemon: 6 });
          return { teamId: team.id, members };
        }),
      );

      if (cancelled) return;

      const pokemon: Record<number, string[]> = {};
      const sets: Record<number, pokepasteService.PokemonData[]> = {};
      const failed: Record<number, string> = {};
      for (const [index, result] of results.entries()) {
        if (result.status === "fulfilled") {
          pokemon[result.value.teamId] = result.value.members.map((m) => m.name);
          sets[result.value.teamId] = result.value.members;
        } else {
          failed[teams[index].id] = "Could not load matchup Pokémon.";
        }
      }

      setTeamPokemon(pokemon);
      setTeamSets(sets);
      setErrors(failed);
      setLoadedKey(teamsKey);
      setLoading(false);
    };

    resolveAll();

    return () => {
      cancelled = true;
    };
  }, [teamsKey, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = loadedKey === teamsKey;
  return {
    teamPokemon: current ? teamPokemon : {},
    teamSets: current ? teamSets : {},
    errors: current ? errors : {},
    loading: loading || !current,
    retry: () => setAttempt((n) => n + 1),
  };
};

export default useTeamPokemon;
