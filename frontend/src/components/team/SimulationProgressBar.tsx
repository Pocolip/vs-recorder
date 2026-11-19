import { useEffect, useMemo, useRef, useState } from "react";
import { useSimulation } from "../../context/SimulationContext";
import { usePlanSimulationContext } from "../../context/PlanSimulationContext";
import { engineProgress } from "../../utils/simulationUtils";
import type { SimulationJobStatus } from "../../types";

type Outcome = "complete" | "failed" | "cancelled";

const OUTCOME_FILL: Record<Outcome, string> = {
  complete: "bg-brand-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-400",
};

/** How long a finished run's bar stays before fading out (the fade is in index.css). */
const FINISHED_MS = 2500;

const track = "pointer-events-none fixed inset-x-0 bottom-0 z-[999990] h-[5px] overflow-hidden";

function outcomeOf(statuses: SimulationJobStatus[]): Outcome {
  if (statuses.includes("FAILED")) return "failed";
  if (statuses.length > 0 && statuses.every((s) => s === "CANCELLED")) return "cancelled";
  return "complete";
}

/**
 * A thin, pulsing bar along the bottom of the screen while the active team's engine
 * work runs: its Simulated analytics job and its Matchup Planner plans, as one run. A
 * sweep while nothing has started (queued, the worker starting), then the run's
 * progress. When the run ends it fills (red if anything failed, grey if it was all
 * cancelled) and fades out.
 */
export default function SimulationProgressBar() {
  const { status } = useSimulation();
  const { status: plans } = usePlanSimulationContext();
  const simulateJob = status?.enabled ? status.job : null;
  const planEntries = useMemo(() => (plans?.enabled ? plans.entries : []), [plans]);
  const progress = useMemo(() => engineProgress(simulateJob, planEntries), [simulateJob, planEntries]);

  const [finished, setFinished] = useState<Outcome | null>(null);
  // The run's job ids while it's active, so only its own end flashes.
  const followed = useRef<Set<string>>(new Set());

  const known = useMemo(() => {
    const statuses = new Map<string, SimulationJobStatus>();
    if (simulateJob) statuses.set(simulateJob.id, simulateJob.status);
    for (const { job } of planEntries) if (job) statuses.set(job.id, job.status);
    return statuses;
  }, [simulateJob, planEntries]);

  useEffect(() => {
    if (progress.active) {
      for (const job of progress.jobs) followed.current.add(job.id);
      setFinished(null);
      return;
    }
    if (followed.current.size === 0) return;
    const ids = [...followed.current];
    followed.current = new Set();
    // Another team, or still loading: nothing of ours to finish.
    const statuses = ids.map((id) => known.get(id)).filter((s): s is SimulationJobStatus => s != null);
    if (statuses.length > 0) setFinished(outcomeOf(statuses));
  }, [progress, known]);

  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => setFinished(null), FINISHED_MS);
    return () => clearTimeout(timer);
  }, [finished]);

  if (progress.active) {
    if (progress.fraction == null) {
      return (
        <div role="progressbar" aria-label={progress.label} className={`${track} bg-brand-500/15`}>
          <div className="progress-sweep h-full w-1/3 bg-brand-500" />
        </div>
      );
    }
    const percent = Math.round(progress.fraction * 100);
    return (
      <div
        role="progressbar"
        aria-label={progress.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={`${track} bg-brand-500/15`}
      >
        <div
          className="progress-pulse h-full bg-brand-500 transition-[width] duration-1000 ease-out"
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    );
  }

  if (finished) {
    return (
      <div className={`${track} progress-done`} aria-hidden>
        <div className={`h-full w-full ${OUTCOME_FILL[finished]}`} />
      </div>
    );
  }

  return null;
}
