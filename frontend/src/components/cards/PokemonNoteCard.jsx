import React, { useState } from 'react';
import { Save, MessageSquare, ChevronDown } from 'lucide-react';
import PokemonSprite from '../PokemonSprite';

const PokemonNoteCard = ({
    member,
    isEditingNote,
    isSavingNote,
    noteText,
    onStartEditingNote,
    onCancelEditingNote,
    onSaveNote,
    onNoteTextChange,
    onKeyPress
}) => {
    const [isNoteExpanded, setIsNoteExpanded] = useState(true);

    return (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    {/* Pokemon Sprite */}
                    <PokemonSprite
                        name={member.pokemonName}
                        size="lg"
                        showName={false}
                    />

                    {/* Pokemon Name */}
                    <div className="flex-1 min-w-0">
                        <span className="text-gray-100 text-sm font-medium">
                            {member.pokemonName}
                        </span>
                        {!member.notes && !isEditingNote && (
                            <p className="text-xs text-gray-500 mt-0.5">No notes yet</p>
                        )}
                    </div>
                </div>

                {/* Edit Note Button */}
                <button
                    onClick={() => onStartEditingNote(member)}
                    disabled={isEditingNote || isSavingNote}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-600/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit notes"
                >
                    <MessageSquare className="h-4 w-4" />
                </button>
            </div>

            {/* Collapsible Notes */}
            {member.notes && !isEditingNote && (
                <button
                    type="button"
                    onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                    className={`w-full mt-2 pt-2 border-t border-slate-600/50 flex items-start gap-1.5 text-left group rounded-b-md ${isNoteExpanded ? 'bg-slate-800/50 p-2' : ''}`}
                >
                    <ChevronDown
                        className={`h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0 transition-transform ${isNoteExpanded ? 'rotate-180' : ''}`}
                    />
                    <p className={`text-sm ${isNoteExpanded ? 'whitespace-pre-wrap break-words text-gray-300' : 'truncate text-gray-400'}`}>
                        {member.notes}
                    </p>
                </button>
            )}

            {/* Inline Note Editor */}
            {isEditingNote && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                    <div className="space-y-2">
                        <textarea
                            value={noteText}
                            onChange={(e) => onNoteTextChange(e.target.value)}
                            onKeyDown={(e) => onKeyPress(e, member.id)}
                            placeholder={`Add notes about ${member.pokemonName}...`}
                            rows={6}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-500 rounded text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none text-base"
                            disabled={isSavingNote}
                            autoFocus
                        />

                        <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500">
                                Ctrl+Enter to save, Escape to cancel
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSaveNote(member.id)}
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

export default PokemonNoteCard;
