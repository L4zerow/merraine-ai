'use client';

import { Profile } from './pearch';

export interface SavedCandidate extends Profile {
  savedAt: string;
  notes: string;
}

const STORAGE_KEY = 'merraine_saved_candidates';

export function getSavedCandidates(): SavedCandidate[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCandidate(profile: Profile): SavedCandidate {
  const candidates = getSavedCandidates();

  // Check if already saved
  const existing = candidates.find(c => c.id === profile.id);
  if (existing) return existing;

  const savedCandidate: SavedCandidate = {
    ...profile,
    savedAt: new Date().toISOString(),
    notes: '',
  };

  candidates.push(savedCandidate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));

  // Dispatch event for UI updates
  window.dispatchEvent(new CustomEvent('savedCandidatesUpdate'));

  return savedCandidate;
}

export function removeSavedCandidate(id: string): void {
  const candidates = getSavedCandidates();
  const filtered = candidates.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  window.dispatchEvent(new CustomEvent('savedCandidatesUpdate'));
}

export function updateCandidateNotes(id: string, notes: string): void {
  const candidates = getSavedCandidates();
  const candidate = candidates.find(c => c.id === id);

  if (candidate) {
    candidate.notes = notes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    window.dispatchEvent(new CustomEvent('savedCandidatesUpdate'));
  }
}

export function isCandidateSaved(id: string): boolean {
  const candidates = getSavedCandidates();
  return candidates.some(c => c.id === id);
}

export function getSavedCount(): number {
  return getSavedCandidates().length;
}

export function exportToCSV(candidates: SavedCandidate[]): void {
  if (candidates.length === 0) return;

  const headers = ['Name', 'Headline', 'Location', 'LinkedIn URL', 'Notes', 'Saved At'];
  const rows = candidates.map(c => [
    c.name || '',
    c.headline || '',
    c.location || '',
    c.linkedin_url || '',
    c.notes || '',
    new Date(c.savedAt).toLocaleString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `merraine-candidates-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Hook for components to listen to saved candidates changes
export function useSavedCandidatesUpdate() {
  return () => {
    window.dispatchEvent(new CustomEvent('savedCandidatesUpdate'));
  };
}
