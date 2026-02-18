import type { FieldState, SideState } from "../../types";

const TERRAINS = [
  { value: "", label: "None" },
  { value: "Electric", label: "Electric" },
  { value: "Grassy", label: "Grassy" },
  { value: "Misty", label: "Misty" },
  { value: "Psychic", label: "Psychic" },
];

const WEATHERS = [
  { value: "", label: "None" },
  { value: "Sun", label: "Sun" },
  { value: "Rain", label: "Rain" },
  { value: "Sand", label: "Sand" },
  { value: "Snow", label: "Snow" },
];

const RUIN_ABILITIES = [
  { key: "isTabletsOfRuin" as const, label: "Tablets (-Atk)" },
  { key: "isVesselOfRuin" as const, label: "Vessel (-SpAtk)" },
  { key: "isSwordOfRuin" as const, label: "Sword (-Def)" },
  { key: "isBeadsOfRuin" as const, label: "Beads (-SpDef)" },
];

const SIDE_EFFECTS: { key: keyof SideState; label: string }[] = [
  { key: "isHelpingHand", label: "Helping Hand" },
  { key: "isReflect", label: "Reflect" },
  { key: "isLightScreen", label: "Light Screen" },
  { key: "isAuroraVeil", label: "Aurora Veil" },
  { key: "isTailwind", label: "Tailwind" },
  { key: "isFriendGuard", label: "Friend Guard" },
  { key: "isSteelySpiritAlly", label: "Steely Spirit" },
  { key: "isPowerSpot", label: "Power Spot" },
  { key: "isBattery", label: "Battery" },
];

interface FieldPanelProps {
  fieldState: FieldState;
  onChange: (state: FieldState) => void;
}

const toggleBtnClass = (active: boolean) =>
  `px-1.5 py-0.5 text-xs rounded transition-colors ${
    active
      ? "bg-emerald-600 text-white"
      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:hover:bg-slate-600"
  }`;

const FieldPanel: React.FC<FieldPanelProps> = ({ fieldState, onChange }) => {
  const handleFieldChange = (key: string, value: string | boolean) => {
    onChange({ ...fieldState, [key]: value });
  };

  const handleSideChange = (
    sideKey: "attackerSide" | "defenderSide",
    effectKey: keyof SideState,
    value: boolean,
  ) => {
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
          {(["Singles", "Doubles"] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleFieldChange("gameType", type)}
              className={toggleBtnClass(fieldState.gameType === type) + " flex-1 py-1"}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Terrain */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Terrain</label>
        <div className="grid grid-cols-3 gap-0.5">
          {TERRAINS.map((t) => (
            <button
              key={t.value}
              onClick={() => handleFieldChange("terrain", t.value)}
              className={toggleBtnClass(fieldState.terrain === t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weather */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Weather</label>
        <div className="grid grid-cols-3 gap-0.5">
          {WEATHERS.map((w) => (
            <button
              key={w.value}
              onClick={() => handleFieldChange("weather", w.value)}
              className={toggleBtnClass(fieldState.weather === w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ruin Abilities */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Ruin Abilities</label>
        <div className="grid grid-cols-2 gap-0.5">
          {RUIN_ABILITIES.map((r) => (
            <button
              key={r.key}
              onClick={() => handleFieldChange(r.key, !fieldState[r.key])}
              className={toggleBtnClass(!!fieldState[r.key])}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gravity */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Global</label>
        <button
          onClick={() => handleFieldChange("isGravity", !fieldState.isGravity)}
          className={toggleBtnClass(!!fieldState.isGravity)}
        >
          Gravity
        </button>
      </div>

      {/* Attacker / Defender side-by-side */}
      <div className="grid grid-cols-2 gap-2">
        <SideEffectsBlock
          label="Attacker"
          side={fieldState.attackerSide}
          onSideChange={(key, val) => handleSideChange("attackerSide", key, val)}
        />
        <SideEffectsBlock
          label="Defender"
          side={fieldState.defenderSide}
          onSideChange={(key, val) => handleSideChange("defenderSide", key, val)}
        />
      </div>
    </div>
  );
};

interface SideEffectsBlockProps {
  label: string;
  side: SideState;
  onSideChange: (key: keyof SideState, value: boolean) => void;
}

const SideEffectsBlock: React.FC<SideEffectsBlockProps> = ({ label, side, onSideChange }) => (
  <div>
    <label className="text-xs text-gray-500 block mb-1">{label}</label>
    <div className="flex flex-col gap-0.5">
      {SIDE_EFFECTS.map((effect) => {
        const active = !!side[effect.key];
        return (
          <button
            key={effect.key}
            onClick={() => onSideChange(effect.key, !active)}
            className={`w-full text-left px-1.5 py-0.5 text-xs rounded transition-colors ${
              active
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:hover:bg-slate-600"
            }`}
          >
            {effect.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default FieldPanel;
