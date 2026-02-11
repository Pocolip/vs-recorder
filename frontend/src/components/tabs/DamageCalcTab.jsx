import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { PokemonPanel, FieldPanel, MoveResults, MainResult, GenerationPicker } from '../calc';
import { useDamageCalc } from '../../hooks/useDamageCalc';
import useTeamMembers from '../../hooks/useTeamMembers';
import PokepasteService from '../../services/PokepasteService';
import { createDefaultPokemonState, createDefaultFieldState } from '../../utils/calcUtils';

const DamageCalcTab = ({ team, teamId }) => {
  const [p1, setP1] = useState(createDefaultPokemonState());
  const [p2, setP2] = useState(createDefaultPokemonState());
  const [field, setField] = useState(createDefaultFieldState());
  const [selectedP1Move, setSelectedP1Move] = useState(0);
  const [selectedP2Move, setSelectedP2Move] = useState(0);
  const [activeSide, setActiveSide] = useState('p1');
  const [teamPokemon, setTeamPokemon] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const { teamMembers, updateMemberCalcs } = useTeamMembers(teamId, team?.pokepaste);
  const calcResults = useDamageCalc(p1, p2, field);

  // Load team paste on mount
  useEffect(() => {
    if (!team?.pokepaste) return;
    let cancelled = false;

    PokepasteService.fetchAndParse(team.pokepaste)
      .then(parsed => {
        if (cancelled) return;
        setTeamPokemon(parsed.pokemon || []);
      })
      .catch(err => console.error('Failed to parse team paste:', err));

    return () => { cancelled = true; };
  }, [team?.pokepaste]);

  const handleP1Change = useCallback((changes) => {
    setP1(prev => ({ ...prev, ...changes }));
  }, []);

  const handleP2Change = useCallback((changes) => {
    setP2(prev => ({ ...prev, ...changes }));
  }, []);

  const handleSelectP1Move = (i) => {
    setSelectedP1Move(i);
    setActiveSide('p1');
  };

  const handleSelectP2Move = (i) => {
    setSelectedP2Move(i);
    setActiveSide('p2');
  };

  // Get the currently selected result for the main display
  const activeResult = (() => {
    if (!calcResults) return null;
    if (activeSide === 'p2') {
      return calcResults.p2Results[selectedP2Move] ?? null;
    }
    return calcResults.p1Results[selectedP1Move] ?? null;
  })();

  // Save calc result to team member notes
  const handleSave = async (desc) => {
    if (!desc || !p1.species) return;

    const member = teamMembers.find(
      m => m.pokemonName?.toLowerCase() === p1.species.toLowerCase()
    );

    if (!member) {
      setSaveMessage({ type: 'error', text: `${p1.species} not found in team members` });
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
      setSaveMessage({ type: 'success', text: 'Saved to Pokemon Notes' });
    } catch (err) {
      console.error('Failed to save calc:', err);
      setSaveMessage({ type: 'error', text: 'Failed to save' });
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
          href="https://github.com/dotMr-P/NCP-VGC-Damage-Calculator"
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
        <div className={`text-xs px-3 py-1.5 rounded ${
          saveMessage.type === 'success'
            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
            : 'bg-red-600/20 text-red-400 border border-red-600/30'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Move pickers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-blue-400 font-medium mb-1">Attacker → Defender</div>
          <MoveResults
            results={calcResults?.p1Results}
            moves={p1.moves}
            selectedIndex={selectedP1Move}
            onSelectIndex={handleSelectP1Move}
            side="p1"
            isActive={activeSide === 'p1'}
          />
        </div>

        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-red-400 font-medium mb-1">Defender → Attacker</div>
          <MoveResults
            results={calcResults?.p2Results}
            moves={p2.moves}
            selectedIndex={selectedP2Move}
            onSelectIndex={handleSelectP2Move}
            side="p2"
            isActive={activeSide === 'p2'}
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px_1fr] gap-4">
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
            side="p2"
          />
        </div>
      </div>
    </div>
  );
};

export default DamageCalcTab;
