import React, { useState, useEffect } from "react";
import * as pokemonService from "../../services/pokemonService";

interface PokemonSpriteProps {
  name: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
  /** Fill the parent's width (square) instead of a fixed pixel size */
  fluid?: boolean;
}

const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 64,
} as const;

const PokemonSpriteInner: React.FC<PokemonSpriteProps> = ({
  name,
  size = "md",
  showTooltip = true,
  className = "",
  fluid = false,
}) => {
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(name);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const px = SIZE_MAP[size];
  const boxStyle = fluid ? undefined : { width: px, height: px };
  const fluidClass = fluid ? "w-full aspect-square" : "";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      try {
        const data = await pokemonService.getPokemon(name);
        if (cancelled) return;
        setSpriteUrl(data.sprite || null);
        setDisplayName(data.name);
        setStatus(data.sprite ? "loaded" : "error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    load();
    return () => { cancelled = true; };
  }, [name]);

  if (status === "loading") {
    return (
      <div
        className={`animate-pulse rounded-full bg-gray-200 dark:bg-gray-700 ${fluidClass} ${className}`}
        style={boxStyle}
      />
    );
  }

  if (status === "error" || !spriteUrl) {
    const initial = displayName.charAt(0).toUpperCase();
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-gray-300 text-gray-600 font-semibold dark:bg-gray-600 dark:text-gray-300 ${fluidClass} ${className}`}
        style={{ ...boxStyle, fontSize: px * 0.4 }}
        title={showTooltip ? displayName : undefined}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={spriteUrl}
      alt={displayName}
      title={showTooltip ? displayName : undefined}
      width={px}
      height={px}
      className={`object-contain ${fluid ? "w-full h-auto aspect-square" : ""} ${className}`}
      onError={() => setStatus("error")}
    />
  );
};

const PokemonSprite = React.memo(PokemonSpriteInner, (prev, next) => {
  return prev.name === next.name && prev.size === next.size && prev.showTooltip === next.showTooltip && prev.className === next.className && prev.fluid === next.fluid;
});

PokemonSprite.displayName = "PokemonSprite";

export default PokemonSprite;
