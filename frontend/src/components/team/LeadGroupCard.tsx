import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import PokemonSprite from "../pokemon/PokemonSprite";
import PokemonTeam from "../pokemon/PokemonTeam";
import type { OpponentTeam } from "./OpponentTeamCard";
import type { Composition } from "../../types";

interface LeadGroupEntry {
  opponentTeam: OpponentTeam;
  composition: Composition;
}

interface LeadGroupCardProps {
  lead1: string;
  lead2: string;
  teams: LeadGroupEntry[];
}

const LeadGroupCard: React.FC<LeadGroupCardProps> = ({
  lead1,
  lead2,
  teams,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.02]">
      {/* Header: Lead pair + count (clickable) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
        style={{ borderRadius: isOpen ? "0.5rem 0.5rem 0 0" : "0.5rem" }}
      >
        <div className="w-20">
          <ChevronRight
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        </div>
        <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-1 dark:border-brand-400/30 dark:bg-brand-200/10">
          <div className="flex gap-0.5">
            <PokemonSprite name={lead1} size="lg" showTooltip />
            <PokemonSprite name={lead2} size="lg" showTooltip />
          </div>
        </div>
        <div className="flex w-20 justify-end">
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {teams.length} {teams.length === 1 ? "MU" : "MUs"}
          </span>
        </div>
      </button>

      {/* Body: Opponent teams list */}
      {isOpen && (
        <div className={`grid grid-cols-1 gap-px border-t border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 ${teams.length >= 5 ? "sm:grid-cols-3" : ""}`}>
          {teams.map(({ opponentTeam }, i) => (
            <div
              key={`${opponentTeam.id}-${i}`}
              className={`flex justify-center px-3 py-2 ${i % 2 === 1 ? "bg-gray-50 dark:bg-white/[0.03]" : "bg-white dark:bg-white/[0.02]"}`}
            >
              {opponentTeam.pokepaste && (
                <PokemonTeam pokepasteUrl={opponentTeam.pokepaste} size="sm" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadGroupCard;
