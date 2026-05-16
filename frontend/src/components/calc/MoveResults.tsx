import { formatDamageRange, getDamageColor } from "../../utils/calcUtils";
import type { MoveState } from "../../types";
import type { calculate } from "@smogon/calc";

type CalcResult = ReturnType<typeof calculate> | null;

interface MoveResultsProps {
  results: CalcResult[] | undefined;
  moves: MoveState[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  side: "p1" | "p2";
  isActive?: boolean;
}

const MoveResults: React.FC<MoveResultsProps> = ({
  results,
  moves,
  selectedIndex,
  onSelectIndex,
  isActive = true,
}) => {
  // Always render move names, even when calc failed (e.g. Mega forms not in
  // Smogon's Gen 9 dex). The damage range just stays blank in that case.
  const filledMoves = [...moves];
  while (filledMoves.length < 4) {
    filledMoves.push({ name: "", crit: false, bpOverride: null });
  }

  // Map move index (in full state.moves) to its result index (results only
  // contains entries for moves with names — see useDamageCalc filter).
  let resultCursor = 0;
  const resultByMoveIndex: (ReturnType<typeof calculate> | null)[] = filledMoves.map((m) => {
    if (!m.name) return null;
    return results?.[resultCursor++] ?? null;
  });

  return (
    <div className="space-y-1">
      {filledMoves.map((move, i) => {
        if (!move.name) {
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-gray-100 dark:bg-slate-800/50">
              <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
            </div>
          );
        }

        const result = resultByMoveIndex[i];
        const range = result ? formatDamageRange(result) : "";
        const colorClass = getDamageColor(result);
        const isSelected = selectedIndex === i && isActive;

        return (
          <button
            key={i}
            onClick={() => onSelectIndex(i)}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left transition-colors ${
              isSelected
                ? "bg-emerald-600/20 border border-emerald-600/50"
                : selectedIndex === i && !isActive
                  ? "bg-gray-200/50 border border-gray-300/50 dark:bg-slate-700/30 dark:border-slate-600/50"
                  : "bg-gray-100 border border-transparent hover:bg-gray-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <span className="text-gray-700 dark:text-gray-300 text-xs truncate flex-1">{move.name}</span>
            <span className={`text-xs font-mono ${colorClass}`}>{range}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MoveResults;
