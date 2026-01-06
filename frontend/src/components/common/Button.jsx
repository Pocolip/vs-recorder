import React from 'react';
import Spinner from './Spinner';

/**
 * Reusable button component
 * @param {Object} props
 * @param {string} [props.variant] - Button variant: 'primary', 'secondary', 'danger', 'ghost'
 * @param {string} [props.size] - Button size: 'sm', 'md', 'lg'
 * @param {boolean} [props.loading] - Show loading spinner
 * @param {boolean} [props.disabled] - Disable button
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-colors flex items-center justify-center gap-2';

  const variantStyles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent hover:bg-slate-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
};

export default Button;
