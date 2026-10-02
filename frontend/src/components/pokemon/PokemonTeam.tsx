import React, { useState, useEffect } from "react";
import PokemonSprite from "./PokemonSprite";
import * as pokepasteService from "../../services/pokepasteService";

interface PokemonTeamProps {
  pokemonNames?: string[];
  pokepasteUrl?: string;
  size?: "sm" | "md" | "lg";
}

const TEAM_SIZE = 6;

const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 64,
} as const;

const PokemonTeam: React.FC<PokemonTeamProps> = ({
  pokemonNames,
  pokepasteUrl,
  size = "md",
}) => {
  const [resolvedNames, setResolvedNames] = useState<string[]>(pokemonNames || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pokemonNames) {
      setResolvedNames(pokemonNames);
      return;
    }

    if (!pokepasteUrl) {
      setResolvedNames([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    pokepasteService.getPokemonNames(pokepasteUrl, 6).then((names) => {
      if (!cancelled) {
        setResolvedNames(names);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setResolvedNames([]);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [pokemonNames, pokepasteUrl]);

  const px = SIZE_MAP[size];
  const slots = Array.from({ length: TEAM_SIZE }, (_, i) => resolvedNames[i] || null);

  return (
    <div className="flex flex-row items-center gap-1">
      {/* Each slot is px wide but may shrink so the row fits narrow containers */}
      {slots.map((name, i) => (
        <div key={loading ? i : `${name}-${i}`} className="min-w-0" style={{ width: px }}>
          {loading ? (
            <div className="aspect-square w-full animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          ) : name ? (
            <PokemonSprite name={name} size={size} fluid />
          ) : (
            <div className="aspect-square w-full rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600" />
          )}
        </div>
      ))}
    </div>
  );
};

export default PokemonTeam;
