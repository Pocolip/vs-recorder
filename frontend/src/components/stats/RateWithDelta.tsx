import { differenceText, formatPoints, performanceText, type Signal } from "../../utils/winRateSignal";

/** Explains a signal in words, for the tooltip. */
function describe(signal: Signal, games: number, reference: string): string {
  const gameText = `${games.toLocaleString()} game${games === 1 ? "" : "s"}`;
  if (signal.direction === 0) return `Within normal variation of ${reference} for ${gameText}`;
  const size = ["", "slightly", "clearly", "far"][signal.level];
  return `${Math.abs(Math.round(signal.points))} points ${signal.direction > 0 ? "above" : "below"} ${reference} over ${gameText}: ${size} ${signal.direction > 0 ? "better" : "worse"}`;
}

/**
 * A win rate coloured by how it compares with a reference (the team's overall
 * rate), with the difference underneath. Grey when the gap is within the noise.
 */
export default function RateWithDelta({
  rate,
  signal,
  games,
  reference = "the team's win rate",
  align = "center",
}: {
  /** Whole percent. */
  rate: number;
  signal: Signal;
  games: number;
  reference?: string;
  align?: "center" | "right";
}) {
  const tone = performanceText(signal);
  return (
    <div className={align === "right" ? "text-right" : "text-center"} title={describe(signal, games, reference)}>
      <div className={`font-semibold ${tone}`}>{rate}%</div>
      <div className={`text-xs ${differenceText(signal)}`}>
        {formatPoints(signal.points)}
      </div>
    </div>
  );
}
