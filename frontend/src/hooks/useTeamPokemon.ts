import { useState, useEffect, useMemo } from "react";
import * as pokepasteService from "../services/pokepasteService";

type TeamLike = { id: number; pokepaste?: string | null; pokemonNames?: string[] };

const useTeamPokemon = (teams: TeamLike[], preferStored = false) => {
  const [teamPokemon, setTeamPokemon] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [teamSets, setTeamSets] = useState<Record<number, pokepasteService.PokemonData[]>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loadedKey, setLoadedKey] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Create a stable key based on team IDs and pokepaste URLs
  const teamsKey = useMemo(() => {
    if (!teams || teams.length === 0) return "";
    return teams.map((t) => `${t.id}:${t.pokepaste || ""}:${preferStored ? t.pokemonNames?.join(",") : ""}`).join("|");
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

      setLoadedKey(teamsKey);
      setTeamPokemon({});
      setTeamSets({});
      setErrors({});
      await Promise.allSettled(teams.map(async (team) => {
        if (preferStored && team.pokemonNames?.length) return;
        try {
          const members = team.pokepaste
            ? await pokepasteService.fetchAndParse(team.pokepaste, { maxPokemon: 6 }) : [];
          if (cancelled) return;
          setTeamPokemon((previous) => ({ ...previous, [team.id]: members.map((member) => member.name) }));
          setTeamSets((previous) => ({ ...previous, [team.id]: members }));
        } catch {
          if (!cancelled) setErrors((previous) => ({ ...previous, [team.id]: "Could not load matchup Pokémon." }));
        }
      }));
      if (cancelled) return;
      setLoading(false);
    };

    resolveAll();

    return () => {
      cancelled = true;
    };
  }, [teamsKey, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = loadedKey === teamsKey;
  const stored = preferStored ? Object.fromEntries(teams.filter((t) => t.pokemonNames?.length)
    .map((t) => [t.id, t.pokemonNames!])) : {};
  return {
    teamPokemon: { ...stored, ...(current ? teamPokemon : {}) },
    teamSets: current ? teamSets : {},
    errors: current ? errors : {},
    loading: loading || !current,
    retry: () => setAttempt((n) => n + 1),
  };
};

export default useTeamPokemon;
