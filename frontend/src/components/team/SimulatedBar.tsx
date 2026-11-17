import { AlertTriangle, Cpu, Loader2 } from "lucide-react";
import Switch from "../form/switch/Switch";
import { useSimulation } from "../../context/SimulationContext";
import { useTeamPermissions } from "../../hooks/useTeamPermissions";
import { depthName, describeProgress, simulatedScopeLabel } from "../../utils/simulationUtils";

const buttonClass =
  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = `${buttonClass} bg-brand-500 text-white hover:bg-brand-600`;
const secondaryButton = `${buttonClass} border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800`;

type Tone = "info" | "warning" | "error";
const TONE_CLASS: Record<Tone, string> = {
  info: "text-gray-600 dark:text-gray-300",
  warning: "text-yellow-700 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
};

/**
 * The "Simulated" toggle and the team's simulation state: run, progress, cancel,
 * failures and staleness. Renders nothing when engine jobs are off, or when the
 * viewer has nothing to see or do.
 *
 * @param showToggle false on pages that are always simulated (Diagnostics)
 */
export default function SimulatedBar({ showToggle = true }: { showToggle?: boolean }) {
  const { status, simulated, setSimulated, showSimulated, busy, actionError, run, cancel, openPanel } =
    useSimulation();
  const { isOwner } = useTeamPermissions();

  if (!status?.enabled) return null;

  const { job, result, canRun, runBlockedReason } = status;
  const unfinished = job?.unfinished ?? false;
  const hasSomething = job != null || result != null || canRun || runBlockedReason != null;
  if (!hasSomething) return null;

  const progress = describeProgress(job?.progress);
  const button = (label: string, onClick: () => void, primary = true) => (
    <button type="button" className={primary ? primaryButton : secondaryButton} disabled={busy} onClick={onClick}>
      {label}
    </button>
  );

  // The latest job's state: one message and at most one action.
  let message: string | null = null;
  let tone: Tone = "info";
  let action: React.ReactNode = null;

  if (unfinished && job) {
    const kind = `${depthName(job.depth)} simulation`;
    if (job.cancelRequested) {
      message = `Cancelling the ${kind.toLowerCase()}…`;
    } else if (job.status === "PARTIAL") {
      message = `Partial result ready: the top opponents are still being refined${progress ? ` — ${progress}` : ""}.`;
    } else if (job.status === "RUNNING") {
      message = `${kind}${progress ? `: ${progress}` : " running…"}`;
    } else {
      message = `${kind} queued. Starting the engine can take a few minutes.`;
    }
    if (isOwner && !job.cancelRequested) action = button("Cancel", () => cancel(), false);
  } else if (job?.status === "FAILED") {
    tone = "error";
    message = job.errorMessage || "The simulation failed.";
    if (canRun) action = button("Run again", openPanel);
  } else {
    if (job?.status === "CANCELLED") {
      message = "Simulation cancelled.";
    } else if (!result) {
      message = "Simulate this team against the meta's top teams to fill these pages without replays.";
    }
    // Runs start from the Simulations modal, which offers each depth.
    if (canRun) {
      action = !result
        ? button("Run simulation", openPanel)
        : result.stale
          ? button("Re-run", openPanel)
          : button("Run again", openPanel, false);
    }
  }

  // Notes about the result being shown, independent of the latest job.
  const notes: { text: string; tone: Tone }[] = [];
  if (result && !unfinished) {
    if (job && job.id !== result.jobId) {
      notes.push({ text: "Showing the results of an earlier simulation.", tone: "info" });
    }
    if (result.stale) {
      notes.push({ text: "The team's paste changed since this simulation.", tone: "warning" });
    } else if (result.status === "partial") {
      notes.push({ text: "This simulation only has a partial result.", tone: "info" });
    }
  }
  if (!canRun && !unfinished && runBlockedReason) {
    notes.push({ text: runBlockedReason, tone: "warning" });
  }

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {showToggle && (
          <Switch
            label="Simulated"
            checked={simulated && result != null}
            disabled={result == null}
            onChange={setSimulated}
          />
        )}
        {message && (
          <div className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${TONE_CLASS[tone]}`}>
            {unfinished ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : tone === "info" ? (
              <Cpu className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}
        {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
      </div>

      {notes.map((note) => (
        <div key={note.text} className={`mt-2 flex flex-wrap items-center gap-2 text-sm ${TONE_CLASS[note.tone]}`}>
          <span>{note.text}</span>
        </div>
      ))}

      {actionError && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <span>{actionError.message}</span>
          {actionError.canForce && button("Run anyway", () => run(actionError.depth ?? "full", true), false)}
        </div>
      )}

      {showSimulated && showToggle && result && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{simulatedScopeLabel(result.opponentsCount)}</p>
      )}
    </div>
  );
}
