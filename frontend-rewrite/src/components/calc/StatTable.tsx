import {
  STAT_NAMES,
  STAT_LABELS,
  calcFinalStat,
  getNatureInfo,
  getBaseStats,
} from "../../utils/calcUtils";
import type { StatSpread, BoostSpread } from "../../types";

const BOOST_OPTIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

interface StatTableProps {
  species: string;
  evs: StatSpread;
  ivs: StatSpread;
  boosts: BoostSpread;
  nature: string;
  level: number;
  onChange: (changes: Partial<{ evs: StatSpread; ivs: StatSpread; boosts: BoostSpread }>) => void;
}

const StatTable: React.FC<StatTableProps> = ({ species, evs, ivs, boosts, nature, level, onChange }) => {
  const baseStats = getBaseStats(species);
  const natureInfo = getNatureInfo(nature);
  const evTotal = Object.values(evs).reduce((sum, v) => sum + v, 0);
  const evRemaining = 510 - evTotal;

  const handleEvChange = (stat: keyof StatSpread, val: string) => {
    const num = Math.min(252, Math.max(0, parseInt(val) || 0));
    onChange({ evs: { ...evs, [stat]: num } });
  };

  const handleIvChange = (stat: keyof StatSpread, val: string) => {
    const num = Math.min(31, Math.max(0, parseInt(val) || 0));
    onChange({ ivs: { ...ivs, [stat]: num } });
  };

  const handleBoostChange = (stat: keyof BoostSpread, val: string) => {
    onChange({ boosts: { ...boosts, [stat]: parseInt(val) } });
  };

  return (
    <div className="text-xs">
      {/* Header */}
      <div className="grid grid-cols-[3rem_2.5rem_2.5rem_3rem_3rem_3rem] gap-0.5 mb-0.5">
        <div className="text-gray-500 font-medium"></div>
        <div className="text-gray-500 font-medium text-center">Base</div>
        <div className="text-gray-500 font-medium text-center">IV</div>
        <div className="text-gray-500 font-medium text-center">EV</div>
        <div className="text-gray-500 font-medium text-center">+/-</div>
        <div className="text-gray-500 font-medium text-center">Total</div>
      </div>

      {/* Stat rows */}
      {STAT_NAMES.map((stat) => {
        const base = baseStats ? baseStats[stat] : 0;
        const finalStat = baseStats
          ? calcFinalStat(stat, base, ivs[stat], evs[stat], level, nature)
          : 0;

        const isNaturePlus = natureInfo.plus === stat;
        const isNatureMinus = natureInfo.minus === stat;
        const hasBoost = stat !== "hp";

        return (
          <div
            key={stat}
            className="grid grid-cols-[3rem_2.5rem_2.5rem_3rem_3rem_3rem] gap-0.5 mb-0.5"
          >
            {/* Stat label */}
            <div
              className={`flex items-center font-medium ${
                isNaturePlus ? "text-red-400" : isNatureMinus ? "text-blue-400" : "text-gray-300"
              }`}
            >
              {STAT_LABELS[stat]}
              {isNaturePlus && "+"}
              {isNatureMinus && "-"}
            </div>

            {/* Base */}
            <div className="text-gray-400 text-center flex items-center justify-center">
              {base || "-"}
            </div>

            {/* IV */}
            <input
              type="number"
              min={0}
              max={31}
              value={ivs[stat]}
              onChange={(e) => handleIvChange(stat, e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded text-gray-200 text-center w-full px-0.5 py-0.5 focus:border-emerald-500 focus:outline-none"
            />

            {/* EV */}
            <input
              type="number"
              min={0}
              max={252}
              step={4}
              value={evs[stat]}
              onChange={(e) => handleEvChange(stat, e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded text-gray-200 text-center w-full px-0.5 py-0.5 focus:border-emerald-500 focus:outline-none"
            />

            {/* Boost */}
            {hasBoost ? (
              <select
                value={boosts[stat as keyof BoostSpread] || 0}
                onChange={(e) => handleBoostChange(stat as keyof BoostSpread, e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded text-gray-200 text-center text-xs py-0.5 focus:border-emerald-500 focus:outline-none"
              >
                {BOOST_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b > 0 ? `+${b}` : b}
                  </option>
                ))}
              </select>
            ) : (
              <div />
            )}

            {/* Total */}
            <div className="text-emerald-400 font-mono text-center flex items-center justify-center">
              {finalStat || "-"}
            </div>
          </div>
        );
      })}

      {/* EV total */}
      <div className="flex justify-between mt-1 pt-1 border-t border-slate-700">
        <span className="text-gray-500">EVs:</span>
        <span className={evTotal > 510 ? "text-red-400" : "text-gray-400"}>
          {evTotal}/510 ({evRemaining >= 0 ? evRemaining : 0} left)
        </span>
      </div>
    </div>
  );
};

export default StatTable;
