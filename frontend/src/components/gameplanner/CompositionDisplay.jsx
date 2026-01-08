// src/components/gameplanner/CompositionDisplay.jsx
import React from 'react';
import { Trash2 } from 'lucide-react';
import PokemonSprite from '../PokemonSprite';

const CompositionDisplay = ({ composition, onDelete, readOnly = false }) => {
  if (!composition) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors">
      {/* Lead Pokemon */}
      <div className="flex gap-1">
        <PokemonSprite name={composition.lead1} size="sm" noContainer={false} />
        <PokemonSprite name={composition.lead2} size="sm" noContainer={false} />
      </div>

      {/* Arrow */}
      <span className="text-gray-500 text-sm">→</span>

      {/* Back Pokemon */}
      <div className="flex gap-1">
        <PokemonSprite name={composition.back1} size="sm" noContainer={false} />
        <PokemonSprite name={composition.back2} size="sm" noContainer={false} />
      </div>

      {/* Notes */}
      {composition.notes && (
        <span className="text-xs text-gray-400 flex-1 truncate ml-2">
          {composition.notes}
        </span>
      )}

      {/* Delete Button */}
      {!readOnly && onDelete && (
        <button
          onClick={onDelete}
          className="ml-auto p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
          title="Delete composition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default CompositionDisplay;
