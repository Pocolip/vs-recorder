import { useEffect, useRef, useState } from "react";
import { useSimulation } from "../../context/SimulationContext";
import { depthName, describeProgress, jobProgress } from "../../utils/simulationUtils";

type Outcome = "complete" | "failed" | "cancelled";

const OUTCOME_FILL: Record<Outcome, string> = {
  complete: "bg-brand-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-400",
};

/** How long a finished job's bar stays before fading out (the fade is in index.css). */
const FINISHED_MS = 2500;

const track = "pointer-events-none fixed inset-x-0 bottom-0 z-[999990] h-[3px] overflow-hidden";

/**
 * A thin bar along the bottom of the screen while the active team's simulation
 * runs: a sweep while it's queued or the worker starts, then its progress through
 * the engine's stages. On finishing it fills (red on failure, grey when cancelled)
 * and fades out.
 */
export default function SimulationProgressBar() {
  const { status } = useSimulation();
  const job = status?.enabled ? status.job : null;
  const [finished, setFinished] = useState<Outcome | null>(null);
  // The unfinished job we've been showing, so only its own end flashes.
  const followed = useRef<string | null>(null);

  const jobId = job?.id ?? null;
  const unfinished = job?.unfinished ?? false;
  const jobStatus = job?.status ?? null;
  useEffect(() => {
    if (jobId && unfinished) {
      followed.current = jobId;
      setFinished(null);
    } else if (jobId && followed.current === jobId) {
      followed.current = null;
      setFinished(jobStatus === "COMPLETE" ? "complete" : jobStatus === "CANCELLED" ? "cancelled" : "failed");
    } else if (!jobId) {
      // Another team, or loading: nothing of ours to finish.
      followed.current = null;
    }
  }, [jobId, unfinished, jobStatus]);

  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => setFinished(null), FINISHED_MS);
    return () => clearTimeout(timer);
  }, [finished]);

  if (job && unfinished) {
    const fraction = jobProgress(job);
    const label = `${depthName(job.depth)} simulation${job.progress ? `: ${describeProgress(job.progress)}` : " starting"}`;
    if (fraction == null) {
      return (
        <div role="progressbar" aria-label={label} className={`${track} bg-brand-500/15`}>
          <div className="progress-sweep h-full w-1/3 bg-brand-500" />
        </div>
      );
    }
    const percent = Math.round(fraction * 100);
    return (
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={`${track} bg-brand-500/15`}
      >
        <div
          className="h-full bg-brand-500 transition-[width] duration-1000 ease-out"
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
