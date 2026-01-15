'use client';

import { Profile } from './pearch';

export interface SimilarSearchParams {
  query: string;
  location: string;
}

/**
 * Builds search parameters to find candidates similar to the given profile.
 *
 * Strategy:
 * 1. Use headline/title as the base query (most important for role matching)
 * 2. Append top skills to find candidates with similar expertise
 * 3. Include location for geographic matching (user can change this)
 *
 * Example output:
 *   Profile: "Senior Data Scientist" with skills ["Python", "Machine Learning", "TensorFlow"]
 *   Query: "Senior Data Scientist with Python, Machine Learning, TensorFlow experience"
 */
export function buildSimilarSearchParams(profile: Profile): SimilarSearchParams {
  // Start with the job title/headline - this is the core of "similar"
  const headline = profile.headline?.trim() || '';

  // Extract top skills (limit to 5 to keep query focused)
  const skills = profile.skills?.slice(0, 5) || [];

  let query = headline;

  // Append skills if available - this gives us skill-based matching
  if (skills.length > 0) {
    const skillsList = skills.join(', ');
    query = `${headline} with ${skillsList} experience`;
  }

  // If no headline, try to build from skills alone
  if (!headline && skills.length > 0) {
    query = `Professional with ${skills.join(', ')} skills`;
  }

  // Fallback if we have nothing useful
  if (!query.trim()) {
    query = 'Similar professional';
  }

  return {
    query: query.trim(),
    location: profile.location?.trim() || '',
  };
}

/**
 * Builds a URL-safe query string for navigating to search with pre-filled params
 */
export function buildSimilarSearchURL(profile: Profile): string {
  const params = buildSimilarSearchParams(profile);
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.set('q', params.query);
  }
  if (params.location) {
    searchParams.set('location', params.location);
  }

  return `/search?${searchParams.toString()}`;
}
