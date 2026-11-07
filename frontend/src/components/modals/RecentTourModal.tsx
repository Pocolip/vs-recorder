import React, { useMemo, useState } from "react";
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "../ui/modal";
import PokemonSprite from "../pokemon/PokemonSprite";
import {
  getImportablePaste,
  getTeamKey,
  getTournamentTeamsForRegulation,
  type TournamentCluster,
  type TournamentInnerTeam,
  type TournamentTeamsData,
} from "../../data/tournamentTeamsByRegulation";

interface RecentTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamRegulation: string | null | undefined;
  // `pokepaste` is a paste URL (LabMaus) or inline open-teamsheet text
  // (direct Limitless/Reportworm data); both are valid opponent pokepastes.
  onImport: (pokepaste: string, notes: string) => Promise<void>;
}

const SOURCE_LINKS: Record<string, string> = {
  Limitless: "https://play.limitlesstcg.com",
  Reportworm: "https://standings.reportworm.com",
};

const ExternalTextLink: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="underline hover:text-brand-500"
  >
    {children}
  </a>
);

const SourceAttribution: React.FC<{ data: TournamentTeamsData }> = ({ data }) => {
  if (data.source === "direct" && data.sources?.length) {
    return (
      <span>
        Sourced from{" "}
        {data.sources.map((s, i) => (
          <React.Fragment key={s.name}>
            {i > 0 && " + "}
            {SOURCE_LINKS[s.name] ? (
              <ExternalTextLink href={SOURCE_LINKS[s.name]}>{s.name}</ExternalTextLink>
            ) : (
              s.name
            )}{" "}
            ({s.events} events)
          </React.Fragment>
        ))}
      </span>
    );
  }
  return (
    <span>
      Sourced from <ExternalTextLink href="https://labmaus.net">labmaus.net</ExternalTextLink>
    </span>
  );
};

const COMP_SIZES = [6, 5, 4] as const;
type CompSize = (typeof COMP_SIZES)[number];

function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "—";
  return `${Math.round((wins / total) * 100)}%`;
}

function buildImportNotes(team: TournamentInnerTeam): string {
  const parts: string[] = [];
  if (team.name) parts.push(team.name);
  if (team.tournamentName) parts.push(team.tournamentName);
  if (team.placement) parts.push(`#${team.placement}`);
  if (team.record) parts.push(team.record);
  const summary = parts.join(" · ");
  // Direct-source imports have no pokepaste link, so keep where the sheet
  // came from in the notes.
  return !team.pokepasteUrl && team.sourceUrl
    ? `${summary}\n${team.sourceUrl}`
    : summary;
}

const SpriteRow: React.FC<{ names: string[]; size?: "sm" | "md" }> = ({
  names,
  size = "sm",
}) => (
  <div className="flex flex-wrap items-center gap-0.5">
    {names.map((n, i) => (
      <PokemonSprite key={`${n}-${i}`} name={n} size={size} />
    ))}
  </div>
);

const InnerTeamRow: React.FC<{
  team: TournamentInnerTeam;
  canImport: boolean;
  imported: boolean;
  importing: boolean;
  onImport: () => void;
}> = ({ team, canImport, imported, importing, onImport }) => {
  const viewHref = team.pokepasteUrl ?? team.sourceUrl;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-gray-800 dark:text-white/90">
          {team.name || "Unnamed"}
        </span>
        {team.placement != null && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            #{team.placement}
          </span>
        )}
        {team.record && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {team.record}
          </span>
        )}
        {team.tournamentName && (
          <span
            className="truncate text-xs text-gray-500 dark:text-gray-400"
            title={team.tournamentName}
          >
            {team.tournamentName}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SpriteRow names={team.pokemonNames} size="sm" />
        <div className="flex flex-col gap-2 sm:flex-row">
          {viewHref && (
            <a
              href={viewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {team.pokepasteUrl ? "View Paste" : "View Teamsheet"}
            </a>
          )}
          <button
            type="button"
            onClick={onImport}
            disabled={!canImport || imported || importing}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {imported ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Imported
              </>
            ) : importing ? (
              "Importing…"
            ) : (
              "Import"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ClusterCard: React.FC<{
  data: TournamentTeamsData;
  cluster: TournamentCluster;
  expanded: boolean;
  onToggle: () => void;
  importedKeys: Set<string>;
  importingKey: string | null;
  onImport: (team: TournamentInnerTeam) => void;
}> = ({ data, cluster, expanded, onToggle, importedKeys, importingKey, onImport }) => {
  const winRate = formatWinRate(cluster.wins, cluster.losses);
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-gray-100/60 dark:hover:bg-white/[0.04]"
      >
        <SpriteRow names={cluster.pokemonNames} size="sm" />
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <div className="text-right">
            <div className="font-semibold text-gray-800 dark:text-white/90">
              {winRate}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              {cluster.wins}-{cluster.losses}
            </div>
          </div>
          <div className="hidden sm:block text-right text-gray-500 dark:text-gray-400">
            {cluster.teams.length} teams
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-gray-200 p-3 dark:border-gray-700">
          {cluster.teams.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No individual teams available.
            </p>
          ) : (
            cluster.teams.map((team, i) => {
              const teamKey = getTeamKey(team);
              return (
                <InnerTeamRow
                  key={`${teamKey}-${i}`}
                  team={team}
                  canImport={getImportablePaste(data, team) != null}
                  imported={importedKeys.has(teamKey)}
                  importing={importingKey === teamKey}
                  onImport={() => onImport(team)}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const RecentTourModal: React.FC<RecentTourModalProps> = ({
  isOpen,
  onClose,
  teamRegulation,
  onImport,
}) => {
  const data = useMemo(
    () => getTournamentTeamsForRegulation(teamRegulation),
    [teamRegulation],
  );
  const [activeSize, setActiveSize] = useState<CompSize>(6);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());
  const [importingKey, setImportingKey] = useState<string | null>(null);

  const composition = useMemo(
    () => data?.compositions.find((c) => c.size === activeSize) ?? null,
    [data, activeSize],
  );

  const handleImport = async (team: TournamentInnerTeam) => {
    if (!data) return;
    const teamKey = getTeamKey(team);
    const pokepaste = getImportablePaste(data, team);
    if (!pokepaste || importedKeys.has(teamKey) || importingKey) return;
    setImportingKey(teamKey);
    try {
      await onImport(pokepaste, buildImportNotes(team));
      setImportedKeys((prev) => new Set(prev).add(teamKey));
    } finally {
      setImportingKey(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-2 my-4 w-[calc(100vw-1rem)] max-w-4xl overflow-hidden sm:mx-auto"
    >
      {/*
        Explicit height (not just max-h) so the inner `flex-1 overflow-y-auto`
        list has a definite parent height to fill — without it the list grows
        to fit its content, overflows the dialog, and scroll-wheel events
        bubble up to the Modal's outer wrapper.
      */}
      <div className="flex h-[calc(90vh-2rem)] max-h-[calc(100dvh-2rem)] flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 pb-4 pt-5 dark:border-gray-700 sm:px-7 sm:pt-7">
          <h2 className="flex items-center gap-2 pr-10 text-lg font-semibold text-gray-800 dark:text-white/90 sm:text-xl">
            <Trophy className="h-5 w-5 text-brand-500" />
            Recent Tournament Teams
          </h2>
          {data ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Regulation {data.regulation} · {data.dateRange.from} – {data.dateRange.to} ·{" "}
              <SourceAttribution data={data} />
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Browse top tournament teams from the last 2 months.
            </p>
          )}
        </div>

        {data ? (
          <>
            {data.isFallbackSource && (
              /*
                LabMaus hasn't added this regulation to their filter list yet,
                so the generator pulled their "Custom format" bucket instead.
                Most of it is this regulation's tournaments, but not all — say
                so rather than passing it off as a clean per-regulation cut.
              */
              <div className="mx-5 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10 sm:mx-7">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  labmaus.net hasn't added Regulation {data.regulation} to their
                  filters yet, so these teams come from their{" "}
                  <span className="font-medium">Custom format</span> bucket —
                  where organizers are filing {data.regulation} tournaments in
                  the meantime. Most entries are {data.regulation}, but the
                  bucket also catches other custom events, so treat the
                  win rates and usage as indicative rather than exact.
                </p>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200 px-5 pt-3 dark:border-gray-700 sm:px-7">
              {COMP_SIZES.map((size) => {
                const isActive = size === activeSize;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setActiveSize(size);
                      setExpandedKey(null);
                    }}
                    className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400"
                        : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    <span className="sm:hidden">{size}</span>
                    <span className="hidden sm:inline">{size} Pokémon</span>
                  </button>
                );
              })}
            </div>

            {/* Cluster list */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 sm:px-7">
              {composition && composition.clusters.length > 0 ? (
                composition.clusters.map((cluster, idx) => {
                  const key = `${activeSize}-${idx}`;
                  return (
                    <ClusterCard
                      key={key}
                      data={data}
                      cluster={cluster}
                      expanded={expandedKey === key}
                      onToggle={() =>
                        setExpandedKey((prev) => (prev === key ? null : key))
                      }
                      importedKeys={importedKeys}
                      importingKey={importingKey}
                      onImport={handleImport}
                    />
                  );
                })
              ) : (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No clusters for this composition size.
                </p>
              )}
            </div>
          </>
        ) : (
          // Empty state — no data for this regulation
          <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-7">
            <div className="flex max-w-md flex-col items-center gap-3 text-center">
              <Info className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Not available yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Popular teams aren't available for{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {teamRegulation || "this regulation"}
                </span>{" "}
                yet. We currently have data for Regulation M-A and M-B — check
                back later as more formats are added.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RecentTourModal;
