// Credit tracking system
// Source of truth: Pearch API's credits_remaining field
// We store the last known balance from Pearch and log operations for history

export interface CreditLog {
  timestamp: number;
  operation: string;
  credits: number;
  details?: string;
}

export interface CreditState {
  ppiBalance: number | null; // Last known Pearch balance (source of truth)
  used: number;              // Legacy: total estimated usage for logging
  limit: number;             // Legacy: kept for backward compat
  logs: CreditLog[];
}

const STORAGE_KEY = 'merraine_credits';
const DEFAULT_LIMIT = 10000; // High default — Pearch balance is the real limit

export const CREDIT_THRESHOLDS = {
  warning: 50,
  danger: 75,
  critical: 95,
};

export function getStoredCredits(): CreditState {
  if (typeof window === 'undefined') {
    return { ppiBalance: null, used: 0, limit: DEFAULT_LIMIT, logs: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ppiBalance: parsed.ppiBalance ?? null,
        used: parsed.used ?? 0,
        limit: parsed.limit ?? DEFAULT_LIMIT,
        logs: parsed.logs ?? [],
      };
    }
  } catch (e) {
    console.error('Error reading credit state:', e);
  }

  return { ppiBalance: null, used: 0, limit: DEFAULT_LIMIT, logs: [] };
}

export function saveCredits(state: CreditState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving credit state:', e);
  }
}

// Update the Pearch balance from API response — this is the source of truth
export function updatePearchBalance(creditsRemaining: number): void {
  const state = getStoredCredits();
  state.ppiBalance = creditsRemaining;
  saveCredits(state);
}

export function logCreditUsage(
  operation: string,
  credits: number,
  details?: string
): CreditState {
  const state = getStoredCredits();

  const log: CreditLog = {
    timestamp: Date.now(),
    operation,
    credits,
    details,
  };

  state.used += credits;
  state.logs.push(log);

  if (state.logs.length > 100) {
    state.logs = state.logs.slice(-100);
  }

  saveCredits(state);
  return state;
}

export function resetCredits(): void {
  saveCredits({ ppiBalance: null, used: 0, limit: DEFAULT_LIMIT, logs: [] });
}

export function getWarningLevel(remaining: number): 'none' | 'warning' | 'danger' | 'critical' {
  // Warning levels based on absolute remaining credits
  if (remaining <= 100) return 'critical';
  if (remaining <= 500) return 'danger';
  if (remaining <= 1000) return 'warning';
  return 'none';
}

export function canAfford(cost: number): boolean {
  const remaining = getRemainingCredits();
  if (remaining === null) return true; // Allow if we don't know balance yet
  return cost <= remaining;
}

export function getRemainingCredits(): number | null {
  const state = getStoredCredits();
  // Use Pearch balance as source of truth
  if (state.ppiBalance !== null) return state.ppiBalance;
  // Fallback to legacy calc if Pearch balance not yet received
  return state.limit - state.used;
}
