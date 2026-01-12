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

  const headers = ['Name', 'Headline', 'Location', 'LinkedIn URL', 'Email', 'Notes', 'Saved At'];
  const rows = candidates.map(c => [
    c.name || '',
    c.headline || '',
    c.location || '',
    c.linkedin_url || '',
    c.email || '',
    c.notes || '',
    new Date(c.savedAt).toLocaleString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  downloadFile(csvContent, 'text/csv;charset=utf-8;', `merraine-candidates-${getDateString()}.csv`);
}

export function exportToMarkdown(candidates: SavedCandidate[]): void {
  if (candidates.length === 0) return;

  const lines = [
    `# Candidate List`,
    `*Exported from Merraine AI on ${new Date().toLocaleDateString()}*`,
    '',
    `---`,
    '',
  ];

  candidates.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.name || 'Unknown'}`);
    lines.push('');
    if (c.headline) lines.push(`**${c.headline}**`);
    if (c.location) lines.push(`📍 ${c.location}`);
    lines.push('');
    if (c.linkedin_url) lines.push(`- [LinkedIn Profile](${c.linkedin_url})`);
    if (c.email) lines.push(`- Email: ${c.email}`);
    if (c.phone) lines.push(`- Phone: ${c.phone}`);
    lines.push('');
    if (c.summary) {
      lines.push(`### Summary`);
      lines.push(c.summary);
      lines.push('');
    }
    if (c.notes) {
      lines.push(`### Notes`);
      lines.push(c.notes);
      lines.push('');
    }
    lines.push(`*Saved: ${new Date(c.savedAt).toLocaleDateString()}*`);
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  downloadFile(lines.join('\n'), 'text/markdown;charset=utf-8;', `merraine-candidates-${getDateString()}.md`);
}

export function exportToJSON(candidates: SavedCandidate[]): void {
  if (candidates.length === 0) return;

  const data = {
    exportedAt: new Date().toISOString(),
    source: 'Merraine AI',
    count: candidates.length,
    candidates: candidates.map(c => ({
      name: c.name,
      headline: c.headline,
      location: c.location,
      linkedin_url: c.linkedin_url,
      email: c.email,
      phone: c.phone,
      summary: c.summary,
      skills: c.skills,
      notes: c.notes,
      savedAt: c.savedAt,
    })),
  };

  downloadFile(JSON.stringify(data, null, 2), 'application/json;charset=utf-8;', `merraine-candidates-${getDateString()}.json`);
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function downloadFile(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
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
