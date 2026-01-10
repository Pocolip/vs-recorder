// src/components/PokemonDropdown.jsx
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import PokemonSprite from './PokemonSprite';

/**
 * Dropdown component for selecting Pokemon from a list
 * Shows Pokemon sprite next to the selected value
 * @param {Array<string>} options - Array of Pokemon names
 * @param {string} value - Currently selected Pokemon name
 * @param {Function} onChange - Callback when selection changes (value) => void
 * @param {string} placeholder - Placeholder text when no selection
 * @param {boolean} disabled - Whether the dropdown is disabled
 * @param {string} className - Additional CSS classes
 * @param {boolean} showSprite - Whether to show Pokemon sprite (default: true)
 * @param {string} label - Optional label for the dropdown
 * @param {boolean} required - Whether selection is required
 */
const PokemonDropdown = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select Pokemon',
  disabled = false,
  className = '',
  showSprite = true,
  label = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display name for Pokemon (capitalize words, handle forms)
  const getDisplayName = (pokemonName) => {
    if (!pokemonName) return '';

    // Handle Pokemon forms (e.g., "tornadus-therian" -> "Tornadus (Therian)")
    const parts = pokemonName.split('-');
    if (parts.length > 1) {
      const baseName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const form = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      return `${baseName} (${form})`;
    }

    // Regular Pokemon name
    return pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);
  };

  // Handle selection
  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = event.target.closest('.pokemon-dropdown');
      if (!dropdown && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`pokemon-dropdown relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Selected Value Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg
          text-gray-100 text-left
          focus:outline-none focus:border-emerald-400
          transition-colors
          flex items-center gap-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600 cursor-pointer'}
          ${!value ? 'text-gray-400' : ''}
        `}
      >
        {/* Sprite */}
        {showSprite && value && (
          <div className="flex-shrink-0">
            <PokemonSprite name={value} size="sm" noContainer={true} />
          </div>
        )}

        {/* Name */}
        <span className="flex-1">
          {value ? getDisplayName(value) : placeholder}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
          {/* Search Input */}
          {options.length > 5 && (
            <div className="p-2 border-b border-slate-600">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Pokemon..."
                className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                autoFocus
              />
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto max-h-52">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-400 text-sm text-center">
                No Pokemon found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`
                    w-full px-3 py-2 text-left flex items-center gap-2
                    hover:bg-slate-600 transition-colors
                    ${value === option ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-100'}
                  `}
                >
                  {/* Sprite */}
                  {showSprite && (
                    <div className="flex-shrink-0">
                      <PokemonSprite name={option} size="sm" noContainer={true} />
                    </div>
                  )}

                  {/* Name */}
                  <span className="text-sm">{getDisplayName(option)}</span>

                  {/* Selected Indicator */}
                  {value === option && (
                    <span className="ml-auto text-emerald-400">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PokemonDropdown;
