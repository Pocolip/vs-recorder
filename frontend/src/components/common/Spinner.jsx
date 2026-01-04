import React from 'react';

/**
 * Loading spinner component
 * @param {Object} props
 * @param {string} props.size - Size of spinner: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.className - Additional CSS classes
 */
const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-2',
  };

  return (
    <div
      className={`animate-spin rounded-full border-b-emerald-500 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;
