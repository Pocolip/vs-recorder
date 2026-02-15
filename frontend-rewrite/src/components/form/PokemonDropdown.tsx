import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import PokemonSprite from "../pokemon/PokemonSprite";
import { getDisplayName } from "../../utils/pokemonNameUtils";

interface PokemonDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showSprite?: boolean;
}

const PokemonDropdown: React.FC<PokemonDropdownProps> = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select Pokemon",
  disabled = false,
  showSprite = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        } ${
          value
            ? "text-gray-800 dark:text-white/90"
            : "text-gray-400 dark:text-gray-500"
        } border-gray-300 bg-white focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900`}
      >
        {showSprite && value && (
          <div className="flex-shrink-0">
            <PokemonSprite name={value} size="sm" />
          </div>
        )}
        <span className="flex-1 truncate">
          {value ? getDisplayName(value) : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 flex max-h-64 w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {options.length > 5 && (
            <div className="border-b border-gray-200 p-2 dark:border-gray-700">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Pokemon..."
                className="w-full rounded border border-gray-300 bg-transparent px-2 py-1 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-600 dark:text-white/90 dark:placeholder-gray-500"
                autoFocus
              />
            </div>
          )}

          <div className="max-h-52 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-center text-sm text-gray-400">
                No Pokemon found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    value === option
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-gray-800 dark:text-white/90"
                  }`}
                >
                  {showSprite && (
                    <div className="flex-shrink-0">
                      <PokemonSprite name={option} size="sm" />
                    </div>
                  )}
                  <span className="text-sm">{getDisplayName(option)}</span>
                  {value === option && (
                    <span className="ml-auto text-brand-500 dark:text-brand-400">
                      &#10003;
                    </span>
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
