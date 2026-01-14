// Search Results Utilities - Tier grouping, sorting, and filtering
// Client-side utilities for organizing API results

import { Profile } from './pearch';

// Tier definitions based on API score (0.0-4.0 scale, displayed as percentage)
export type TierName = 'excellent' | 'good' | 'fair' | 'below';

export interface TierInfo {
  name: TierName;
  label: string;
  minScore: number;  // As percentage (0-100)
  maxScore: number;  // As percentage (0-100)
  color: string;
  bgColor: string;
}

export const TIERS: TierInfo[] = [
  { name: 'excellent', label: 'Excellent Match', minScore: 90, maxScore: 100, color: '#30D158', bgColor: 'bg-green-500/20' },
  { name: 'good', label: 'Good Match', minScore: 70, maxScore: 89, color: '#0A84FF', bgColor: 'bg-blue-500/20' },
  { name: 'fair', label: 'Fair Match', minScore: 50, maxScore: 69, color: '#FF9500', bgColor: 'bg-orange-500/20' },
  // "below" is used for both low scores AND unscored results
  { name: 'below', label: 'Search Results', minScore: -999, maxScore: 49, color: '#0A84FF', bgColor: 'bg-blue-500/20' },
];

export interface TierGroups {
  excellent: Profile[];
  good: Profile[];
  fair: Profile[];
  below: Profile[];
}

/**
 * Convert API score to percentage (0-100)
 * API can return scores in different formats:
 * - 0.0-1.0: decimal percentage (multiply by 100)
 * - 0.0-4.0: rating scale (divide by 4, then multiply by 100)
 * - Already percentage: > 4 means it's already a percentage
 *
 * NOTE: Pearch API currently returns score=4 for ALL matched candidates,
 * which doesn't provide meaningful differentiation. When this happens,
 * we return -1 to indicate "no meaningful score" so UI can handle it.
 */
export function scoreToPercentage(score: number | undefined): number {
  if (score === undefined || score === null) return -1; // No score = -1

  // If score > 100, cap at 100
  if (score > 100) return 100;

  // If score > 4, assume it's already a percentage
  if (score > 4) return Math.round(score);

  // If score > 1 and <= 4, it's likely a 0-4 scale
  // NOTE: Pearch always returns 4, so this always = 100%
  if (score > 1) return Math.round((score / 4) * 100);

  // If score <= 1, it's a decimal (0.0-1.0 scale)
  return Math.round(score * 100);
}

/**
 * Check if scores are meaningful (have variation) or all the same
 */
export function hasVariedScores(profiles: Profile[]): boolean {
  const scores = profiles.map(p => p.score).filter(s => s !== undefined);
  if (scores.length < 2) return false;
  const uniqueScores = new Set(scores);
  return uniqueScores.size > 1;
}

/**
 * Get tier info for a given score (as percentage)
 */
export function getTierForScore(scorePercent: number): TierInfo {
  for (const tier of TIERS) {
    if (scorePercent >= tier.minScore && scorePercent <= tier.maxScore) {
      return tier;
    }
  }
  return TIERS[3]; // Default to 'below'
}

/**
 * Group profiles by score tiers
 */
export function groupByTier(profiles: Profile[]): TierGroups {
  const groups: TierGroups = {
    excellent: [],
    good: [],
    fair: [],
    below: [],
  };

  for (const profile of profiles) {
    const scorePercent = scoreToPercentage(profile.score);
    const tier = getTierForScore(scorePercent);
    groups[tier.name].push(profile);
  }

  return groups;
}

/**
 * Sort profiles by a given column
 */
export type SortColumn = 'name' | 'score' | 'location';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

export function sortProfiles(
  profiles: Profile[],
  sortConfig: SortConfig
): Profile[] {
  const { column, direction } = sortConfig;
  const modifier = direction === 'asc' ? 1 : -1;

  return [...profiles].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (column) {
      case 'name':
        aValue = (a.name || '').toLowerCase();
        bValue = (b.name || '').toLowerCase();
        break;
      case 'score':
        aValue = scoreToPercentage(a.score);
        bValue = scoreToPercentage(b.score);
        break;
      case 'location':
        aValue = (a.location || '').toLowerCase();
        bValue = (b.location || '').toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return -1 * modifier;
    if (aValue > bValue) return 1 * modifier;
    return 0;
  });
}

/**
 * Deduplicate profiles by ID
 * Keeps the profile with the highest score if duplicates exist
 */
export function deduplicateProfiles(profiles: Profile[]): Profile[] {
  const seen = new Map<string, Profile>();

  for (const profile of profiles) {
    const key = profile.id || generateProfileKey(profile);
    const existing = seen.get(key);

    // Keep the one with higher score, or the new one if scores are equal
    if (!existing || (profile.score ?? 0) > (existing.score ?? 0)) {
      seen.set(key, profile);
    }
  }

  return Array.from(seen.values());
}

/**
 * Generate a fallback key for profiles without an ID
 * Uses deterministic data so the same profile always gets the same key
 * Exported for use as React keys
 */
export function generateProfileKey(profile: Profile): string {
  // Build a deterministic key from available profile data
  const parts = [
    profile.name || 'unknown',
    profile.linkedin_url || '',
    profile.email || '',
    profile.headline || '',
    profile.location || '',
  ].filter(Boolean);
  return parts.join('-').toLowerCase().replace(/\s+/g, '-');
}

/**
 * Get count by tier for display
 */
export function getTierCounts(groups: TierGroups): Record<TierName, number> {
  return {
    excellent: groups.excellent.length,
    good: groups.good.length,
    fair: groups.fair.length,
    below: groups.below.length,
  };
}

/**
 * Get total count across all tiers
 */
export function getTotalCount(groups: TierGroups): number {
  return groups.excellent.length + groups.good.length + groups.fair.length + groups.below.length;
}
