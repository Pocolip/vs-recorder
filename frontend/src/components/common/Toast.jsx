import React, { useEffect } from 'react';

/**
 * Toast notification component
 * @param {Object} props
 * @param {string} props.message - Toast message
 * @param {string} props.type - Toast type: 'success', 'error', 'info', 'warning'
 * @param {Function} props.onClose - Callback when toast closes
 * @param {number} props.duration - Duration in ms before auto-close (default: 5000)
 */
const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    success: 'bg-emerald-600 border-emerald-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500',
    warning: 'bg-yellow-600 border-yellow-500',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div
      className={`${typeStyles[type]} border-l-4 rounded-lg shadow-lg p-4 flex items-center justify-between gap-4 min-w-[300px] max-w-md animate-slide-in`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{typeIcons[type]}</span>
        <p className="text-white font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 transition-colors text-xl leading-none"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
