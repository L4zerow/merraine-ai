'use client';

import { Profile } from './pearch';

export interface SimilarSearchParams {
  query: string;
  location: string;
}

const MAX_QUERY_LENGTH = 150; // Keep queries focused for better Pearch matching

/**
 * Builds search parameters to find candidates similar to the given profile.
 *
 * Strategy:
 * 1. Use headline/title as the base query (most important for role matching)
 * 2. Append top 3 skills (not 5 — too many skills cause zero results)
 * 3. Cap total query length at 150 chars to avoid over-specification
 * 4. Location is handled by the caller (search page uses activeLocation)
 *
 * Example output:
 *   Profile: "Senior Data Scientist at Google" with skills ["Python", "Machine Learning", "TensorFlow"]
 *   Query: "Senior Data Scientist with Python, Machine Learning, TensorFlow experience"
 */
export function buildSimilarSearchParams(profile: Profile): SimilarSearchParams {
  // Start with the job title/headline - this is the core of "similar"
  let headline = profile.headline?.trim() || '';

  // Remove company name from headline (e.g., "CEO at Company" -> "CEO")
  // LinkedIn format is typically "Job Title at Company Name"
  if (headline.includes(' at ')) {
    headline = headline.split(' at ')[0].trim();
  }
  // Also handle "Job Title @ Company" format
  if (headline.includes(' @ ')) {
    headline = headline.split(' @ ')[0].trim();
  }
  // Handle "Job Title | Company" format
  if (headline.includes(' | ')) {
    headline = headline.split(' | ')[0].trim();
  }
  // Handle "Job Title - Company" format (but not compound titles like "VP - Engineering")
  // Only strip if the part after dash looks like a company name (has capital letter, not a role word)
  if (headline.includes(' - ') && headline.split(' - ').length === 2) {
    const parts = headline.split(' - ');
    const afterDash = parts[1].trim().toLowerCase();
    const roleWords = ['engineer', 'manager', 'director', 'lead', 'senior', 'junior', 'vp', 'head'];
    const isLikelyCompany = !roleWords.some(w => afterDash.startsWith(w));
    if (isLikelyCompany) {
      headline = parts[0].trim();
    }
  }

  // Extract top skills (limit to 3 for focused matching — 5 was too specific)
  const skills = profile.skills?.slice(0, 3) || [];

  let query = headline;

  // Append skills if available AND headline is short enough to benefit
  if (skills.length > 0 && headline) {
    const skillsList = skills.join(', ');
    const withSkills = `${headline} with ${skillsList} experience`;
    // Only append skills if it doesn't make the query too long
    if (withSkills.length <= MAX_QUERY_LENGTH) {
      query = withSkills;
    }
    // If too long, just use headline — it's the most important signal
  }

  // If no headline, try to build from skills alone
  if (!headline && skills.length > 0) {
    query = `Professional with ${skills.join(', ')} skills`;
  }

  // Fallback if we have nothing useful
  if (!query.trim()) {
    query = 'Similar professional';
  }

  // Final length cap
  if (query.length > MAX_QUERY_LENGTH) {
    query = query.substring(0, MAX_QUERY_LENGTH).trim();
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
