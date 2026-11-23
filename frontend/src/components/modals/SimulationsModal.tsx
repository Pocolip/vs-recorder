import { Link } from "react-router";
import { AlertTriangle, CheckCircle2, Cpu, Info, Loader2, XCircle } from "lucide-react";
import { Modal } from "../ui/modal";
import { useSimulation } from "../../context/SimulationContext";
import { usePlanSimulationContext } from "../../context/PlanSimulationContext";
import { useTeamPermissions } from "../../hooks/useTeamPermissions";
import { DEPTH_OPTIONS, accessNote, depthName, describeProgress, planSummary } from "../../utils/simulationUtils";
import FeedbackLink from "../team/FeedbackLink";
import type { SimulationStatus, Team } from "../../types";

const buttonBase =
  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = `${buttonBase} bg-brand-500 text-white hover:bg-brand-600`;
const secondaryButton = `${buttonBase} border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800`;
const card = "rounded-xl border border-gray-200 p-4 dark:border-gray-700";

const formatTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

/** Features that will run on the engine later, shown so users see what's coming. */
const PLANNED_FEATURES = [
  {
    name: "Replay grading",
    description:
      "For a replay or a Bo3 set: how each of your decisions compares with the engine's choices, and the ones that cost the most.",
  },
];

/**
 * The Simulations modal: the team's current simulation, and each engine feature with
 * the runs it offers. Opened from the sidebar and from the analytics pages' bar.
 */
export default function SimulationsModal({ team }: { team: Team }) {
  const { status, loadFailed, panelOpen, closePanel } = useSimulation();

  return (
    <Modal isOpen={panelOpen} onClose={closePanel} className="max-w-2xl p-6 sm:p-8">
      <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Simulations</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The matchup engine plays <span className="font-medium">{team.name}</span> against the meta's top teams, so
        pages can show results without replays.
      </p>

      {status == null ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          {loadFailed ? "Couldn't load the simulation status. Retrying…" : "Loading…"}
        </p>
      ) : !status.enabled ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Simulations aren't available.</p>
      ) : (
        <div className="mt-6 max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          <CurrentStatus status={status} />
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Features
            </h3>
            <div className="space-y-3">
              <SimulatedAnalytics status={status} teamId={team.id} />
              <SimulatedPlans teamId={team.id} />
              {PLANNED_FEATURES.map((feature) => (
                <div key={feature.name} className={`${card} opacity-75`}>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{feature.name}</h4>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Coming later
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>
          <Footer status={status} />
        </div>
      )}
    </Modal>
  );
}

/** The latest job, the result the pages show, and anything blocking a run. */
function CurrentStatus({ status }: { status: SimulationStatus }) {
  const { busy, cancel } = useSimulation();
  const { isOwner } = useTeamPermissions();
  const { job, result } = status;

  let icon = <Cpu className="h-5 w-5 text-gray-400" />;
  let headline = "No simulations yet for this team.";
  let detail: string | null = null;
  let action: React.ReactNode = null;

  if (job?.unfinished) {
    const kind = `${depthName(job.depth)} simulation`;
    icon = <Loader2 className="h-5 w-5 animate-spin text-brand-500" />;
    headline = job.cancelRequested
      ? `Cancelling the ${kind.toLowerCase()}…`
      : job.status === "QUEUED"
        ? `${kind} queued`
        : job.status === "PARTIAL"
          ? `${kind}: partial result ready`
          : `${kind} running`;
    detail =
      job.status === "QUEUED" && !job.cancelRequested
        ? `Started ${formatTime(job.createdAt)}. Starting the engine can take a few minutes.`
        : [describeProgress(job.progress), `started ${formatTime(job.createdAt)}`].filter(Boolean).join(" · ");
    if (isOwner && !job.cancelRequested) {
      action = (
        <button type="button" className={secondaryButton} disabled={busy} onClick={() => cancel()}>
          Cancel
        </button>
      );
    }
  } else if (job?.status === "FAILED") {
    icon = <XCircle className="h-5 w-5 text-red-500" />;
    headline = `The last ${depthName(job.depth).toLowerCase()} simulation failed`;
    detail = job.errorMessage;
  } else if (job?.status === "CANCELLED") {
    icon = <XCircle className="h-5 w-5 text-gray-400" />;
    headline = `The last ${depthName(job.depth).toLowerCase()} simulation was cancelled`;
    detail = formatTime(job.updatedAt ?? job.createdAt);
  } else if (job?.status === "COMPLETE") {
    icon = <CheckCircle2 className="h-5 w-5 text-green-500" />;
    headline = `${depthName(job.depth)} simulation complete`;
    detail = `Finished ${formatTime(job.updatedAt ?? job.createdAt)}`;
  }

  return (
    <section className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-800 dark:text-gray-100">{headline}</p>
          {detail && (
            <p
              className={`mt-0.5 text-sm ${job?.status === "FAILED" ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              {detail}
            </p>
          )}
        </div>
        {action}
      </div>

      {job?.pasteNotes && job.pasteNotes.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <div>
            <p>The paste was adjusted for the engine; your team's paste is unchanged:</p>
            <ul className="mt-0.5 list-disc pl-5 text-gray-500 dark:text-gray-400">
              {job.pasteNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Pages show the {depthName(result.depth).toLowerCase()} simulation
          {result.createdAt ? ` from ${formatTime(result.createdAt)}` : ""}: {result.opponentsCount} teams,{" "}
          {result.totalGames.toLocaleString()} games
          {result.status === "partial" ? " (partial)" : ""}.
          {result.stale && (
            <p className="mt-1 flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              The team's paste changed since; run again to update it.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Simulated analytics: the one feature that runs today, at either depth. */
function SimulatedAnalytics({ status, teamId }: { status: SimulationStatus; teamId: number }) {
  const { busy, run, actionError, closePanel } = useSimulation();
  const { result, canRun, runBlockedReason, job } = status;
  const running = job?.unfinished ?? false;
  const pages = [
    { name: "Usage Stats", path: "usage-stats" },
    { name: "Matchup Stats", path: "matchup-stats" },
    { name: "Move Usage", path: "move-usage" },
    { name: "Diagnostics", path: "diagnostics" },
  ];

  return (
    <div className={card}>
      <h4 className="font-semibold text-gray-800 dark:text-gray-100">Simulated analytics</h4>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Fills{" "}
        {pages.map((page, i) => (
          <span key={page.path}>
            {i > 0 && (i === pages.length - 1 ? " and " : ", ")}
            <Link
              to={`/team/${teamId}/${page.path}`}
              onClick={closePanel}
              className="text-brand-600 hover:underline dark:text-brand-400"
            >
              {page.name}
            </Link>
          </span>
        ))}{" "}
        with games against the meta when their Simulated toggle is on.
      </p>

      <div className="mt-3 space-y-2">
        {DEPTH_OPTIONS.map((option) => {
          const current = result != null && !result.stale && result.depth === option.depth;
          return (
            <div
              key={option.depth}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3 sm:flex-nowrap dark:border-gray-700"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-100">{option.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{option.time}</span>
                  {current && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:bg-green-500/10 dark:text-green-400">
                      Current result
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
              </div>
              {(canRun || running) && (
                <button
                  type="button"
                  className={option.depth === "full" ? primaryButton : secondaryButton}
                  disabled={!canRun || busy}
                  onClick={() => run(option.depth)}
                >
                  Run {option.name.toLowerCase()}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {running && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">One run at a time per team.</p>}
      {!canRun && !running && runBlockedReason && (
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">{runBlockedReason}</p>
      )}
      {actionError && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <span>{actionError.message}</span>
          {actionError.canForce && (
            <button
              type="button"
              className={secondaryButton}
              disabled={busy}
              onClick={() => run(actionError.depth ?? "full", true)}
            >
              Run anyway
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The planner's plans at a glance: what's running now, or how many teams have one. */
function PlanStatusLine() {
  const { status } = usePlanSimulationContext();
  if (!status?.enabled) return null;
  const s = planSummary(status.entries);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  if (s.queued + s.running > 0) {
    const inRun = s.queued + s.running + s.doneInRun;
    const parts = [
      s.doneInRun > 0 ? `${s.doneInRun} done` : null,
      s.running > 0 ? `${s.running} running` : null,
      s.queued > 0 ? `${s.queued} queued` : null,
    ].filter(Boolean);
    return (
      <p className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-500" />
        Simulating {plural(inRun, "team")}: {parts.join(", ")}.
      </p>
    );
  }
  if (s.total === 0) {
    return <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No teams in your planner yet.</p>;
  }
  const notes = [
    s.stale > 0 ? `${s.stale} out of date` : null,
    s.failed > 0 ? `${s.failed} failed` : null,
  ].filter(Boolean);
  const Icon = s.failed > 0 ? XCircle : s.withPlan === s.total && s.stale === 0 ? CheckCircle2 : Cpu;
  const tone =
    s.failed > 0
      ? "text-red-500"
      : s.withPlan === s.total && s.stale === 0
        ? "text-green-500"
        : "text-gray-400";
  return (
    <p className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
      <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
      {s.withPlan} of {plural(s.total, "team")} {s.withPlan === 1 ? "has" : "have"} a plan
      {notes.length > 0 ? ` (${notes.join(", ")})` : ""}.
    </p>
  );
}

/** Simulated plans run from the Matchup Planner, which shows each entry's progress. */
function SimulatedPlans({ teamId }: { teamId: number }) {
  const { closePanel } = useSimulation();
  return (
    <div className={card}>
      <h4 className="font-semibold text-gray-800 dark:text-gray-100">Matchup Planner</h4>
      <PlanStatusLine />
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        For each team in your planner: the leads and backs to bring, what they bring, and your win rate, with the
        Simulated toggle showing them in place of your own plans. Pick the teams to simulate from the planner.
      </p>
      <Link
        to={`/team/${teamId}/matchup-planner`}
        onClick={closePanel}
        className={`${secondaryButton} mt-3 inline-block`}
      >
        Open Matchup Planner
      </Link>
    </div>
  );
}

/** Who may run, and how many runs are left. */
function Footer({ status }: { status: SimulationStatus }) {
  const { isOwner } = useTeamPermissions();
  let text: string;
  if (!isOwner) {
    text = "Only the team's owner can run simulations. You can see its results.";
  } else if (status.runsLeftToday == null) {
    text = "Simulations are limited to a few accounts while they're being tested.";
  } else {
    const runs = status.runsLeftToday === 1 ? "run" : "runs";
    text = `${accessNote(status.openToAll)} ${status.runsLeftToday} ${runs} left today.`;
  }
  return (
    <p className="text-xs text-gray-500 dark:text-gray-400">
      {text} <FeedbackLink url={status.feedbackUrl} />
    </p>
  );
}
