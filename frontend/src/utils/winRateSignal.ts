/**
 * Whether a win rate really differs from a reference, and by how much, given how
 * many games it comes from. Used to colour rates by what they mean rather than by
 * fixed bands: a 3-point gap over 5,000 simulated games is real, the same gap over
 * 20 replays is noise.
 *
 * Rates are 0-1. Differences are reported in percentage points.
 */

/** 0: within the noise for its games. 1: small (< 5 points). 2: clear (5-10). 3: large (10+). */
export type SignalLevel = 0 | 1 | 2 | 3;

export interface Signal {
  /** The difference in percentage points (rate minus reference). */
  points: number;
  /** The 95% margin of error of `points`, in points; Infinity when there's nothing to go on. */
  margin: number;
  /** -1 below the reference, 1 above, 0 when it's within the noise. */
  direction: -1 | 0 | 1;
  level: SignalLevel;
}

/** Two-sided 95%. */
const Z = 1.96;
const SMALL = 5;
const LARGE = 10;

export const NO_SIGNAL: Signal = { points: 0, margin: Infinity, direction: 0, level: 0 };

/** @param margin the 95% margin of error of `diff`, as a rate */
function fromDifference(diff: number, margin: number, significant = Math.abs(diff) > margin): Signal {
  const points = diff * 100;
  const marginPoints = margin * 100;
  if (!significant || points === 0) return { points, margin: marginPoints, direction: 0, level: 0 };
  const size = Math.abs(points);
  return {
    points,
    margin: marginPoints,
    direction: points > 0 ? 1 : -1,
    level: size < SMALL ? 1 : size < LARGE ? 2 : 3,
  };
}

/**
 * The difference we're 95% sure of: the end of its interval nearest zero, or 0 when
 * the interval crosses it. Ranks a large but uncertain gap below a solid one.
 */
export function atLeast(signal: Signal): number {
  if (!Number.isFinite(signal.margin)) return 0;
  if (signal.points < 0) return Math.min(0, signal.points + signal.margin);
  if (signal.points > 0) return Math.max(0, signal.points - signal.margin);
  return 0;
}

/**
 * A rate over a subset of the games (a Pokemon brought, a lead pair, an opposing
 * Pokemon) against the rate over all of them.
 *
 * @param games the subset's games
 * @param totalGames all games, when known. The subset is part of the whole, so the
 *        difference varies less the larger its share (finite population correction).
 * @param rounding how far off the difference can be from rounding its inputs: 0.01
 *        when both are whole percentages. A Pokemon brought in nearly every game
 *        can't differ from the team by more than that, so it mustn't count.
 */
export function vsBaseline(
  rate: number | null | undefined,
  baseline: number | null | undefined,
  games: number,
  totalGames?: number,
  rounding = 0,
): Signal {
  if (rate == null || baseline == null || !(games > 0)) return NO_SIGNAL;
  const share = totalGames && totalGames > 0 ? Math.min(games / totalGames, 1) : 0;
  const variance = (Math.max(baseline * (1 - baseline), 0.0025) / games) * (1 - share);
  return fromDifference(rate - baseline, Z * Math.sqrt(variance) + rounding);
}

/** The difference between two independent rates (brought vs benched). */
export function betweenRates(
  rate: number | null | undefined,
  games: number | null | undefined,
  otherRate: number | null | undefined,
  otherGames: number | null | undefined,
): Signal {
  if (rate == null || otherRate == null || !games || !otherGames) return NO_SIGNAL;
  const variance =
    Math.max(rate * (1 - rate), 0.0025) / games + Math.max(otherRate * (1 - otherRate), 0.0025) / otherGames;
  return fromDifference(rate - otherRate, Z * Math.sqrt(variance));
}

/** A difference with its 95% interval: real when the interval leaves out 0. */
export function fromInterval(diff: number | null | undefined, interval: [number, number]): Signal {
  if (diff == null) return NO_SIGNAL;
  const [low, high] = interval;
  // Intervals needn't be symmetric: use the side facing zero.
  const margin = diff < 0 ? high - diff : diff - low;
  return fromDifference(diff, Math.max(margin, 0), low > 0 || high < 0);
}

/** "+3", "−2", "0": a whole-point difference with a real minus sign. */
export function formatPoints(points: number, digits = 0): string {
  const rounded = Number(Math.abs(points).toFixed(digits));
  if (rounded === 0) return "0";
  return `${points > 0 ? "+" : "−"}${rounded.toFixed(digits)}`;
}

// ==================== Colours ====================

/** Text colour for a rate that can be good or bad. Grey when it's within the noise. */
export function performanceText(signal: Signal): string {
  if (signal.direction === 0) return "text-gray-700 dark:text-gray-200";
  if (signal.direction > 0) {
    return [
      "",
      "text-green-600/75 dark:text-green-400/70",
      "text-green-600 dark:text-green-400",
      "text-green-700 dark:text-green-500 font-bold",
    ][signal.level];
  }
  return [
    "",
    "text-red-500/75 dark:text-red-400/70",
    "text-red-600 dark:text-red-400",
    "text-red-700 dark:text-red-500 font-bold",
  ][signal.level];
}

/** Muted text for a difference that's within the noise. */
export const NOISE_TEXT = "text-gray-400 dark:text-gray-500";

/** Text colour for a difference: muted when it's within the noise. */
export function differenceText(signal: Signal): string {
  return signal.direction === 0 ? NOISE_TEXT : performanceText(signal);
}

export interface Severity {
  label: string;
  /** Text colour. */
  text: string;
  /** Bar / dot colour. */
  fill: string;
}

/** How dangerous an opposing Pokemon (or pair) is, from the team's win rate against it. */
export function threatSeverity(signal: Signal): Severity {
  if (signal.direction === 0) {
    return { label: "Within noise", text: NOISE_TEXT, fill: "bg-gray-300 dark:bg-gray-600" };
  }
  if (signal.direction > 0) {
    return { label: "Favourable", text: "text-green-600 dark:text-green-400", fill: "bg-green-500" };
  }
  return [
    { label: "", text: "", fill: "" },
    { label: "Minor", text: "text-amber-600 dark:text-amber-400", fill: "bg-amber-400" },
    { label: "Notable", text: "text-orange-600 dark:text-orange-400", fill: "bg-orange-500" },
    { label: "Severe", text: "text-red-600 dark:text-red-400", fill: "bg-red-500" },
  ][signal.level];
}
