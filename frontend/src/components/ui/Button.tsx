import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white border-transparent hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-secondary-600 text-white border-transparent hover:bg-secondary-700 focus:ring-secondary-500',
    outline: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-primary-500',
    ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100 focus:ring-primary-500',
    danger: 'bg-error-600 text-white border-transparent hover:bg-error-700 focus:ring-error-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="loading-spinner w-4 h-4 mr-2"></div>
      )}
      {children}
    </button>
  );
}
