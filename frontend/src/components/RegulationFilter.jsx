import React from 'react';

const RegulationFilter = ({ regulations = [], value = '', onChange, className = '' }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-400 ${className}`}
    >
      <option value="">All Regulations</option>
      {regulations.map((reg) => (
        <option key={reg} value={reg}>
          {reg}
        </option>
      ))}
    </select>
  );
};

export default RegulationFilter;
