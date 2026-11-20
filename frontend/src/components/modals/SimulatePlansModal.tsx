import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "../ui/modal";
import Checkbox from "../form/input/Checkbox";
import PokemonTeam from "../pokemon/PokemonTeam";
import { PlanBadge } from "../team/SimulatedPlan";
import { SINGLE_PLAN_WARNING, planErrorMessage } from "../../utils/simulationUtils";
import type { PlanSimulations } from "../../hooks/usePlanSimulations";
import type { PlanEntryStatus, PlanSubmitOutcome } from "../../types";

const buttonBase =
  "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = `${buttonBase} bg-brand-500 text-white hover:bg-brand-600`;
const secondaryButton = `${buttonBase} border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800`;

export interface PlanEntry {
  id: number;
  pokepaste: string;
  notes?: string;
}

interface SimulatePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The planner's entries, in its order. */
  entries: PlanEntry[];
  plans: PlanSimulations;
  /** Entries checked when it opens; null checks every entry without an up-to-date plan. */
  initialSelection: number[] | null;
}

type EntryState = "running" | "upToDate" | "stale" | "failed" | "none";

function entryState(plan: PlanEntryStatus | undefined): EntryState {
  if (plan?.job?.unfinished) return "running";
  const result = plan?.result;
  if (plan?.job?.status === "FAILED" && plan.job.id !== result?.jobId) return "failed";
  if (!result) return "none";
  if (result.stale) return "stale";
  return result.status === "complete" ? "upToDate" : "none";
}

const STATE_LABEL: Record<EntryState, string> = {
  running: "Simulating…",
  upToDate: "Up to date",
  stale: "Out of date",
  failed: "Last simulation failed",
  none: "Not simulated",
};

/**
 * Pick which Matchup Planner entries to simulate. Each is its own job, but jobs
 * queued together share one engine start, so batches are cheaper per team.
 */
export default function SimulatePlansModal({ isOpen, onClose, entries, plans, initialSelection }: SimulatePlansModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [outcomes, setOutcomes] = useState<Map<number, PlanSubmitOutcome>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const states = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entryState(plans.byEntry.get(entry.id))])),
    [entries, plans.byEntry],
  );
  const selectable = entries.filter((entry) => states.get(entry.id) !== "running");

  // Reset each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    const initial =
      initialSelection ??
      selectable.filter((entry) => states.get(entry.id) !== "upToDate").map((entry) => entry.id);
    setSelected(new Set(initial.filter((id) => states.get(id) !== "running")));
    setOutcomes(new Map());
    setError(null);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = plans.status;
  const runsLeft = status?.runsLeftToday ?? null;
  const count = selected.size;
  const overCap = runsLeft != null && count > runsLeft;
  const allChecked = selectable.length > 0 && selectable.every((entry) => selected.has(entry.id));

  const toggle = (id: number, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const submit = async () => {
    const ids = entries.map((entry) => entry.id).filter((id) => selected.has(id));
    // Checking an up-to-date entry is asking to run it again.
    const force = ids.some((id) => states.get(id) === "upToDate");
    const result = await plans.submit(ids, force);
    if (result.error) {
      setError(result.error);
      return;
    }
    const refused = result.outcomes.filter((outcome) => !outcome.queued);
    if (refused.length === 0) {
      onClose();
      return;
    }
    setOutcomes(new Map(refused.map((outcome) => [outcome.gamePlanTeamId, outcome])));
    setSelected(new Set());
    const queued = result.outcomes.length - refused.length;
    setError(
      queued > 0
        ? `${queued} ${queued === 1 ? "team is" : "teams are"} being simulated. ${refused.length} couldn't be:`
        : "None of these teams could be simulated:",
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6 sm:p-8">
      <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Simulate matchups</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        For each team, the engine works out what you should bring, what they bring, and how the matchup goes. Your
        own plans aren't changed. About 5 minutes per team, plus a few minutes for the engine to start.
      </p>

      {entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Add matchup teams to simulate them.</p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
            <Checkbox
              label="Check all"
              checked={allChecked}
              disabled={selectable.length === 0}
              onChange={(on) => setSelected(on ? new Set(selectable.map((entry) => entry.id)) : new Set())}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {count} of {entries.length} selected
            </span>
          </div>

          <ul className="max-h-[50vh] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {entries.map((entry, index) => {
              const state = states.get(entry.id) ?? "none";
              const plan = plans.byEntry.get(entry.id);
              const outcome = outcomes.get(entry.id);
              const checked = selected.has(entry.id);
              return (
                <li key={entry.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Checkbox
                    id={`simulate-entry-${entry.id}`}
                    checked={checked}
                    disabled={state === "running"}
                    onChange={(on) => toggle(entry.id, on)}
                  />
                  <span className="w-5 text-xs text-gray-400">{index + 1}</span>
                  <label htmlFor={`simulate-entry-${entry.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <PokemonTeam pokepasteUrl={entry.pokepaste} size="sm" />
                    {outcome && (
                      <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                        {planErrorMessage(outcome.errorCode, outcome.message)}
                      </p>
                    )}
                    {!outcome && checked && state === "upToDate" && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Nothing changed: it'll run again.</p>
                    )}
                  </label>
                  <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {state === "upToDate" || state === "stale" ? <PlanBadge result={plan?.result} pending={false} /> : null}
                    {STATE_LABEL[state]}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {count === 1 && (
        <p className="mt-3 flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {SINGLE_PLAN_WARNING}
        </p>
      )}
      {overCap && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          You can simulate {runsLeft} more {runsLeft === 1 ? "team" : "teams"} today.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {status?.runBlockedReason && !status.canRun && (
        <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-400">{status.runBlockedReason}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {runsLeft != null && (
          <span className="mr-auto text-xs text-gray-500 dark:text-gray-400">
            Free while simulations are being tested. {runsLeft} left today.
          </span>
        )}
        <button type="button" className={secondaryButton} onClick={onClose}>
          {outcomes.size > 0 ? "Close" : "Cancel"}
        </button>
        <button
          type="button"
          className={primaryButton}
          disabled={count === 0 || overCap || plans.busy || !status?.canRun}
          onClick={submit}
        >
          {plans.busy ? "Submitting…" : `Simulate ${count} ${count === 1 ? "team" : "teams"}`}
        </button>
      </div>
    </Modal>
  );
}
