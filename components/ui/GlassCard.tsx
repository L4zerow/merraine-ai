'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className = '',
  hover = false,
  onClick,
}: GlassCardProps) {
  const baseClasses = 'glass-card p-6 rounded-2xl';
  const hoverClasses = hover
    ? 'transition-all duration-300 hover:bg-white/10 hover:translate-y-[-2px] hover:shadow-lg cursor-pointer'
    : '';

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
