import { useState, useEffect, useCallback, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { PokemonPanel, FieldPanel, MoveResults, MainResult, GenerationPicker } from "../../components/calc";
import { useDamageCalc } from "../../hooks/useDamageCalc";
import useTeamMembers from "../../hooks/useTeamMembers";
import * as pokepasteService from "../../services/pokepasteService";
import type { PokemonData as PokemonFromPaste } from "../../services/pokepasteService";
import { createDefaultPokemonState, createDefaultFieldState } from "../../utils/calcUtils";
import { useActiveTeam } from "../../context/ActiveTeamContext";
import { useCalcState } from "../../context/CalcStateContext";
import type { PokemonState, FieldState } from "../../types";

export default function CalculatorPage() {
  const { team } = useActiveTeam();
  const calcStore = useCalcState();
  const teamId = team?.id ?? null;

  // Restore snapshot if one exists for this team
  const snapshot = teamId != null ? calcStore.get(teamId) : undefined;

  const [p1, setP1] = useState<PokemonState>(snapshot?.p1 ?? createDefaultPokemonState());
  const [p2, setP2] = useState<PokemonState>(snapshot?.p2 ?? createDefaultPokemonState());
  const [field, setField] = useState<FieldState>(snapshot?.field ?? createDefaultFieldState());
  const [selectedP1Move, setSelectedP1Move] = useState(snapshot?.selectedP1Move ?? 0);
  const [selectedP2Move, setSelectedP2Move] = useState(snapshot?.selectedP2Move ?? 0);
  const [activeSide, setActiveSide] = useState<"p1" | "p2">(snapshot?.activeSide ?? "p1");
  const [teamPokemon, setTeamPokemon] = useState<PokemonFromPaste[]>(snapshot?.teamPokemon ?? []);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Keep refs in sync for the unmount save
  const stateRef = useRef({ p1, p2, field, selectedP1Move, selectedP2Move, activeSide, teamPokemon });
  stateRef.current = { p1, p2, field, selectedP1Move, selectedP2Move, activeSide, teamPokemon };

  // Save state to context on unmount
  useEffect(() => {
    return () => {
      if (teamId != null) {
        calcStore.set(teamId, stateRef.current);
      }
    };
  }, [teamId, calcStore]);

  const { teamMembers, updateMemberCalcs } = useTeamMembers(teamId, team?.pokepaste);
  const calcResults = useDamageCalc(p1, p2, field);

  // Load team paste on mount (skip if we already have it from snapshot)
  useEffect(() => {
    if (!team?.pokepaste) return;
    if (teamPokemon.length > 0) return; // Already have data from snapshot
    let cancelled = false;

    pokepasteService
      .fetchAndParse(team.pokepaste)
      .then((parsed) => {
        if (cancelled) return;
        setTeamPokemon(parsed);
      })
      .catch((err) => console.error("Failed to parse team paste:", err));

    return () => {
      cancelled = true;
    };
  }, [team?.pokepaste]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleP1Change = useCallback((changes: Partial<PokemonState>) => {
    setP1((prev) => ({ ...prev, ...changes }));
  }, []);

  const handleP2Change = useCallback((changes: Partial<PokemonState>) => {
    setP2((prev) => ({ ...prev, ...changes }));
  }, []);

  const handleSelectP1Move = (i: number) => {
    setSelectedP1Move(i);
    setActiveSide("p1");
  };

  const handleSelectP2Move = (i: number) => {
    setSelectedP2Move(i);
    setActiveSide("p2");
  };

  // Get the currently selected result for the main display
  const activeResult = (() => {
    if (!calcResults) return null;
    if (activeSide === "p2") {
      return calcResults.p2Results[selectedP2Move] ?? null;
    }
    return calcResults.p1Results[selectedP1Move] ?? null;
  })();

  // Save calc result to team member notes
  const handleSave = async (desc: string) => {
    if (!desc || !p1.species) return;

    const member = teamMembers.find(
      (m) => m.pokemonName?.toLowerCase() === p1.species.toLowerCase(),
    );

    if (!member) {
      setSaveMessage({ type: "error", text: `${p1.species} not found in team members` });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    try {
      setSaving(true);
      const existingCalcs = member.calcs || [];
      // Avoid duplicates
      if (!existingCalcs.includes(desc)) {
        await updateMemberCalcs(member.id, [...existingCalcs, desc]);
      }
      setSaveMessage({ type: "success", text: "Saved to Pokemon Notes" });
    } catch (err) {
      console.error("Failed to save calc:", err);
      setSaveMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <GenerationPicker value={9} onChange={() => {}} />
        <a
          href="https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          Sets via NCP Calc
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Save message toast */}
      {saveMessage && (
        <div
          className={`text-xs px-3 py-1.5 rounded ${
            saveMessage.type === "success"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
              : "bg-red-600/20 text-red-400 border border-red-600/30"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Move pickers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-blue-400 font-medium mb-1">Attacker &rarr; Defender</div>
          <MoveResults
            results={calcResults?.p1Results}
            moves={p1.moves}
            selectedIndex={selectedP1Move}
            onSelectIndex={handleSelectP1Move}
            side="p1"
            isActive={activeSide === "p1"}
          />
        </div>

        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-red-400 font-medium mb-1">Defender &rarr; Attacker</div>
          <MoveResults
            results={calcResults?.p2Results}
            moves={p2.moves}
            selectedIndex={selectedP2Move}
            onSelectIndex={handleSelectP2Move}
            side="p2"
            isActive={activeSide === "p2"}
          />
        </div>
      </div>

      {/* Calc result */}
      <MainResult
        result={activeResult}
        onSave={teamMembers.length > 0 ? handleSave : null}
        saving={saving}
      />

      {/* Pokemon editors + field (bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_1fr] gap-4">
        {/* P1 Panel */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-blue-400 font-medium mb-2">Attacker</div>
          <PokemonPanel
            state={p1}
            onChange={handleP1Change}
            teamPokemon={teamPokemon}
            side="p1"
          />
        </div>

        {/* Field Panel (center) */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 font-medium mb-2">Field</div>
          <FieldPanel fieldState={field} onChange={setField} />
        </div>

        {/* P2 Panel */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-red-400 font-medium mb-2">Defender</div>
          <PokemonPanel
            state={p2}
            onChange={handleP2Change}
            teamPokemon={null}
            hasOppositeSidebar={teamPokemon.length > 0}
            side="p2"
          />
        </div>
      </div>
    </div>
  );
}
