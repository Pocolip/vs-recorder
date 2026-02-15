import { Save } from "lucide-react";
import type { calculate } from "@smogon/calc";

type CalcResult = ReturnType<typeof calculate>;

interface MainResultProps {
  result: CalcResult | null;
  onSave: ((desc: string) => void) | null;
  saving: boolean;
}

const MainResult: React.FC<MainResultProps> = ({ result, onSave, saving }) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!result) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
        <p className="text-gray-500 text-sm">Select Pokemon and moves to see damage calculations</p>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let desc: string, damage: any, range: [number, number];
  try {
    desc = result.desc();
    damage = result.damage;
    range = result.range();
  } catch {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
        <p className="text-gray-500 text-sm">Error calculating damage</p>
      </div>
    );
  }

  const defenderHP = result.defender.maxHP();
  const minPct = defenderHP > 0 ? ((range[0] / defenderHP) * 100).toFixed(1) : "0";
  const maxPct = defenderHP > 0 ? ((range[1] / defenderHP) * 100).toFixed(1) : "0";

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
      {/* Main description + inline save */}
      <p className="text-gray-200 text-sm leading-relaxed mb-2">
        <span
          onClick={() => handleCopy(desc)}
          className="cursor-pointer hover:text-white transition-colors"
          title="Click to copy"
        >
          {desc}
        </span>
        {onSave && (
          <button
            onClick={() => onSave(desc)}
            disabled={saving}
            className="inline-flex items-center align-middle ml-1.5 p-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors"
            title="Save to Pokemon Notes"
          >
            <Save className={`w-3 h-3 ${saving ? "animate-pulse" : ""}`} />
          </button>
        )}
      </p>

      {/* Damage range bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>
            {range[0]}-{range[1]} HP ({minPct}-{maxPct}%)
          </span>
          <span>/ {defenderHP} HP</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
            style={{ width: `${Math.min(100, parseFloat(maxPct))}%` }}
          />
        </div>
      </div>

      {/* Damage rolls */}
      {Array.isArray(damage) && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Rolls:</div>
          <div className="text-xs text-gray-400 font-mono break-all leading-relaxed">
            {damage.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainResult;
