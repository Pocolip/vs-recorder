import React from "react";

interface RegulationFilterProps {
  value: string;
  onChange: (value: string) => void;
  regulations: string[];
}

function shortRegulation(reg: string): string {
  const match = reg.match(/Regulation\s+([A-Z])$/);
  return match ? `Reg ${match[1]}` : reg;
}

const RegulationFilter: React.FC<RegulationFilterProps> = ({
  value,
  onChange,
  regulations,
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800 ${
        value ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400"
      }`}
    >
      <option value="" className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
        All Regulations
      </option>
      {regulations.map((reg) => (
        <option
          key={reg}
          value={reg}
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {shortRegulation(reg)}
        </option>
      ))}
    </select>
  );
};

export default RegulationFilter;
