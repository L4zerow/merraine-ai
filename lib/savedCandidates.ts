'use client';

import { Profile } from './pearch';

export interface SavedCandidate extends Profile {
  savedAt: string;
  notes: string;
  savedId?: number;
}

// ─── API-backed saved candidates (replaces localStorage) ───

export async function getSavedCandidates(): Promise<SavedCandidate[]> {
  try {
    const res = await fetch('/api/candidates/saved');
    if (!res.ok) return [];
    const data = await res.json();
    return data.candidates || [];
  } catch {
    return [];
  }
}

export async function saveCandidate(profile: Profile): Promise<SavedCandidate | null> {
  try {
    const res = await fetch('/api/candidates/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) return null;
    window.dispatchEvent(new CustomEvent('savedCandidatesUpdate'));
    return { ...profile, savedAt: new Date().toISOString(), notes: '' };
  } catch {
    return null;
  }
}

export async function removeSavedCandidate(savedId: number): Promise<void> {
  try {
    await fetch('/api/candidates/saved', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedId }),
    });
    window.dispatchEvent(new CustomEvent('savedCandidatesUpdate'));
  } catch {
    // Ignore
  }
}

export async function updateCandidateNotes(savedId: number, notes: string): Promise<void> {
  try {
    await fetch('/api/candidates/saved', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedId, notes }),
    });
    window.dispatchEvent(new CustomEvent('savedCandidatesUpdate'));
  } catch {
    // Ignore
  }
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
    if (c.location) lines.push(`Location: ${c.location}`);
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
