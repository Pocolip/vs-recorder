import { useMemo } from "react";
import Select, { type SingleValue } from "react-select";
import { getMoveList, reactSelectCompactStyles } from "../../utils/calcUtils";
import type { MoveState } from "../../types";

interface SelectOption {
  value: string;
  label: string;
}

interface MoveSlotProps {
  move: MoveState;
  index: number;
  onChange: (move: MoveState) => void;
}

const MoveSlot: React.FC<MoveSlotProps> = ({ move, index, onChange }) => {
  const moveOptions = useMemo(() => {
    return getMoveList().map((name) => ({ value: name, label: name }));
  }, []);

  const selectedOption = move.name ? { value: move.name, label: move.name } : null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 text-xs w-3">{index + 1}</span>
      <div className="flex-1">
        <Select<SelectOption>
          value={selectedOption}
          onChange={(opt: SingleValue<SelectOption>) => onChange({ ...move, name: opt ? opt.value : "", bpOverride: null })}
          options={moveOptions}
          styles={reactSelectCompactStyles as any}
          placeholder="Move..."
          isClearable
          isSearchable
          menuPlacement="auto"
        />
      </div>
      <input
        type="number"
        min={0}
        max={999}
        value={move.bpOverride ?? ""}
        onChange={(e) =>
          onChange({ ...move, bpOverride: e.target.value ? parseInt(e.target.value) : null })
        }
        placeholder="BP"
        className="w-11 bg-slate-700 border border-slate-600 rounded text-gray-200 text-xs text-center py-0.5 focus:border-emerald-500 focus:outline-none placeholder-gray-600"
        title="Base Power override"
      />
      <label className="flex items-center gap-0.5 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={move.crit}
          onChange={(e) => onChange({ ...move, crit: e.target.checked })}
          className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
        />
        Crit
      </label>
    </div>
  );
};

export default MoveSlot;
