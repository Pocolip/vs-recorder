// src/components/CompactReplayCard.jsx
import React from 'react';
import { Trash2, Edit3, Save, X, MessageSquare, ExternalLink } from 'lucide-react';
import PokemonTeam from './PokemonTeam';

const CompactReplayCard = ({
                               replay,
                               formatTimeAgo,
                               isDeleting,
                               isEditingNote,
                               isSavingNote,
                               noteText,
                               onDeleteReplay,
                               onStartEditingNote,
                               onCancelEditingNote,
                               onSaveNote,
                               onNoteTextChange,
                               onKeyPress
                           }) => {

    const getResultDisplay = () => {
        if (!replay.result) {
            return {
                text: 'UNKNOWN',
                className: 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
            };
        }

        return replay.result === 'win'
            ? {
                text: 'WIN',
                className: 'bg-green-600/20 text-green-400 border border-green-600/30'
            }
            : {
                text: 'LOSS',
                className: 'bg-red-600/20 text-red-400 border border-red-600/30'
            };
    };

    const getOpponentDisplay = () => {
        if (!replay.opponent) {
            return 'Unknown opponent';
        }

        // If opponent contains "vs", it's a fallback format
        if (replay.opponent.includes(' vs ')) {
            return replay.opponent;
        }

        return `vs ${replay.opponent}`;
    };

    const getOpponentTeam = () => {
        // Extract opponent's team from battleData
        if (!replay.battleData || !replay.battleData.teams || !replay.battleData.opponentPlayer) {
            return [];
        }

        const opponentTeam = replay.battleData.teams[replay.battleData.opponentPlayer] || [];

        // Clean up Pokemon names (remove forms, levels, etc.)
        return opponentTeam.map(pokemon => {
            // Remove everything after comma (level, gender, etc.)
            let cleanName = pokemon.split(',')[0];

            // Handle special forms that need specific API names
            const formMappings = {
                // Urshifu forms
                'Urshifu-*': 'urshifu', // Default to Single Strike form
                'Urshifu-Rapid-Strike': 'urshifu-rapid-strike',
                'Urshifu-Single-Strike': 'urshifu',

                // Calyrex forms
                'Calyrex-Shadow': 'calyrex-shadow',
                'Calyrex-Ice': 'calyrex-ice',

                // Kyurem forms
                'Kyurem-Black': 'kyurem-black',
                'Kyurem-White': 'kyurem-white',

                // Necrozma forms
                'Necrozma-Dawn-Wings': 'necrozma-dawn-wings',
                'Necrozma-Dusk-Mane': 'necrozma-dusk-mane',

                // Zacian/Zamazenta forms
                'Zacian-Crowned': 'zacian-crowned',
                'Zamazenta-Crowned': 'zamazenta-crowned',

                // Tornadus/Thundurus/Landorus forms
                'Tornadus-Therian': 'tornadus-therian',
                'Thundurus-Therian': 'thundurus-therian',
                'Landorus-Therian': 'landorus-therian',

                // Paradox Pokemon
                'Iron Hands': 'iron-hands',
                'Iron Bundle': 'iron-bundle',
                'Iron Valiant': 'iron-valiant',
                'Iron Crown': 'iron-crown',
                'Iron Boulder': 'iron-boulder',
                'Flutter Mane': 'flutter-mane',
                'Scream Tail': 'scream-tail',
                'Brute Bonnet': 'brute-bonnet',
                'Roaring Moon': 'roaring-moon',
                'Walking Wake': 'walking-wake',
                'Raging Bolt': 'raging-bolt',

                // Treasures of Ruin
                'Chien-Pao': 'chien-pao',
                'Wo-Chien': 'wo-chien',
                'Ting-Lu': 'ting-lu',
                'Chi-Yu': 'chi-yu',

                // Ogerpon forms - API uses -mask suffix
                'Ogerpon-Hearthflame': 'ogerpon-hearthflame-mask',
                'Ogerpon-Wellspring': 'ogerpon-wellspring-mask',
                'Ogerpon-Cornerstone': 'ogerpon-cornerstone-mask',
                'Ogerpon-Teal': 'ogerpon', // Base form

                // Indeedee forms
                'Indeedee-F': 'indeedee-female',
                'Indeedee-M': 'indeedee', // Male is default

                // Sinistcha forms - fallback to base since forms don't have different sprites
                'Sinistcha-Masterpiece': 'sinistcha',
                'Sinistcha-Counterfeit': 'sinistcha',

                // Poltchageist forms - fallback to base since forms don't have different sprites
                'Poltchageist-Artisan': 'poltchageist',
                'Poltchageist-Counterfeit': 'poltchageist',

                // Meowstic forms
                'Meowstic-F': 'meowstic-female',
                'Meowstic-M': 'meowstic', // Male is default

                // Basculegion forms
                'Basculegion-F': 'basculegion-female',
                'Basculegion-M': 'basculegion', // Male is default

                // Oinkologne forms
                'Oinkologne-F': 'oinkologne-female',
                'Oinkologne-M': 'oinkologne', // Male is default

                // Terapagos forms
                'Terapagos-Terastal': 'terapagos-terastal',
                'Terapagos-Stellar': 'terapagos-stellar',

                // Giratina forms
                'Giratina-Origin': 'giratina-origin',
                'Giratina-Altered': 'giratina',

                // Dialga/Palkia Origin forms
                'Dialga-Origin': 'dialga-origin',
                'Palkia-Origin': 'palkia-origin',

                // Rotom forms
                'Rotom-Heat': 'rotom-heat',
                'Rotom-Wash': 'rotom-wash',
                'Rotom-Frost': 'rotom-frost',
                'Rotom-Fan': 'rotom-fan',
                'Rotom-Mow': 'rotom-mow',

                // Gourgeist forms (use default size)
                'Gourgeist-Small': 'gourgeist',
                'Gourgeist-Large': 'gourgeist',
                'Gourgeist-Super': 'gourgeist',

                // Pumpkaboo forms (use default size)
                'Pumpkaboo-Small': 'pumpkaboo',
                'Pumpkaboo-Large': 'pumpkaboo',
                'Pumpkaboo-Super': 'pumpkaboo'
            };

            // Check if we have a specific mapping
            if (formMappings[cleanName]) {
                return formMappings[cleanName];
            }

            // Convert to API format
            return cleanName.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9\-]/g, '')
                .replace(/--+/g, '-')
                .replace(/^-|-$/g, '');
        });
    };

    const resultDisplay = getResultDisplay();
    const opponentTeam = getOpponentTeam();

    return (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    {/* Result Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${resultDisplay.className}`}>
                        {resultDisplay.text}
                    </span>

                    {/* Opponent and Battle Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-200 text-sm font-medium">
                                {getOpponentDisplay()}
                            </span>
                            <span className="text-gray-500 text-xs">•</span>
                            <span className="text-gray-400 text-xs">{formatTimeAgo(replay.createdAt)}</span>
                        </div>

                        {/* Additional battle info */}
                        {replay.battleData && (replay.battleData.userPlayer || replay.battleData.winner) && (
                            <div className="text-xs text-gray-500 mt-1">
                                {replay.battleData.winner && (
                                    <span>Winner: {replay.battleData.winner}</span>
                                )}
                                {replay.battleData.userPlayer && replay.battleData.winner && (
                                    <span> • You were {replay.battleData.userPlayer}</span>
                                )}
                            </div>
                        )}

                        {/* Notes Preview */}
                        {replay.notes && !isEditingNote && (
                            <p className="text-gray-400 text-xs mt-1 truncate">
                                📝 {replay.notes}
                            </p>
                        )}
                    </div>

                    {/* Opponent Team Display - Horizontally positioned */}
                    {opponentTeam.length > 0 && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400 whitespace-nowrap">vs</span>
                            <PokemonTeam
                                pokemonNames={opponentTeam}
                                size="md"
                                showNames={false}
                                maxDisplay={6}
                                className="flex-shrink-0"
                            />
                        </div>
                    )}

                    {/* Replay Link */}
                    <a
                        href={replay.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded hover:bg-emerald-600/10 transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" />
                        View Replay
                    </a>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 ml-4">
                    <button
                        onClick={() => onStartEditingNote(replay)}
                        disabled={isEditingNote || isSavingNote}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-600/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Edit notes"
                    >
                        <MessageSquare className="h-3 w-3" />
                    </button>

                    <button
                        onClick={() => onDeleteReplay(replay.id)}
                        disabled={isDeleting || isEditingNote}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete replay"
                    >
                        {isDeleting ? (
                            <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                        ) : (
                            <Trash2 className="h-3 w-3" />
                        )}
                    </button>
                </div>
            </div>

            {/* Inline Note Editor */}
            {isEditingNote && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                    <div className="space-y-2">
                        <textarea
                            value={noteText}
                            onChange={(e) => onNoteTextChange(e.target.value)}
                            onKeyDown={(e) => onKeyPress(e, replay.id)}
                            placeholder="Add notes about this game..."
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-500 rounded text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none text-sm"
                            disabled={isSavingNote}
                            autoFocus
                        />

                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500">
                                Ctrl+Enter to save, Escape to cancel
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSaveNote(replay.id)}
                                    disabled={isSavingNote}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingNote ? (
                                        <>
                                            <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-2 w-2" />
                                            Save
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onCancelEditingNote}
                                    disabled={isSavingNote}
                                    className="px-3 py-1 text-gray-300 hover:text-gray-100 transition-colors text-xs disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompactReplayCard;