'use client';

import { Profile } from './pearch';

/**
 * Export functions for search results (Profile[])
 * Similar to savedCandidates.ts exports but without savedAt/notes fields
 */

export function exportSearchResultsToCSV(profiles: Profile[], searchQuery?: string): void {
  if (profiles.length === 0) return;

  const headers = ['Name', 'Headline', 'Location', 'LinkedIn URL', 'Email', 'Phone', 'Match Score'];
  const rows = profiles.map(p => [
    p.name || '',
    p.headline || '',
    p.location || '',
    p.linkedin_url || '',
    p.email || '',
    p.phone || '',
    p.score !== undefined ? `${Math.round((p.score / 4) * 100)}%` : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const filename = searchQuery
    ? `candidates-${slugify(searchQuery)}-${getDateString()}.csv`
    : `candidates-${getDateString()}.csv`;

  downloadFile(csvContent, 'text/csv;charset=utf-8;', filename);
}

export function exportSearchResultsToMarkdown(profiles: Profile[], searchQuery?: string): void {
  if (profiles.length === 0) return;

  const lines = [
    `# Candidate Search Results`,
    searchQuery ? `**Search:** ${searchQuery}` : '',
    `*Exported from Merraine AI on ${new Date().toLocaleDateString()}*`,
    '',
    `**${profiles.length} candidates found**`,
    '',
    `---`,
    '',
  ];

  profiles.forEach((p, i) => {
    const scorePercent = p.score !== undefined ? Math.round((p.score / 4) * 100) : null;

    lines.push(`## ${i + 1}. ${p.name || 'Unknown'}`);
    lines.push('');
    if (p.headline) lines.push(`**${p.headline}**`);
    if (p.location) lines.push(`📍 ${p.location}`);
    if (scorePercent !== null) lines.push(`⭐ Match Score: ${scorePercent}%`);
    lines.push('');
    if (p.linkedin_url) lines.push(`- [LinkedIn Profile](${p.linkedin_url})`);
    if (p.email) lines.push(`- Email: ${p.email}`);
    if (p.phone) lines.push(`- Phone: ${p.phone}`);
    if (p.skills && p.skills.length > 0) {
      lines.push('');
      lines.push(`**Skills:** ${p.skills.slice(0, 10).join(', ')}${p.skills.length > 10 ? '...' : ''}`);
    }
    if (p.summary) {
      lines.push('');
      lines.push(`### Summary`);
      lines.push(p.summary);
    }
    if (p.insights) {
      lines.push('');
      lines.push(`### AI Insights`);
      lines.push(p.insights);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  const filename = searchQuery
    ? `candidates-${slugify(searchQuery)}-${getDateString()}.md`
    : `candidates-${getDateString()}.md`;

  downloadFile(lines.join('\n'), 'text/markdown;charset=utf-8;', filename);
}

export function exportSearchResultsToJSON(profiles: Profile[], searchQuery?: string): void {
  if (profiles.length === 0) return;

  const data = {
    exportedAt: new Date().toISOString(),
    source: 'Merraine AI',
    searchQuery: searchQuery || null,
    count: profiles.length,
    candidates: profiles.map(p => ({
      name: p.name,
      headline: p.headline,
      location: p.location,
      linkedin_url: p.linkedin_url,
      email: p.email || null,
      phone: p.phone || null,
      summary: p.summary || null,
      skills: p.skills || [],
      score: p.score !== undefined ? Math.round((p.score / 4) * 100) : null,
      insights: p.insights || null,
    })),
  };

  const filename = searchQuery
    ? `candidates-${slugify(searchQuery)}-${getDateString()}.json`
    : `candidates-${getDateString()}.json`;

  downloadFile(JSON.stringify(data, null, 2), 'application/json;charset=utf-8;', filename);
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
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
