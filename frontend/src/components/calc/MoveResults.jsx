import React from 'react';
import { formatDamageRange, getDamageColor } from '../../utils/calcUtils';

const MoveResults = ({ results, moves, selectedIndex, onSelectIndex, side, isActive = true }) => {
  if (!results || results.length === 0) {
    return (
      <div className="space-y-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50">
            <span className="text-gray-600 text-xs">-</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {moves.map((move, i) => {
        if (!move.name) {
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50">
              <span className="text-gray-600 text-xs">-</span>
            </div>
          );
        }

        const result = results[i];
        const range = result ? formatDamageRange(result) : '';
        const colorClass = getDamageColor(result);
        const isSelected = selectedIndex === i && isActive;

        return (
          <button
            key={i}
            onClick={() => onSelectIndex(i)}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
              isSelected
                ? 'bg-emerald-600/20 border border-emerald-600/50'
                : selectedIndex === i && !isActive
                  ? 'bg-slate-700/30 border border-slate-600/50'
                  : 'bg-slate-800/50 border border-transparent hover:bg-slate-700/50'
            }`}
          >
            <span className="text-gray-300 text-xs truncate flex-1">{move.name}</span>
            <span className={`text-xs font-mono ${colorClass}`}>{range}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MoveResults;
