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
      {slots.map((name, i) =>
        loading ? (
          <div
            key={i}
            className="animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
            style={{ width: px, height: px }}
          />
        ) : name ? (
          <PokemonSprite key={`${name}-${i}`} name={name} size={size} />
        ) : (
          <div
            key={i}
            className="rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600"
            style={{ width: px, height: px }}
          />
        )
      )}
    </div>
  );
};

export default PokemonTeam;
