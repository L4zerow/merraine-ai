'use client';

import { useState, useEffect, useRef } from 'react';
import { getWarningLevel } from '@/lib/credits';
import { useUser } from '@/lib/userContext';

interface BalanceData {
  credits_remaining: number | null;
  masterBalance: number | null;
  userAllocation: number;
  role: string;
  source: string;
}

export default function CreditTracker() {
  const { user } = useUser();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadBalance = () => {
      fetch('/api/credits/balance')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) setBalance(data);
        })
        .catch(() => {});
    };

    loadBalance();

    const handleCreditUpdate = () => loadBalance();
    window.addEventListener('creditUpdate', handleCreditUpdate);

    return () => {
      window.removeEventListener('creditUpdate', handleCreditUpdate);
    };
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isExpanded) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isExpanded]);

  if (!balance || balance.credits_remaining === null) {
    return (
      <div className="glass-card px-4 py-2 rounded-full flex items-center gap-3 opacity-50">
        <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white/50">&mdash;</span>
          <span className="text-xs text-white/50">credits</span>
        </div>
      </div>
    );
  }

  const remaining = balance.userAllocation;
  const masterUnavailable = balance.masterBalance === 0;
  const warningLevel = masterUnavailable ? 'critical' : getWarningLevel(remaining);
  const isAdmin = balance.role === 'admin';

  const getStatusColor = () => {
    switch (warningLevel) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'danger': return 'from-orange-500 to-orange-600';
      case 'warning': return 'from-yellow-500 to-yellow-600';
      default: return 'from-emerald-500 to-emerald-600';
    }
  };

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="glass-card px-4 py-2 rounded-full flex items-center gap-3 transition-all duration-300 hover:scale-105"
      >
        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getStatusColor()} animate-pulse`} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{remaining.toLocaleString()}</span>
          <span className="text-xs text-white/50">credits</span>
        </div>
      </button>

      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-72 glass-card rounded-xl p-4 animate-fade-in z-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Credit Balance</h3>
              {balance.source === 'live' && (
                <span className="text-[10px] text-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 rounded">LIVE</span>
              )}
            </div>

            <div className="text-center p-4 rounded-lg bg-white/5">
              <div className="text-3xl font-bold text-white">{remaining.toLocaleString()}</div>
              <div className="text-xs text-white/50 mt-1">Your allocated credits</div>
            </div>

            {isAdmin && balance.masterBalance !== null && (
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-white/50 mb-1">Master Pool</div>
                <div className="text-lg font-semibold text-white">{balance.masterBalance.toLocaleString()}</div>
              </div>
            )}

            {masterUnavailable && (
              <div className="text-xs p-2 rounded-lg bg-red-500/20 text-red-300">
                Credits unavailable — searches are temporarily blocked.
              </div>
            )}

            {!masterUnavailable && warningLevel !== 'none' && (
              <div className={`text-xs p-2 rounded-lg ${
                warningLevel === 'critical' ? 'bg-red-500/20 text-red-300' :
                warningLevel === 'danger' ? 'bg-orange-500/20 text-orange-300' :
                'bg-yellow-500/20 text-yellow-300'
              }`}>
                {warningLevel === 'critical' && 'Credits very low — contact admin.'}
                {warningLevel === 'danger' && 'Credits running low.'}
                {warningLevel === 'warning' && 'Credit balance getting low.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function useCreditUpdate() {
  return () => {
    window.dispatchEvent(new CustomEvent('creditUpdate'));
  };
}
