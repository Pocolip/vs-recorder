import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAndParse, type PokemonData } from "../services/pokepasteService";
import { createDefaultPokemonState, normalizeSpeciesName } from "../utils/calcUtils";
import { pasteToCalc } from "../utils/pasteToCalc";
import type { CalcSnapshot } from "../context/CalcStateContext";
import type { PokemonState } from "../types";

export function useCalcTeamSets(
  paste: string | null,
  gen: number,
  snapshot: CalcSnapshot | undefined,
  replaceAttacker: (state: PokemonState) => void,
) {
  const [teamPokemon, setTeamPokemon] = useState<PokemonData[]>([]);
  const [sourcePaste, setSourcePaste] = useState(snapshot?.sourcePaste ?? null);
  const [selectedTeamMember, setSelectedTeamMember] = useState(snapshot?.selectedTeamMember ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = useRef({ sourcePaste, selectedTeamMember, gen, replaceAttacker });
  current.current = { sourcePaste, selectedTeamMember, gen, replaceAttacker };

  useEffect(() => {
    let cancelled = false;
    setTeamPokemon([]);
    setError(null);
    const changed = current.current.sourcePaste !== paste;
    if (changed && current.current.selectedTeamMember) {
      current.current.replaceAttacker(createDefaultPokemonState());
    }
    if (!paste) {
      setSourcePaste(null);
      setSelectedTeamMember(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAndParse(paste).then((members) => {
      if (cancelled) return;
      if (members.length === 0) throw new Error("This paste has no Pokémon sets.");
      setTeamPokemon(members);
      const selection = current.current.selectedTeamMember;
      if (changed && selection) {
        const member = members.find((m) => normalizeSpeciesName(m.name) === selection) ?? members[0];
        current.current.replaceAttacker(pasteToCalc(member, current.current.gen));
        setSelectedTeamMember(normalizeSpeciesName(member.name));
      }
      setSourcePaste(paste);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load team sets.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [paste, attempt]);

  const selectMember = useCallback((member: PokemonData) => {
    setSelectedTeamMember(normalizeSpeciesName(member.name));
    current.current.replaceAttacker(pasteToCalc(member, current.current.gen));
  }, []);
  const clearSelection = useCallback(() => {
    // Also update the ref immediately, so an in-flight paste cannot replace a preset.
    current.current.selectedTeamMember = null;
    setSelectedTeamMember(null);
  }, []);

  return {
    teamPokemon, sourcePaste, selectedTeamMember, loading, error,
    selectMember, clearSelection, retry: () => setAttempt((n) => n + 1),
  };
}
