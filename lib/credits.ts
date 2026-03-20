// Credit helpers — server is source of truth, these are display-only utilities

export function getWarningLevel(remaining: number): 'none' | 'warning' | 'danger' | 'critical' {
  if (remaining <= 100) return 'critical';
  if (remaining <= 500) return 'danger';
  if (remaining <= 1000) return 'warning';
  return 'none';
}
