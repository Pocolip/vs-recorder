import React from 'react';

/**
 * Reusable input component
 * @param {Object} props
 * @param {string} [props.label] - Input label
 * @param {string} [props.error] - Error message
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.required] - Required field
 */
const Input = React.forwardRef(
  ({ label, error, className = '', required, ...props }, ref) => {
    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={props.id || props.name}
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`input ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
