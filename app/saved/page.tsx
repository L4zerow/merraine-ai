'use client';

import { useState, useEffect, useRef } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import {
  getSavedCandidates,
  removeSavedCandidate,
  updateCandidateNotes,
  exportToCSV,
  exportToMarkdown,
  exportToJSON,
  SavedCandidate,
} from '@/lib/savedCandidates';
import CandidateDetailModal from '@/components/CandidateDetailModal';

export default function SavedPage() {
  const [candidates, setCandidates] = useState<SavedCandidate[]>([]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<SavedCandidate | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCandidates();

    const handleUpdate = () => loadCandidates();
    window.addEventListener('savedCandidatesUpdate', handleUpdate);
    return () => window.removeEventListener('savedCandidatesUpdate', handleUpdate);
  }, []);

  const loadCandidates = () => {
    setCandidates(getSavedCandidates());
  };

  const handleRemove = (id: string) => {
    removeSavedCandidate(id);
    loadCandidates();
  };

  const handleStartEditNotes = (candidate: SavedCandidate) => {
    if (!candidate.id) return;
    setEditingNotes(candidate.id);
    setNoteText(candidate.notes || '');
  };

  const handleSaveNotes = (id: string) => {
    updateCandidateNotes(id, noteText);
    setEditingNotes(null);
    setNoteText('');
    loadCandidates();
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Saved Candidates</h1>
          <p className="text-white/60">
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        {candidates.length > 0 && (
          <div className="relative" ref={exportMenuRef}>
            <GlassButton variant="primary" onClick={() => setShowExportMenu(!showExportMenu)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </GlassButton>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 glass-card rounded-xl p-2 z-50">
                <button
                  onClick={() => { exportToCSV(candidates); setShowExportMenu(false); }}
                  className="w-full px-3 py-2 text-left text-white hover:bg-white/10 rounded-lg flex items-center gap-2"
                >
                  <span className="text-[#30D158]">CSV</span>
                  <span className="text-white/50 text-sm">- Spreadsheet</span>
                </button>
                <button
                  onClick={() => { exportToMarkdown(candidates); setShowExportMenu(false); }}
                  className="w-full px-3 py-2 text-left text-white hover:bg-white/10 rounded-lg flex items-center gap-2"
                >
                  <span className="text-[#0A84FF]">Markdown</span>
                  <span className="text-white/50 text-sm">- Documentation</span>
                </button>
                <button
                  onClick={() => { exportToJSON(candidates); setShowExportMenu(false); }}
                  className="w-full px-3 py-2 text-left text-white hover:bg-white/10 rounded-lg flex items-center gap-2"
                >
                  <span className="text-[#FF9500]">JSON</span>
                  <span className="text-white/50 text-sm">- Data transfer</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Banner - only show when there are candidates to export */}
      {candidates.length > 0 && (
        <GlassCard className="bg-amber-500/10 border-amber-500/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">Export your candidates before leaving</div>
              <div className="text-sm text-white/60 mt-1">
                Candidates are stored in your browser only. To keep your data safe or share with your team,
                export to <strong>CSV</strong> (Excel/Sheets), <strong>Markdown</strong> (docs), or <strong>JSON</strong> (integrations).
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Candidates List */}
      {candidates.length === 0 ? (
        <GlassCard className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <div className="text-white/40 text-lg">No saved candidates yet</div>
          <p className="text-white/30 mt-2">
            Search for candidates and click "Save" to add them here
          </p>
          <a
            href="/search"
            className="inline-block mt-4 px-4 py-2 bg-[#0A84FF] text-white rounded-lg hover:bg-[#0A84FF]/90 transition-colors"
          >
            Go to Search
          </a>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {candidates.map((candidate) => (
            <GlassCard
              key={candidate.id}
              hover
              onClick={() => setSelectedCandidate(candidate)}
              className="cursor-pointer"
            >
              <div className="flex items-start gap-4">
                {candidate.picture_url ? (
                  <img
                    src={candidate.picture_url}
                    alt={candidate.name || 'Profile'}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {candidate.name?.charAt(0) || '?'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white">{candidate.name || 'Unknown'}</h3>
                  <p className="text-white/70 text-sm">{candidate.headline || 'No headline'}</p>
                  <p className="text-white/50 text-sm">{candidate.location || 'Location unknown'}</p>

                  <div className="flex gap-4 mt-2 text-sm" onClick={(e) => e.stopPropagation()}>
                    {candidate.linkedin_url && (
                      <a
                        href={candidate.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0A84FF] hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    <span className="text-white/40">
                      Saved {new Date(candidate.savedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Notes Section */}
                  <div className="mt-3 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                    {editingNotes === candidate.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add notes about this candidate..."
                          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-[#0A84FF] resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => candidate.id && handleSaveNotes(candidate.id)}
                            className="px-3 py-1 bg-[#30D158] text-white text-sm rounded-lg hover:bg-[#30D158]/90"
                          >
                            Save Notes
                          </button>
                          <button
                            onClick={() => setEditingNotes(null)}
                            className="px-3 py-1 bg-white/10 text-white/70 text-sm rounded-lg hover:bg-white/20"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {candidate.notes ? (
                          <div className="flex items-start gap-2">
                            <p className="text-white/60 text-sm flex-1">{candidate.notes}</p>
                            <button
                              onClick={() => handleStartEditNotes(candidate)}
                              className="text-white/40 hover:text-white/70"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditNotes(candidate)}
                            className="text-white/40 text-sm hover:text-white/70 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add notes
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    candidate.id && handleRemove(candidate.id);
                  }}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateDetailModal
          profile={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          isSaved={true}
        />
      )}
    </div>
  );
}
