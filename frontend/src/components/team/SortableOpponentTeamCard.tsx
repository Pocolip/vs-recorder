import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import OpponentTeamCard from "./OpponentTeamCard";
import PokemonTeam from "../pokemon/PokemonTeam";
import type { Composition } from "../../types";

interface OpponentTeam {
  id: number;
  teamId: number;
  gamePlanId: number;
  pokepaste: string;
  notes: string;
  color: string;
  position: number;
  compositions: Composition[];
  createdAt: string;
}

interface SortableOpponentTeamCardProps {
  opponentTeam: OpponentTeam;
  myTeamPokemon: string[];
  dragDisabled?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (id: number) => void;
  onUpdateNotes: (
    id: number,
    updates: { pokepaste?: string; notes?: string; color?: string },
  ) => Promise<void>;
  onAddComposition: (id: number, composition: Composition) => Promise<unknown>;
  onUpdateComposition: (
    id: number,
    index: number,
    composition: Composition,
  ) => Promise<unknown>;
  onDeleteComposition: (id: number, index: number) => Promise<unknown>;
  onDeleteTeam: (id: number) => Promise<unknown>;
}

const SortableOpponentTeamCard: React.FC<SortableOpponentTeamCardProps> = ({
  dragDisabled,
  ...props
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.opponentTeam.id, disabled: dragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <OpponentTeamCard
        {...props}
        dragHandleProps={
          dragDisabled ? undefined : { attributes, listeners }
        }
      />
    </div>
  );
};

export default SortableOpponentTeamCard;

const COLOR_BORDERS: Record<string, string> = {
  blue: "#3b82f6",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
  pink: "#ec4899",
  orange: "#f97316",
  teal: "#14b8a6",
  gray: "#6b7280",
};

interface OpponentTeamDragPreviewProps {
  team: OpponentTeam;
  title?: string | null;
}

/**
 * Compact one-row preview rendered inside DragOverlay while dragging an
 * OpponentTeamCard. Avoids dragging the full (often 200px+) card.
 */
export const OpponentTeamDragPreview: React.FC<OpponentTeamDragPreviewProps> = ({
  team,
  title,
}) => {
  const borderColor = COLOR_BORDERS[team.color] || COLOR_BORDERS.blue;
  const planCount = team.compositions?.length ?? 0;
  const label = title || "Matchup Team";

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-l-4 border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900"
      style={{ borderLeftColor: borderColor }}
    >
      <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-400" />
      <span className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
        {label}
      </span>
      {team.pokepaste && (
        <div className="flex-shrink-0">
          <PokemonTeam pokepasteUrl={team.pokepaste} size="sm" />
        </div>
      )}
      <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
        · {planCount} {planCount === 1 ? "plan" : "plans"}
      </span>
    </div>
  );
};
