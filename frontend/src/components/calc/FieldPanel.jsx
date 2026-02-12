import React from 'react';

const TERRAINS = [
  { value: '', label: 'None' },
  { value: 'Electric', label: 'Electric' },
  { value: 'Grassy', label: 'Grassy' },
  { value: 'Misty', label: 'Misty' },
  { value: 'Psychic', label: 'Psychic' },
];

const WEATHERS = [
  { value: '', label: 'None' },
  { value: 'Sun', label: 'Sun' },
  { value: 'Rain', label: 'Rain' },
  { value: 'Sand', label: 'Sand' },
  { value: 'Snow', label: 'Snow' },
];

const RUIN_ABILITIES = [
  { key: 'isTabletsOfRuin', label: 'Tablets of Ruin', desc: 'Atk of others ×0.75' },
  { key: 'isVesselOfRuin', label: 'Vessel of Ruin', desc: 'SpA of others ×0.75' },
  { key: 'isSwordOfRuin', label: 'Sword of Ruin', desc: 'Def of others ×0.75' },
  { key: 'isBeadsOfRuin', label: 'Beads of Ruin', desc: 'SpD of others ×0.75' },
];

const SIDE_EFFECTS = [
  { key: 'isHelpingHand', label: 'Helping Hand' },
  { key: 'isReflect', label: 'Reflect' },
  { key: 'isLightScreen', label: 'Light Screen' },
  { key: 'isAuroraVeil', label: 'Aurora Veil' },
  { key: 'isTailwind', label: 'Tailwind' },
  { key: 'isFriendGuard', label: 'Friend Guard' },
  { key: 'isSteelySpiritAlly', label: 'Steely Spirit' },
  { key: 'isPowerSpot', label: 'Power Spot' },
  { key: 'isBattery', label: 'Battery' },
];

const FieldPanel = ({ fieldState, onChange }) => {
  const handleFieldChange = (key, value) => {
    onChange({ ...fieldState, [key]: value });
  };

  const handleSideChange = (sideKey, effectKey, value) => {
    onChange({
      ...fieldState,
      [sideKey]: {
        ...fieldState[sideKey],
        [effectKey]: value,
      },
    });
  };

  return (
    <div className="space-y-3">
      {/* Format toggle */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Format</label>
        <div className="flex gap-1">
          {['Singles', 'Doubles'].map(type => (
            <button
              key={type}
              onClick={() => handleFieldChange('gameType', type)}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                fieldState.gameType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Terrain */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Terrain</label>
        <div className="grid grid-cols-2 gap-0.5">
          {TERRAINS.map(t => (
            <button
              key={t.value}
              onClick={() => handleFieldChange('terrain', t.value)}
              className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                fieldState.terrain === t.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weather */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Weather</label>
        <div className="grid grid-cols-2 gap-0.5">
          {WEATHERS.map(w => (
            <button
              key={w.value}
              onClick={() => handleFieldChange('weather', w.value)}
              className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                fieldState.weather === w.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ruin Abilities */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Ruin Abilities</label>
        <div className="space-y-0.5">
          {RUIN_ABILITIES.map(r => (
            <label key={r.key} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={fieldState[r.key] || false}
                onChange={e => handleFieldChange(r.key, e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
              />
              <span className="text-xs text-gray-300">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Global effects */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Global</label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={fieldState.isGravity || false}
            onChange={e => handleFieldChange('isGravity', e.target.checked)}
            className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
          />
          <span className="text-xs text-gray-300">Gravity</span>
        </label>
      </div>

      {/* Attacker Side (p1) */}
      <SideEffectsBlock
        label="Attacker Side"
        side={fieldState.attackerSide}
        onSideChange={(key, val) => handleSideChange('attackerSide', key, val)}
      />

      {/* Defender Side (p2) */}
      <SideEffectsBlock
        label="Defender Side"
        side={fieldState.defenderSide}
        onSideChange={(key, val) => handleSideChange('defenderSide', key, val)}
      />
    </div>
  );
};

const SideEffectsBlock = ({ label, side, onSideChange }) => (
  <div>
    <label className="text-xs text-gray-500 block mb-1">{label}</label>
    <div className="space-y-0.5">
      {SIDE_EFFECTS.map(effect => (
        <label key={effect.key} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={side[effect.key] || false}
            onChange={e => onSideChange(effect.key, e.target.checked)}
            className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
          />
          <span className="text-xs text-gray-300">{effect.label}</span>
        </label>
      ))}
    </div>
  </div>
);

export default FieldPanel;
