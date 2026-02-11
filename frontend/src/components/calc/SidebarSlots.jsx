import React from 'react';
import PokemonSprite from '../PokemonSprite';

const SidebarSlots = ({ teamPokemon, activeSpecies, onSelect }) => {
  if (!teamPokemon || teamPokemon.length === 0) return null;

  return (
    <div className="flex gap-1 mb-2">
      {teamPokemon.map((mon, i) => {
        const isActive = mon.name === activeSpecies;

        return (
          <button
            key={i}
            onClick={() => onSelect(mon)}
            className={`rounded border transition-all ${
              isActive
                ? 'border-emerald-500 bg-emerald-500/20'
                : 'border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700'
            }`}
            title={mon.name || `Slot ${i + 1}`}
          >
            <PokemonSprite
              name={mon.name}
              size="sm"
              noContainer
              fallbackText={String(i + 1)}
            />
          </button>
        );
      })}
    </div>
  );
};

export default SidebarSlots;
