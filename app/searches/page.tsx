'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { Profile } from '@/lib/pearch';
import CandidateDetailModal from '@/components/CandidateDetailModal';
import CandidateTable from '@/components/search/CandidateTable';
import { saveCandidate, isCandidateSaved } from '@/lib/savedCandidates';

interface SavedSearch {
  id: number;
  name: string;
  query: string;
  location: string | null;
  totalResults: number;
  creditsUsed: number;
  createdAt: string;
}

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSearch, setSelectedSearch] = useState<SavedSearch | null>(null);
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadSearches();
  }, []);

  const loadSearches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/searches');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load searches');
      }
      const data = await response.json();
      setSearches(data.searches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load searches');
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async (search: SavedSearch) => {
    setSelectedSearch(search);
    setLoadingCandidates(true);
    setCandidates([]);
    try {
      const response = await fetch(`/api/searches/${search.id}`);
      if (!response.ok) throw new Error('Failed to load candidates');
      const data = await response.json();
      setCandidates(data.candidates || []);

      // Update saved IDs
      const newSavedIds = new Set<string>();
      (data.candidates || []).forEach((p: Profile) => {
        if (p.id && isCandidateSaved(p.id)) {
          newSavedIds.add(p.id);
        }
      });
      setSavedIds(newSavedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleRename = async (searchId: number) => {
    if (!renameValue.trim()) return;
    try {
      const response = await fetch(`/api/searches/${searchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (!response.ok) throw new Error('Failed to rename');
      setRenamingId(null);
      loadSearches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename search');
    }
  };

  const handleDelete = async (searchId: number) => {
    try {
      const response = await fetch(`/api/searches/${searchId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      if (selectedSearch?.id === searchId) {
        setSelectedSearch(null);
        setCandidates([]);
      }
      loadSearches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete search');
    }
  };

  const handleSaveCandidate = (profile: Profile) => {
    if (!profile.id) return;
    saveCandidate(profile);
    setSavedIds(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(profile.id!);
      return newSet;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Saved Searches</h1>
        <p className="text-white/60">
          Your saved search results. Click to view candidates.
        </p>
      </div>

      {error && (
        <GlassCard className="border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-3 text-red-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-300/70 hover:text-red-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </GlassCard>
      )}

      {loading ? (
        <GlassCard className="text-center py-12">
          <div className="text-white/40">Loading saved searches...</div>
        </GlassCard>
      ) : searches.length === 0 ? (
        <GlassCard className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <div className="text-white/40 text-lg">No saved searches yet</div>
          <p className="text-white/30 mt-2">
            Run a search and click "Save Search" to save it here.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {searches.map((search) => (
            <GlassCard
              key={search.id}
              className={`cursor-pointer transition-all hover:border-white/20 ${
                selectedSearch?.id === search.id ? 'border-[#0A84FF]/50 bg-[#0A84FF]/5' : ''
              }`}
              onClick={() => loadCandidates(search)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {renamingId === search.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0A84FF]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(search.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                      />
                      <button
                        onClick={() => handleRename(search.id)}
                        className="text-[#30D158] text-sm hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="text-white/50 text-sm hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-white font-medium truncate">{search.name}</h3>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                    <span>"{search.query}"</span>
                    {search.location && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {search.location}
                      </span>
                    )}
                    <span>{formatDate(search.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-white font-medium">{search.totalResults}</div>
                    <div className="text-xs text-white/40">candidates</div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setRenamingId(search.id);
                        setRenameValue(search.name);
                      }}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                      title="Rename"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(search.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Candidates from selected search */}
      {selectedSearch && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">
              {selectedSearch.name} ({candidates.length} candidates)
            </h2>
            <button
              onClick={() => {
                setSelectedSearch(null);
                setCandidates([]);
              }}
              className="text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              Close
            </button>
          </div>

          {loadingCandidates ? (
            <GlassCard className="text-center py-8">
              <div className="text-white/40">Loading candidates...</div>
            </GlassCard>
          ) : candidates.length > 0 ? (
            <CandidateTable
              profiles={candidates}
              onSelectCandidate={setSelectedProfile}
              onSaveCandidate={handleSaveCandidate}
              savedIds={savedIds}
            />
          ) : (
            <GlassCard className="text-center py-8">
              <div className="text-white/40">No candidates in this search.</div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedProfile && (
        <CandidateDetailModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSave={handleSaveCandidate}
          onProfileUpdate={(updatedProfile) => {
            setCandidates(prev => prev.map(p =>
              p.id === updatedProfile.id ? updatedProfile : p
            ));
            setSelectedProfile(updatedProfile);
          }}
          isSaved={selectedProfile.id ? savedIds.has(selectedProfile.id) : false}
        />
      )}
    </div>
  );
}
