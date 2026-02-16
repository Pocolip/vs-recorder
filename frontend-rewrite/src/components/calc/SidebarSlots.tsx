import PokemonSprite from "../pokemon/PokemonSprite";
import type { PokemonData as PokemonFromPaste } from "../../services/pokepasteService";

interface SidebarSlotsProps {
  teamPokemon: PokemonFromPaste[];
  activeSpecies: string;
  onSelect: (mon: PokemonFromPaste) => void;
}

const SidebarSlots: React.FC<SidebarSlotsProps> = ({ teamPokemon, activeSpecies, onSelect }) => {
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
                ? "border-emerald-500 bg-emerald-500/20"
                : "border-gray-300 bg-gray-100 hover:border-gray-400 hover:bg-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            }`}
            title={mon.name || `Slot ${i + 1}`}
          >
            <PokemonSprite name={mon.name} size="sm" />
          </button>
        );
      })}
    </div>
  );
};

export default SidebarSlots;
