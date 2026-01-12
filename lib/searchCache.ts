// Search Results Cache with 1-hour expiry
// Persists search results in localStorage so they survive navigation

import { Profile } from './pearch';

const CACHE_KEY = 'merraine-search-cache';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export interface SearchCache {
  query: string;
  results: Profile[];
  threadId: string | null;
  options: {
    type: 'fast' | 'pro';
    insights: boolean;
    profile_scoring: boolean;
    high_freshness: boolean;
    reveal_emails: boolean;
    reveal_phones: boolean;
    limit: number;
  };
  timestamp: number;
}

/**
 * Save search results to cache
 */
export function saveSearchCache(cache: Omit<SearchCache, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  const cacheData: SearchCache = {
    ...cache,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    // localStorage might be full or disabled
    console.warn('Failed to save search cache:', error);
  }
}

/**
 * Load search results from cache if valid (not expired)
 */
export function loadSearchCache(): SearchCache | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cacheData: SearchCache = JSON.parse(cached);

    // Check if cache is expired
    const age = Date.now() - cacheData.timestamp;
    if (age > CACHE_EXPIRY_MS) {
      clearSearchCache();
      return null;
    }

    return cacheData;
  } catch (error) {
    console.warn('Failed to load search cache:', error);
    return null;
  }
}

/**
 * Clear the search cache
 */
export function clearSearchCache(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear search cache:', error);
  }
}

/**
 * Update just the results in the cache (for "Load More")
 */
export function updateSearchCacheResults(results: Profile[], threadId: string | null): void {
  if (typeof window === 'undefined') return;

  const existing = loadSearchCache();
  if (existing) {
    saveSearchCache({
      ...existing,
      results,
      threadId,
    });
  }
}

/**
 * Get cache age in minutes (for display purposes)
 */
export function getSearchCacheAge(): number | null {
  const cache = loadSearchCache();
  if (!cache) return null;

  const ageMs = Date.now() - cache.timestamp;
  return Math.floor(ageMs / 60000); // Convert to minutes
}

/**
 * Check if cache exists and is valid
 */
export function hasValidSearchCache(): boolean {
  return loadSearchCache() !== null;
}
