'use client';

import { useState, useEffect } from 'react';
import { getStoredCredits, getWarningLevel, CreditState } from '@/lib/credits';

export default function CreditTracker() {
  const [credits, setCredits] = useState<CreditState>({ used: 0, limit: 300, logs: [] });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadCredits = () => {
      setCredits(getStoredCredits());
    };

    loadCredits();

    const handleCreditUpdate = () => loadCredits();
    window.addEventListener('creditUpdate', handleCreditUpdate);

    return () => {
      window.removeEventListener('creditUpdate', handleCreditUpdate);
    };
  }, []);

  const remaining = credits.limit - credits.used;
  const percentage = (credits.used / credits.limit) * 100;
  const warningLevel = getWarningLevel(credits.used, credits.limit);

  const getStatusColor = () => {
    switch (warningLevel) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'danger': return 'from-orange-500 to-orange-600';
      case 'warning': return 'from-yellow-500 to-yellow-600';
      default: return 'from-emerald-500 to-emerald-600';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="glass-card px-4 py-2 rounded-full flex items-center gap-3 transition-all duration-300 hover:scale-105"
      >
        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getStatusColor()} animate-pulse`} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{remaining}</span>
          <span className="text-xs text-white/50">credits</span>
        </div>
      </button>

      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-72 glass-card rounded-xl p-4 animate-fade-in z-50">
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Credit Usage</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-white">{credits.used}</div>
                <div className="text-xs text-white/50">Used</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <div className="text-2xl font-bold text-white">{remaining}</div>
                <div className="text-xs text-white/50">Remaining</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>0</span>
                <span>{credits.limit}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getStatusColor()} transition-all duration-500`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>

            {warningLevel !== 'none' && (
              <div className={`text-xs p-2 rounded-lg ${
                warningLevel === 'critical' ? 'bg-red-500/20 text-red-300' :
                warningLevel === 'danger' ? 'bg-orange-500/20 text-orange-300' :
                'bg-yellow-500/20 text-yellow-300'
              }`}>
                {warningLevel === 'critical' && 'API calls blocked to protect budget.'}
                {warningLevel === 'danger' && 'Consider limiting API calls.'}
                {warningLevel === 'warning' && '50% of credit limit used.'}
              </div>
            )}

            {credits.logs.length > 0 && (
              <div>
                <div className="text-xs text-white/50 mb-2">Recent Activity</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {credits.logs.slice(-5).reverse().map((log, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-white/70 truncate">{log.operation}</span>
                      <span className="text-white/50">-{log.credits}</span>
                    </div>
                  ))}
                </div>
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
