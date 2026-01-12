'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export default function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: GlassButtonProps) {
  const baseClasses =
    'glass-button inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-300';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    default: 'bg-white/5 hover:bg-white/10 text-white',
    primary: 'bg-[#0A84FF] hover:bg-[#0077ED] text-white font-semibold',
    danger: 'bg-[#FF453A]/20 hover:bg-[#FF453A]/30 text-[#FF453A]',
    ghost: 'bg-transparent hover:bg-white/5 text-white/70 hover:text-white',
  };

  const disabledClasses = disabled || loading
    ? 'opacity-50 cursor-not-allowed hover:transform-none'
    : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
