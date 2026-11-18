import { AlertTriangle, Cpu, Loader2 } from "lucide-react";
import Switch from "../form/switch/Switch";
import { PLAN_CAVEAT } from "../../utils/simulationUtils";
import type { PlanSimulations } from "../../hooks/usePlanSimulations";

interface PlannerSimulatedBarProps {
  plans: PlanSimulations;
  entryCount: number;
  simulated: boolean;
  setSimulated: (on: boolean) => void;
  onSimulate: () => void;
}

/**
 * The Matchup Planner's "Simulated" toggle (each entry shows the engine's plan instead
 * of the user's own) and its Simulate button. Nothing when engine jobs are off or the
 * viewer has nothing to see or do.
 */
export default function PlannerSimulatedBar({
  plans,
  entryCount,
  simulated,
  setSimulated,
  onSimulate,
}: PlannerSimulatedBarProps) {
  const { status, anyResult, anyUnfinished } = plans;
  if (!status?.enabled) return null;
  if (!status.canRun && !anyResult && !anyUnfinished && !status.runBlockedReason) return null;

  const simulatedCount = status.entries.filter((entry) => entry.result != null).length;
  const runningCount = status.entries.filter((entry) => entry.job?.unfinished).length;
  const staleCount = status.entries.filter((entry) => entry.result?.stale).length;

  let message: string;
  if (runningCount > 0) {
    message = `Simulating ${runningCount} ${runningCount === 1 ? "team" : "teams"}. Plans fill in as each finishes.`;
  } else if (simulatedCount > 0) {
    message = `${simulatedCount} of ${entryCount} ${entryCount === 1 ? "team has" : "teams have"} a simulated plan${
      staleCount > 0 ? `, ${staleCount} out of date` : ""
    }.`;
  } else {
    message = "Simulate your matchups: the engine works out what to bring against each team and how it goes.";
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Switch label="Simulated" checked={simulated && anyResult} disabled={!anyResult} onChange={setSimulated} />
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          {runningCount > 0 ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Cpu className="h-4 w-4 shrink-0" />
          )}
          <span>{message}</span>
        </div>
        {status.canRun && entryCount > 0 && (
          <button
            type="button"
            onClick={onSimulate}
            className="ml-auto rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Simulate…
          </button>
        )}
      </div>
      {!status.canRun && status.runBlockedReason && (
        <p className="mt-2 flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {status.runBlockedReason}
        </p>
      )}
      {simulated && anyResult && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{PLAN_CAVEAT}</p>}
    </div>
  );
}
