import React from 'react';

const GENS = [
  { num: 3, label: 'III' },
  { num: 4, label: 'IV' },
  { num: 5, label: 'V' },
  { num: 6, label: 'VI' },
  { num: 7, label: 'VII' },
  { num: 8, label: 'VIII' },
  { num: 9, label: 'IX' },
];

const GenerationPicker = ({ value = 9, onChange }) => {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400 mr-1">Gen:</span>
      {GENS.map(g => {
        const isActive = g.num === value;
        const isDisabled = g.num !== 9;
        return (
          <button
            key={g.num}
            onClick={() => !isDisabled && onChange(g.num)}
            disabled={isDisabled}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isActive
                ? 'bg-emerald-600 text-white'
                : isDisabled
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
            title={isDisabled ? 'Coming soon' : `Generation ${g.label}`}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
};

export default GenerationPicker;
