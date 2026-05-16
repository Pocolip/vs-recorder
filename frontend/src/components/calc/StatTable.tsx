import {
  STAT_NAMES,
  STAT_LABELS,
  calcFinalStat,
  getNatureInfo,
  getBaseStats,
  spsToEvs,
  CHAMPIONS_GEN,
} from "../../utils/calcUtils";
import type { StatSpread, BoostSpread } from "../../types";
import type { BoostedStat } from "../../utils/calcUtils";

const BOOST_OPTIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

const SP_MAX_PER_STAT = 32;
const SP_TOTAL_MAX = 66;

interface StatTableProps {
  species: string;
  evs: StatSpread;
  ivs: StatSpread;
  sps: StatSpread;
  boosts: BoostSpread;
  nature: string;
  level: number;
  gen: number;
  boostedStat: BoostedStat | null;
  onChange: (changes: Partial<{ evs: StatSpread; ivs: StatSpread; sps: StatSpread; boosts: BoostSpread; boostedStat: BoostedStat | null }>) => void;
}

const StatTable: React.FC<StatTableProps> = ({ species, evs, ivs, sps, boosts, nature, level, gen, boostedStat, onChange }) => {
  const baseStats = getBaseStats(species);
  const natureInfo = getNatureInfo(nature);
  const isChampions = gen === CHAMPIONS_GEN;
  const evTotal = Object.values(evs).reduce((sum, v) => sum + v, 0);
  const evRemaining = 510 - evTotal;
  const spTotal = Object.values(sps).reduce((sum, v) => sum + v, 0);
  const spRemaining = SP_TOTAL_MAX - spTotal;

  // For stat-display math in Champions mode, project SPs -> EV-equivalents
  // and pin IVs to 31 (the engine ignores the editable IV inputs in this mode).
  const displayEvs = isChampions ? spsToEvs(sps) : evs;
  const displayIvs = isChampions ? { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } : ivs;

  const handleEvChange = (stat: keyof StatSpread, val: string) => {
    const num = Math.min(252, Math.max(0, parseInt(val) || 0));
    onChange({ evs: { ...evs, [stat]: num } });
  };

  const handleIvChange = (stat: keyof StatSpread, val: string) => {
    const num = Math.min(31, Math.max(0, parseInt(val) || 0));
    onChange({ ivs: { ...ivs, [stat]: num } });
  };

  const handleSpChange = (stat: keyof StatSpread, val: string) => {
    const num = Math.min(SP_MAX_PER_STAT, Math.max(0, parseInt(val) || 0));
    onChange({ sps: { ...sps, [stat]: num } });
  };

  const handleBoostChange = (stat: keyof BoostSpread, val: string) => {
    onChange({ boosts: { ...boosts, [stat]: parseInt(val) } });
  };

  const gridCols = isChampions
    ? "grid-cols-[3rem_2.5rem_3rem_3rem_1.5rem_3rem]"
    : "grid-cols-[3rem_2.5rem_2.5rem_3rem_3rem_1.5rem_3rem]";

  return (
    <div className="text-xs">
      {/* Header */}
      <div className={`grid ${gridCols} gap-0.5 mb-0.5`}>
        <div className="text-gray-500 font-medium"></div>
        <div className="text-gray-500 font-medium text-center">Base</div>
        {!isChampions && <div className="text-gray-500 font-medium text-center">IV</div>}
        <div className="text-gray-500 font-medium text-center">{isChampions ? "SP" : "EV"}</div>
        <div className="text-gray-500 font-medium text-center">+/-</div>
        <div className="text-gray-500 font-medium text-center" title="Booster Energy / Proto / Quark">BE</div>
        <div className="text-gray-500 font-medium text-center">Total</div>
      </div>

      {/* Stat rows */}
      {STAT_NAMES.map((stat) => {
        const base = baseStats ? baseStats[stat] : 0;
        const finalStat = baseStats
          ? calcFinalStat(stat, base, displayIvs[stat], displayEvs[stat], level, nature)
          : 0;

        const isNaturePlus = natureInfo.plus === stat;
        const isNatureMinus = natureInfo.minus === stat;
        const hasBoost = stat !== "hp";

        return (
          <div
            key={stat}
            className={`grid ${gridCols} gap-0.5 mb-0.5`}
          >
            {/* Stat label */}
            <div
              className={`flex items-center font-medium ${
                isNaturePlus ? "text-red-400" : isNatureMinus ? "text-blue-400" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {STAT_LABELS[stat]}
              {isNaturePlus && "+"}
              {isNatureMinus && "-"}
            </div>

            {/* Base */}
            <div className="text-gray-500 dark:text-gray-400 text-center flex items-center justify-center">
              {base || "-"}
            </div>

            {/* IV (hidden in Champions) */}
            {!isChampions && (
              <input
                type="number"
                min={0}
                max={31}
                value={ivs[stat]}
                onChange={(e) => handleIvChange(stat, e.target.value)}
                className="bg-white border border-gray-300 text-gray-800 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 rounded text-center w-full px-0.5 py-0.5 focus:border-emerald-500 focus:outline-none"
              />
            )}

            {/* EV / SP */}
            {isChampions ? (
              <input
                type="number"
                min={0}
                max={SP_MAX_PER_STAT}
                value={sps[stat]}
                onChange={(e) => handleSpChange(stat, e.target.value)}
                className="bg-white border border-gray-300 text-gray-800 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 rounded text-center w-full px-0.5 py-0.5 focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <input
                type="number"
                min={0}
                max={252}
                step={4}
                value={evs[stat]}
                onChange={(e) => handleEvChange(stat, e.target.value)}
                className="bg-white border border-gray-300 text-gray-800 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 rounded text-center w-full px-0.5 py-0.5 focus:border-emerald-500 focus:outline-none"
              />
            )}

            {/* Boost */}
            {hasBoost ? (
              <select
                value={boosts[stat as keyof BoostSpread] || 0}
                onChange={(e) => handleBoostChange(stat as keyof BoostSpread, e.target.value)}
                className="bg-white border border-gray-300 text-gray-800 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 rounded text-center text-xs py-0.5 focus:border-emerald-500 focus:outline-none"
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

            {/* Booster Energy checkbox */}
            {hasBoost ? (
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={boostedStat === stat}
                  onChange={() =>
                    onChange({ boostedStat: boostedStat === stat ? null : (stat as BoostedStat) })
                  }
                  className="rounded border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
                  title={`Booster Energy: boost ${STAT_LABELS[stat]}`}
                />
              </div>
            ) : (
              <div />
            )}

            {/* Total */}
            <div className="text-emerald-600 dark:text-emerald-400 font-mono text-center flex items-center justify-center">
              {finalStat || "-"}
            </div>
          </div>
        );
      })}

      {/* Total counter */}
      <div className="flex justify-between mt-1 pt-1 border-t border-gray-200 dark:border-slate-700">
        <span className="text-gray-500">{isChampions ? "SPs:" : "EVs:"}</span>
        {isChampions ? (
          <span className={spTotal > SP_TOTAL_MAX ? "text-red-400" : "text-gray-500 dark:text-gray-400"}>
            {spTotal}/{SP_TOTAL_MAX} ({spRemaining >= 0 ? spRemaining : 0} left)
          </span>
        ) : (
          <span className={evTotal > 510 ? "text-red-400" : "text-gray-500 dark:text-gray-400"}>
            {evTotal}/510 ({evRemaining >= 0 ? evRemaining : 0} left)
          </span>
        )}
      </div>
    </div>
  );
};

export default StatTable;
