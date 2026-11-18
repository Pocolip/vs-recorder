import { useEffect, useState } from "react";
import { Activity, ShieldAlert, Users } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PokemonSprite from "../../components/pokemon/PokemonSprite";
import SimulatedBar from "../../components/team/SimulatedBar";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useSimulation } from "../../context/SimulationContext";
import { simulationApi } from "../../services/api/simulationApi";
import { getDisplayName, resolveAnalyticsKey } from "../../utils/pokemonNameUtils";
import {
  atLeast,
  betweenRates,
  differenceText,
  formatPoints,
  fromInterval,
  threatSeverity,
  vsBaseline,
  type Signal,
} from "../../utils/winRateSignal";
import type { SimulationDiagnostics, SimulationMember, SimulationThreat } from "../../types";

// Rates here are 0-1.
const pct = (rate: number | null | undefined) => (rate == null ? "—" : `${Math.round(rate * 100)}%`);

/** Bars run to this many points; anything bigger fills them. */
const THREAT_SCALE = 20;
const MEMBER_SCALE = 10;

/** "95% range: −11.9 to −7.1 pts", or nothing when there's no margin. */
function rangeText(signal: Signal): string | undefined {
  if (!Number.isFinite(signal.margin)) return undefined;
  const low = formatPoints(signal.points - signal.margin, 1);
  const high = formatPoints(signal.points + signal.margin, 1);
  return `95% range: ${low} to ${high} pts`;
}

/** How the threat lists are ordered. */
type Ranking = "drop" | "sure";
const RANKING_KEY = "vsr.diagnostics.ranking";

function loadRanking(): Ranking {
  try {
    return localStorage.getItem(RANKING_KEY) === "sure" ? "sure" : "drop";
  } catch {
    return "drop";
  }
}

function saveRanking(ranking: Ranking) {
  try {
    localStorage.setItem(RANKING_KEY, ranking);
  } catch {
    // Not remembered; the page still works.
  }
}

/** Brought minus benched, judged by the engine's interval when it sends one. */
function memberSignal(m: SimulationMember): Signal {
  if (m.delta != null && m.ci95 && m.ci95.length === 2) return fromInterval(m.delta, m.ci95);
  return betweenRates(m.winRateBrought, m.gamesBrought, m.winRateBenched, m.gamesBenched);
}

/** The brought-minus-benched difference: a bar either side of zero, and the points. */
function Difference({ member }: { member: SimulationMember }) {
  if (member.delta == null) return <span className="text-gray-400">&mdash;</span>;
  const signal = memberSignal(member);
  const tone = differenceText(signal);
  const width = Math.min(Math.abs(signal.points) / MEMBER_SCALE, 1) * 50;
  const fill =
    signal.direction === 0 ? "bg-gray-300 dark:bg-gray-600" : signal.direction > 0 ? "bg-green-500" : "bg-red-500";
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden>
        <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400 dark:bg-gray-500" />
        <div
          className={`absolute inset-y-0 rounded-full ${fill}`}
          style={signal.points >= 0 ? { left: "50%", width: `${width}%` } : { right: "50%", width: `${width}%` }}
        />
      </div>
      <span
        className={`w-20 text-right font-semibold tabular-nums ${tone}`}
        title={[signal.direction === 0 ? "Within normal variation for these games" : null, rangeText(signal)]
          .filter(Boolean)
          .join(". ")}
      >
        {formatPoints(signal.points, 1)} pts
      </span>
    </div>
  );
}

const thClass = "px-2 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300";
const tdClass = "px-2 py-3 text-center text-gray-800 dark:text-gray-100";

export default function DiagnosticsPage() {
  const { team } = useActiveTeam();
  const { status, loadFailed, resultKey } = useSimulation();
  const teamId = team?.id ?? null;

  const [diagnostics, setDiagnostics] = useState<SimulationDiagnostics | null>(null);
  const [ranking, setRanking] = useState<Ranking>(loadRanking);
  const changeRanking = (next: Ranking) => {
    setRanking(next);
    saveRanking(next);
  };
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
            <ThreatControls winRate={diagnostics.winRate} ranking={ranking} onRankingChange={changeRanking} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ThreatList
                title="Threatening Pokemon"
                threats={diagnostics.threatSpecies}
                diagnostics={diagnostics}
                ranking={ranking}
              />
              <ThreatList
                title="Threatening Pairs"
                threats={diagnostics.threatPairs}
                diagnostics={diagnostics}
                ranking={ranking}
              />
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
        Difference: the team's win rate when the Pokemon is brought minus when it's benched. Green or red when the
        difference is real for the games played, grey when it's within normal variation.
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
              <th className={thClass}>Difference</th>
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
                    <Difference member={m} />
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

const RANKINGS: { value: Ranking; label: string; help: string }[] = [
  {
    value: "drop",
    label: "Biggest drop",
    help: "By the estimated drop. A threat seen in few games can rank high on little evidence.",
  },
  {
    value: "sure",
    label: "Surest drop",
    help: "By the drop we're 95% sure of (the near end of each range), so well-evidenced threats come first.",
  },
];

/** The ranking toggle and what the threat colours mean. */
function ThreatControls({
  winRate,
  ranking,
  onRankingChange,
}: {
  winRate: number | null;
  ranking: Ranking;
  onRankingChange: (ranking: Ranking) => void;
}) {
  const items = [
    { label: "Severe", detail: "10+ points", fill: "bg-red-500" },
    { label: "Notable", detail: "5–10", fill: "bg-orange-500" },
    { label: "Minor", detail: "under 5", fill: "bg-amber-400" },
    { label: "Within noise", detail: "too few games to tell", fill: "bg-gray-300 dark:bg-gray-600" },
  ];
  const current = RANKINGS.find((r) => r.value === ranking) ?? RANKINGS[0];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rank threats by</span>
        <div role="radiogroup" aria-label="Rank threats by" className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {RANKINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={ranking === r.value}
              onClick={() => onRankingChange(r.value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                ranking === r.value
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{current.help}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          How far the team's win rate drops when the opponent has them
          {winRate != null ? `, from its overall ${Math.round(winRate * 100)}%` : ""}. The faint band is the 95% range:
        </span>
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${item.fill}`} />
            <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
            {item.detail}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The estimate as a solid bar and its 95% range as a faint band, both on a fixed scale. */
function ThreatBar({ signal, fill }: { signal: Signal; fill: string }) {
  const at = (points: number) => `${Math.min(Math.max(points, 0) / THREAT_SCALE, 1) * 100}%`;
  const size = Math.abs(signal.points);
  const margin = Number.isFinite(signal.margin) ? signal.margin : 0;
  return (
    <div className="relative mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800" aria-hidden>
      {margin > 0 && (
        <div
          className={`absolute inset-y-0 rounded-full opacity-30 ${fill}`}
          style={{ left: at(size - margin), width: `calc(${at(size + margin)} - ${at(size - margin)})` }}
        />
      )}
      <div className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: at(size) }} />
    </div>
  );
}

function ThreatList({
  title,
  threats,
  diagnostics,
  ranking,
}: {
  title: string;
  threats: SimulationThreat[];
  diagnostics: SimulationDiagnostics;
  ranking: Ranking;
}) {
  const rows = threats.map((t) => ({
    threat: t,
    signal: vsBaseline(t.winRate, diagnostics.winRate, t.games, diagnostics.games),
  }));
  if (ranking === "sure") {
    // Stable: equal bounds keep the engine's order (biggest drop first).
    rows.sort((a, b) => atLeast(a.signal) - atLeast(b.signal));
  }
  return (
    <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
      <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100">
        <ShieldAlert className="h-5 w-5" />
        {title}
      </h4>
      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map(({ threat: t, signal }, index) => {
            const keys = t.species.map(resolveAnalyticsKey);
            const severity = threatSeverity(signal);
            const margin = Number.isFinite(signal.margin) ? `±${signal.margin.toFixed(1)}` : null;
            return (
              <div
                key={t.species.join("+")}
                className="rounded-lg bg-white p-3 dark:bg-gray-700/50"
                title={rangeText(signal)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t.games.toLocaleString()} games · {pct(t.winRate)} win rate
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold tabular-nums ${severity.text}`}>
                      {formatPoints(signal.points, 1)} pts
                    </div>
                    <div className="text-xs">
                      <span className={severity.text}>{severity.label}</span>
                      {margin && <span className="text-gray-400 dark:text-gray-500"> · {margin}</span>}
                    </div>
                  </div>
                </div>
                <ThreatBar signal={signal} fill={severity.fill} />
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
