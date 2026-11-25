import React from "react";
import { AlertTriangle, Cpu, Info, Loader2, Plus, XCircle } from "lucide-react";
import PokemonSprite from "../pokemon/PokemonSprite";
import {
  CATEGORY_LABEL,
  PLAN_CAVEAT,
  describePlanProgress,
  describeQueuedJob,
  percent,
  percentRange,
  planErrorMessage,
  staleLabel,
} from "../../utils/simulationUtils";
import type { Composition, PlanCategory, PlanComposition, PlanEntryStatus, PlanResultInfo } from "../../types";

const CATEGORY_CLASS: Record<PlanCategory, string> = {
  favorable: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  even: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  unfavorable: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

/** Below this, varying the bring barely matters, so no hint. */
const SIMPLIFY_COST_HINT = 0.05;

/**
 * The win rate and category, for the entry's header.
 *
 * @param pending the plan's job is still running. A partial result whose job then
 *                failed or was cancelled is kept, but its win rate will never come.
 */
export function PlanBadge({ result, pending }: { result: PlanResultInfo | null | undefined; pending: boolean }) {
  if (!result) return null;
  if (result.winRate == null || !result.category) {
    return (
      <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {pending ? "Win rate pending" : "No win rate"}
      </span>
    );
  }
  return (
    <span
      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_CLASS[result.category]} ${
        result.stale ? "opacity-60" : ""
      }`}
      title={`Simulated win rate${percentRange(result.ci95) ? `, 95% interval ${percentRange(result.ci95)}` : ""}${
        result.stale ? " (stale)" : ""
      }`}
    >
      {percent(result.winRate)} · {CATEGORY_LABEL[result.category]}
    </span>
  );
}

/** Two leads and two in the back, as sprites. */
export function CompositionPicks({ composition }: { composition: Pick<Composition, "lead1" | "lead2" | "back1" | "back2"> }) {
  return (
    <div className="flex gap-2">
      <div>
        <p className="mb-0.5 text-center text-xs text-brand-600 dark:text-brand-400">Leads</p>
        <div className="flex gap-0.5 rounded-lg border border-brand-200 bg-brand-50/50 p-1 dark:border-brand-400/30 dark:bg-brand-200/10">
          <PokemonSprite name={composition.lead1} size="md" showTooltip={true} />
          <PokemonSprite name={composition.lead2} size="md" showTooltip={true} />
        </div>
      </div>
      <div>
        <p className="mb-0.5 text-center text-xs text-blue-600 dark:text-blue-400">Back</p>
        <div className="flex gap-0.5 rounded-lg border border-blue-200 bg-blue-50/50 p-1 dark:border-blue-400/30 dark:bg-blue-200/10">
          <PokemonSprite name={composition.back1} size="md" showTooltip={true} />
          <PokemonSprite name={composition.back2} size="md" showTooltip={true} />
        </div>
      </div>
    </div>
  );
}

interface SimulatedPlanProps {
  plan: PlanEntryStatus | null | undefined;
  /** Shown when the viewer may simulate this entry. */
  onSimulate?: () => void;
  /** Shown to the owner while the plan runs. */
  onCancel?: () => void;
  /** Copies one of the engine's compositions into the user's own plans; absent when they can't edit. */
  onCopyComposition?: (composition: Composition) => Promise<unknown>;
  busy?: boolean;
}

/**
 * An entry's simulated plan, shown in place of the user's own compositions while the
 * planner's Simulated toggle is on: how the matchup goes, what to bring, what they bring.
 */
export default function SimulatedPlan({ plan, onSimulate, onCancel, onCopyComposition, busy }: SimulatedPlanProps) {
  const job = plan?.job ?? null;
  const result = plan?.result ?? null;
  const jobIsNewer = job != null && job.id !== result?.jobId;
  const pending = job?.unfinished === true && job.id === result?.jobId;

  return (
    <div className="space-y-4">
      <JobState job={job} hasResult={result != null} jobIsNewer={jobIsNewer} onCancel={onCancel} busy={busy} />

      {!result ? (
        !job?.unfinished && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            <Cpu className="h-4 w-4 shrink-0" />
            <span className="flex-1">No simulated plan for this team yet. Your own plans are kept as they are.</span>
            {onSimulate && (
              <button
                type="button"
                onClick={onSimulate}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-600"
              >
                Simulate
              </button>
            )}
          </div>
        )
      ) : (
        <PlanResult result={result} pending={pending} onCopyComposition={onCopyComposition} onSimulate={onSimulate} />
      )}
    </div>
  );
}

function JobState({
  job,
  hasResult,
  jobIsNewer,
  onCancel,
  busy,
}: {
  job: PlanEntryStatus["job"];
  hasResult: boolean;
  jobIsNewer: boolean;
  onCancel?: () => void;
  busy?: boolean;
}) {
  if (!job) return null;
  if (job.unfinished) {
    const progress = describePlanProgress(job.progress);
    const text = job.cancelRequested
      ? "Cancelling…"
      : job.status === "QUEUED"
        ? `Queued. ${describeQueuedJob(job) ?? "Starting the engine can take a few minutes."}`
        : job.status === "PARTIAL"
          ? "What to bring is ready; playing the matchup for a win rate…"
          : `Simulating${progress ? `: ${progress}` : "…"}`;
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />
        <span className="flex-1">{text}</span>
        {onCancel && !job.cancelRequested && (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }
  // A failure after the compositions were published keeps them: say what's missing.
  const tail = !hasResult ? "" : jobIsNewer ? " Showing the previous plan." : " What to bring is shown, without a win rate.";
  if (job.status === "FAILED") {
    return (
      <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {planErrorMessage(job.errorCode, job.errorMessage)}
          {tail}
        </span>
      </div>
    );
  }
  if (job.status === "CANCELLED") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">The last simulation was cancelled.{tail}</p>;
  }
  return null;
}

function PlanResult({
  result,
  pending,
  onCopyComposition,
  onSimulate,
}: {
  result: PlanResultInfo;
  pending: boolean;
  onCopyComposition?: (composition: Composition) => Promise<unknown>;
  onSimulate?: () => void;
}) {
  const stale = staleLabel(result);
  const complete = result.winRate != null;
  const record =
    result.games != null
      ? `${result.games} games: ${result.wins ?? 0}–${result.losses ?? 0}${result.ties ? `–${result.ties}` : ""}`
      : null;

  return (
    <>
      {stale && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{stale}</span>
          {onSimulate && (
            <button
              type="button"
              onClick={onSimulate}
              className="rounded-lg border border-yellow-400 px-2 py-1 text-xs transition-colors hover:bg-yellow-50 dark:border-yellow-500/50 dark:hover:bg-yellow-900/20"
            >
              Re-simulate
            </button>
          )}
        </div>
      )}

      <section>
        <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">How it goes</h4>
        {complete ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{percent(result.winRate)}</span>
            {result.category && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_CLASS[result.category]}`}>
                {CATEGORY_LABEL[result.category]}
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {[percentRange(result.ci95) && `95% interval ${percentRange(result.ci95)}`, record].filter(Boolean).join(" · ")}
            </span>
          </div>
        ) : pending ? (
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Win rate pending: the engine is playing the matchup.
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No win rate: the simulation stopped before playing the matchup.
            {onSimulate && (
              <button type="button" onClick={onSimulate} className="ml-2 text-brand-500 hover:underline dark:text-brand-400">
                Simulate again
              </button>
            )}
          </p>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          What to bring ({result.compositions.length})
        </h4>
        <div className="space-y-2">
          {result.compositions.map((composition, index) => (
            <SimulatedCompositionRow
              key={index}
              composition={composition}
              onCopy={onCopyComposition ? () => onCopyComposition(toComposition(composition)) : undefined}
            />
          ))}
        </div>
        {result.simplifyCost != null && result.simplifyCost >= SIMPLIFY_COST_HINT && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Mix it up: always bringing the top option costs about {Math.round(result.simplifyCost * 100)} points of win
            rate against an opponent who sees it coming.
          </p>
        )}
      </section>

      {result.opponentCompositions.length > 0 && (
        <section>
          <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">What they bring</h4>
          {result.opponentSummary && (
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{result.opponentSummary}</p>
          )}
          <div className="space-y-2">
            {result.opponentCompositions.map((composition, index) => (
              <SimulatedCompositionRow key={index} composition={composition} />
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {PLAN_CAVEAT}
        {result.opponentSpreads === "sheet" &&
          " Their paste has no stat points, so the engine used the meta's usual spreads for their sets."}
      </p>
    </>
  );
}

function SimulatedCompositionRow({ composition, onCopy }: { composition: PlanComposition; onCopy?: () => Promise<unknown> }) {
  const [copying, setCopying] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-white/[0.02]">
      <CompositionPicks composition={composition} />
      <div className="min-w-0 flex-1">
        {composition.weight != null && (
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{percent(composition.weight)}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">of the engine's mix</p>
      </div>
      {onCopy && (
        <button
          type="button"
          disabled={copying || copied}
          onClick={async () => {
            setCopying(true);
            try {
              await onCopy();
              setCopied(true);
            } catch (error) {
              console.error("Failed to copy the composition:", error);
            } finally {
              setCopying(false);
            }
          }}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-brand-500 transition-colors hover:bg-brand-50 disabled:opacity-60 dark:text-brand-400 dark:hover:bg-brand-500/10"
          title="Add this composition to your own plans"
        >
          <Plus className="h-3 w-3" />
          {copied ? "Added to my plans" : "Add to my plans"}
        </button>
      )}
    </div>
  );
}

/** Stored as the user's own: the engine's notes already say it's simulated. */
function toComposition(composition: PlanComposition): Composition {
  return {
    lead1: composition.lead1,
    lead2: composition.lead2,
    back1: composition.back1,
    back2: composition.back2,
    notes: composition.notes,
  };
}
