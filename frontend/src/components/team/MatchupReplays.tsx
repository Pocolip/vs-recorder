import { useId, useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { PokemonData } from "../../services/pokepasteService";
import type { Replay } from "../../types";
import { matchReplayTeam } from "../../utils/matchupMatching";
import { getResultDisplay } from "../../utils/resultUtils";
import { formatTimeAgo } from "../../utils/timeUtils";

interface Props {
  pokemon: PokemonData[];
  replays: Replay[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function MatchupReplays({ pokemon, replays, loading, error, onRetry }: Props) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const groups = useMemo(() => {
    const confirmed: Replay[] = [];
    const possible: Replay[] = [];
    for (const replay of replays) {
      const confidence = matchReplayTeam(pokemon, replay);
      if (confidence === "confirmed") confirmed.push(replay);
      if (confidence === "possible") possible.push(replay);
    }
    return { confirmed, possible };
  }, [pokemon, replays]);
  const ready = !loading && !error && pokemon.length === 6;
  return (
    <section className="border-t border-gray-200 p-4 dark:border-gray-700">
      <button type="button" aria-expanded={expanded} aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full flex-wrap items-center gap-2 text-left text-sm font-semibold text-gray-800 dark:text-white/90">
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        Replays
        {ready && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
          {groups.confirmed.length} confirmed · {groups.possible.length} possible
        </span>}
      </button>
      <div id={id} hidden={!expanded} className="mt-3 space-y-4 text-sm">
        {loading ? <p role="status">Loading matching replays...</p> :
          error ? <p role="alert">{error} <button type="button" onClick={onRetry} className="text-brand-500 underline">Retry</button></p> :
          pokemon.length !== 6 ? <p>A complete six-Pokémon matchup paste is needed to match replays.</p> :
          groups.confirmed.length + groups.possible.length === 0 ? <p>No matching replays uploaded for this team.</p> :
          <>
            <ReplayGroup title="Confirmed matches" replays={groups.confirmed} />
            <ReplayGroup title="Possible matches" replays={groups.possible} possible />
          </>}
      </div>
    </section>
  );
}

function ReplayGroup({ title, replays, possible = false }: { title: string; replays: Replay[]; possible?: boolean }) {
  const [limit, setLimit] = useState(10);
  if (!replays.length) return null;
  return (
    <div>
      <h5 className="mb-2 font-medium text-gray-700 dark:text-gray-300">{title} ({replays.length})</h5>
      <ul className="space-y-2">
        {replays.slice(0, limit).map((replay) => {
          const result = getResultDisplay(replay.result);
          return <li key={replay.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs ${result.className}`}>{result.text}</span>
              <span className="min-w-0 flex-1 break-words text-gray-800 dark:text-gray-200">vs {replay.opponent || "Unknown opponent"}</span>
              <time dateTime={replay.createdAt} title={replay.createdAt} className="text-xs text-gray-500">{formatTimeAgo(replay.createdAt)}</time>
              <a href={replay.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-500">
                View <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            </div>
            {possible && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Relevant items or formes were not fully revealed.</p>}
          </li>;
        })}
      </ul>
      {limit < replays.length && <button type="button" onClick={() => setLimit((n) => n + 10)} className="mt-2 text-brand-500">Show more</button>}
    </div>
  );
}
