import React, { useMemo, useState } from "react";
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  Info,
} from "lucide-react";
import { Modal } from "../ui/modal";
import PokemonSprite from "../pokemon/PokemonSprite";
import {
  getTournamentTeamsForRegulation,
  type TournamentCluster,
  type TournamentInnerTeam,
} from "../../data/tournamentTeamsByRegulation";

interface RecentTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamRegulation: string | null | undefined;
  onImport: (pokepasteUrl: string, notes: string) => Promise<void>;
}

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
  return parts.join(" · ");
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
  imported: boolean;
  importing: boolean;
  onImport: () => void;
}> = ({ team, imported, importing, onImport }) => {
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
          <a
            href={team.pokepasteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Paste
          </a>
          <button
            type="button"
            onClick={onImport}
            disabled={imported || importing}
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
  cluster: TournamentCluster;
  expanded: boolean;
  onToggle: () => void;
  importedUrls: Set<string>;
  importingUrl: string | null;
  onImport: (team: TournamentInnerTeam) => void;
}> = ({ cluster, expanded, onToggle, importedUrls, importingUrl, onImport }) => {
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
            cluster.teams.map((team, i) => (
              <InnerTeamRow
                key={`${team.pokepasteUrl}-${i}`}
                team={team}
                imported={importedUrls.has(team.pokepasteUrl)}
                importing={importingUrl === team.pokepasteUrl}
                onImport={() => onImport(team)}
              />
            ))
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
  const [importedUrls, setImportedUrls] = useState<Set<string>>(new Set());
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  const composition = useMemo(
    () => data?.compositions.find((c) => c.size === activeSize) ?? null,
    [data, activeSize],
  );

  const handleImport = async (team: TournamentInnerTeam) => {
    if (importedUrls.has(team.pokepasteUrl) || importingUrl) return;
    setImportingUrl(team.pokepasteUrl);
    try {
      await onImport(team.pokepasteUrl, buildImportNotes(team));
      setImportedUrls((prev) => new Set(prev).add(team.pokepasteUrl));
    } finally {
      setImportingUrl(null);
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
              <span>
                Sourced from{" "}
                <a
                  href="https://labmaus.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-brand-500"
                >
                  labmaus.net
                </a>
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
              Browse top tournament teams from the last 2 months.
            </p>
          )}
        </div>

        {data ? (
          <>
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
                      cluster={cluster}
                      expanded={expandedKey === key}
                      onToggle={() =>
                        setExpandedKey((prev) => (prev === key ? null : key))
                      }
                      importedUrls={importedUrls}
                      importingUrl={importingUrl}
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
