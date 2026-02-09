import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

const TagInput = ({ tags = [], onAddTag, onRemoveTag, placeholder = 'Search...', className = '' }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !tags.includes(trimmed.toLowerCase())) {
        onAddTag(trimmed.toLowerCase());
      }
      setInput('');
    } else if (e.key === 'Escape') {
      setInput('');
      inputRef.current?.blur();
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 focus-within:border-emerald-400 transition-colors ${className}`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 bg-slate-600 text-gray-200 px-2 py-0.5 rounded text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveTag(tag);
            }}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-gray-100 text-sm focus:outline-none placeholder-gray-400"
      />
    </div>
  );
};

export default TagInput;
