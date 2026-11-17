import { useEffect, useState } from "react";
import { Activity, ShieldAlert, Users } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PokemonSprite from "../../components/pokemon/PokemonSprite";
import SimulatedBar from "../../components/team/SimulatedBar";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useSimulation } from "../../context/SimulationContext";
import { simulationApi } from "../../services/api/simulationApi";
import { getDisplayName, resolveAnalyticsKey } from "../../utils/pokemonNameUtils";
import type { SimulationDiagnostics, SimulationThreat } from "../../types";

// Rates here are 0-1.
const pct = (rate: number | null | undefined) => (rate == null ? "—" : `${Math.round(rate * 100)}%`);

/** A difference in win rate, in percentage points. */
function Delta({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-gray-400">&mdash;</span>;
  const points = value * 100;
  const color =
    points >= 2
      ? "text-green-600 dark:text-green-400"
      : points <= -2
        ? "text-red-600 dark:text-red-400"
        : "text-gray-600 dark:text-gray-300";
  const sign = points > 0 ? "+" : points < 0 ? "−" : "";
  return (
    <span className={`font-semibold ${color}`}>
      {sign}
      {Math.abs(points).toFixed(1)} pts
    </span>
  );
}

const thClass = "px-2 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300";
const tdClass = "px-2 py-3 text-center text-gray-800 dark:text-gray-100";

export default function DiagnosticsPage() {
  const { team } = useActiveTeam();
  const { status, loadFailed, resultKey } = useSimulation();
  const teamId = team?.id ?? null;

  const [diagnostics, setDiagnostics] = useState<SimulationDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId == null || resultKey == null) {
      setDiagnostics(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    simulationApi
      .getDiagnostics(teamId)
      .then((d) => {
        if (!cancelled) setDiagnostics(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load diagnostics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, resultKey]);

  const card = "rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-white/[0.03]";

  if (status && !status.enabled) {
    return (
      <div className={card}>
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Simulations aren't available.</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Diagnostics | VS Recorder" description="Simulated team diagnostics" />
      <div className={card}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Diagnostics</h3>
          {diagnostics && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Simulated against {diagnostics.opponentsCount} teams in the meta.
            </p>
          )}
        </div>

        <SimulatedBar showToggle={false} />

        {status == null && loadFailed ? (
          <p className="py-12 text-center text-sm text-red-600 dark:text-red-400">
            Couldn't load the simulation. Retrying…
          </p>
        ) : loading || status == null ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          </div>
        ) : error ? (
          <p className="py-12 text-center text-sm text-red-600 dark:text-red-400">Error loading diagnostics: {error}</p>
        ) : !diagnostics ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">No simulation yet</h3>
            <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Once the engine has played this team against the meta, this page shows what each Pokemon adds when
              brought and which opposing Pokemon hurt the team.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <MembersTable diagnostics={diagnostics} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ThreatList title="Threatening Pokemon" threats={diagnostics.threatSpecies} />
              <ThreatList title="Threatening Pairs" threats={diagnostics.threatPairs} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MembersTable({ diagnostics }: { diagnostics: SimulationDiagnostics }) {
  return (
    <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
      <h4 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100">
        <Users className="h-5 w-5" />
        Team Members
      </h4>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        What each Pokemon adds when brought: win rate brought minus win rate benched.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-2 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Pokemon</th>
              <th className={thClass}>Brought</th>
              <th className={thClass}>Lead</th>
              <th className={thClass}>Win % Brought</th>
              <th className={thClass}>Win % Benched</th>
              <th className={thClass}>Adds</th>
            </tr>
          </thead>
          <tbody>
            {diagnostics.members.map((m) => {
              const key = resolveAnalyticsKey(m.species);
              return (
                <tr key={m.species} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <PokemonSprite name={key} size="sm" />
                      <span className="text-gray-800 dark:text-gray-100">{getDisplayName(key)}</span>
                    </div>
                  </td>
                  <td className={tdClass}>{pct(m.broughtRate)}</td>
                  <td className={tdClass}>{pct(m.leadRate)}</td>
                  <td className={tdClass}>{pct(m.winRateBrought)}</td>
                  <td className={tdClass}>{pct(m.winRateBenched)}</td>
                  <td className="px-2 py-3 text-center">
                    <Delta value={m.delta} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThreatList({ title, threats }: { title: string; threats: SimulationThreat[] }) {
  return (
    <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
      <h4 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100">
        <ShieldAlert className="h-5 w-5" />
        {title}
      </h4>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Win rate when the opponent has them, against the team's overall. Worst first.
      </p>
      {threats.length > 0 ? (
        <div className="space-y-3">
          {threats.map((t, index) => {
            const keys = t.species.map(resolveAnalyticsKey);
            return (
              <div
                key={t.species.join("+")}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 dark:bg-gray-700/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-5 shrink-0 text-sm text-gray-500 dark:text-gray-400">#{index + 1}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    {keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && <span className="text-gray-400">+</span>}
                        <PokemonSprite name={k} size="sm" />
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="hidden text-sm font-medium text-gray-800 sm:block dark:text-gray-100">
                      {keys.map(getDisplayName).join(" + ")}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.games} games</div>
                  </div>
                </div>
                <div className="text-right">
                  <Delta value={t.delta} />
                  <div className="text-xs text-gray-500 dark:text-gray-400">{pct(t.winRate)} win rate</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">No data</div>
      )}
    </div>
  );
}
