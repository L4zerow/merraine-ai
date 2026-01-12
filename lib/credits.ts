// Credit tracking system

export interface CreditLog {
  timestamp: number;
  operation: string;
  credits: number;
  details?: string;
}

export interface CreditState {
  used: number;
  limit: number;
  logs: CreditLog[];
}

const STORAGE_KEY = 'merraine_credits';
const DEFAULT_LIMIT = 300;

export const CREDIT_THRESHOLDS = {
  warning: 50,
  danger: 75,
  critical: 95,
};

export function getStoredCredits(): CreditState {
  if (typeof window === 'undefined') {
    return { used: 0, limit: DEFAULT_LIMIT, logs: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, limit: DEFAULT_LIMIT };
    }
  } catch (e) {
    console.error('Error reading credit state:', e);
  }

  return { used: 0, limit: DEFAULT_LIMIT, logs: [] };
}

export function saveCredits(state: CreditState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving credit state:', e);
  }
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
  saveCredits({ used: 0, limit: DEFAULT_LIMIT, logs: [] });
}

export function getWarningLevel(used: number, limit: number = DEFAULT_LIMIT): 'none' | 'warning' | 'danger' | 'critical' {
  const percentage = (used / limit) * 100;

  if (percentage >= CREDIT_THRESHOLDS.critical) return 'critical';
  if (percentage >= CREDIT_THRESHOLDS.danger) return 'danger';
  if (percentage >= CREDIT_THRESHOLDS.warning) return 'warning';
  return 'none';
}

export function canAfford(cost: number): boolean {
  const state = getStoredCredits();
  return (state.used + cost) <= (state.limit - 5);
}

export function getRemainingCredits(): number {
  const state = getStoredCredits();
  return state.limit - state.used;
}
