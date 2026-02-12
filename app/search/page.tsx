'use client';

import { useState, useEffect, useMemo } from 'react';
import { GlassCard, GlassButton, GlassInput } from '@/components/ui';
import { Profile, calculateSearchCost } from '@/lib/pearch';
import { buildSimilarSearchParams } from '@/lib/findSimilar';
import { logCreditUsage, canAfford, getRemainingCredits, updatePearchBalance } from '@/lib/credits';
import { useCreditUpdate } from '@/components/CreditTracker';
import { saveCandidate, isCandidateSaved, getSavedCount } from '@/lib/savedCandidates';
import CandidateDetailModal from '@/components/CandidateDetailModal';
import CandidateTable from '@/components/search/CandidateTable';
import { getTierCounts, groupByTier } from '@/lib/searchResultsUtils';
import {
  saveSearchCache,
  loadSearchCache,
  clearSearchCache,
  getSearchCacheAge,
} from '@/lib/searchCache';
import {
  exportSearchResultsToCSV,
  exportSearchResultsToMarkdown,
  exportSearchResultsToJSON,
} from '@/lib/exportSearchResults';

interface SearchOptions {
  type: 'fast' | 'pro';
  insights: boolean;
  profile_scoring: boolean;
  high_freshness: boolean;
  reveal_emails: boolean;
  reveal_phones: boolean;
  limit: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(''); // New: explicit location filter
  const [activeQuery, setActiveQuery] = useState(''); // Track query for current results
  const [activeLocation, setActiveLocation] = useState(''); // Track location for current results
  const [options, setOptions] = useState<SearchOptions>({
    type: 'fast',
    insights: false,
    profile_scoring: false,  // Disabled by default - Pearch API currently returns same score for all results
    high_freshness: false,
    reveal_emails: false,
    reveal_phones: false,
    limit: 10,
  });
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Track if "Load More" was clicked
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null); // null until Pearch balance known
  const [jobContext, setJobContext] = useState<{ jobId: string; jobTitle: string } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const triggerCreditUpdate = useCreditUpdate();

  // Load credits on client only (avoids hydration mismatch)
  useEffect(() => {
    setRemainingCredits(getRemainingCredits());
  }, []);

  // Check for job context from Jobs page "Find Candidates" button
  useEffect(() => {
    const jobSearchContext = sessionStorage.getItem('jobSearchContext');
    if (jobSearchContext) {
      try {
        const context = JSON.parse(jobSearchContext);
        setJobContext({ jobId: context.jobId, jobTitle: context.jobTitle });
        setQuery(context.query);
        // Clear the context so it doesn't persist on refresh
        sessionStorage.removeItem('jobSearchContext');
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  // Load cached search results on mount
  useEffect(() => {
    const cached = loadSearchCache();
    if (cached) {
      setQuery(cached.query);
      setActiveQuery(cached.query); // Track that these results belong to this query
      if (cached.location) {
        setLocation(cached.location);
        setActiveLocation(cached.location);
      }
      setOptions(cached.options);
      setResults(cached.results);
      setThreadId(cached.threadId);
      setCacheAge(getSearchCacheAge());
    }
  }, []);

  // Update saved status when results change
  useEffect(() => {
    const newSavedIds = new Set<string>();
    results.forEach(profile => {
      if (profile.id && isCandidateSaved(profile.id)) {
        newSavedIds.add(profile.id);
      }
    });
    setSavedIds(newSavedIds);
  }, [results]);

  // Handle "Find Similar" from candidate modal
  const handleFindSimilar = (profile: Profile) => {
    const params = buildSimilarSearchParams(profile);

    // Close the modal immediately
    setSelectedProfile(null);

    // Update form state so UI shows what was searched
    setQuery(params.query);
    setLocation(params.location);

    // Clear cache since this is a new search context
    clearSearchCache();

    // Run the search immediately with the params (bypasses async state)
    handleSearch(false, params);
  };

  // Clear results and cache
  const handleClearResults = () => {
    setResults([]);
    setThreadId(null);
    setCacheAge(null);
    clearSearchCache();
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

  // Save search to database
  const handleSaveSearch = async () => {
    if (!saveSearchName.trim() || results.length === 0) return;

    setSavingSearch(true);
    try {
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveSearchName.trim(),
          query: activeQuery,
          location: activeLocation || undefined,
          options,
          threadId,
          creditsUsed: 0, // Already tracked on search
          profiles: results,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save search');
      }

      setShowSaveModal(false);
      setSaveSuccess(`Saved "${saveSearchName.trim()}"`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save search');
    } finally {
      setSavingSearch(false);
    }
  };

  // Calculate cost per profile
  const getCostPerProfile = () => {
    let cost = options.type === 'pro' ? 5 : 1;
    if (options.insights) cost += 1;
    if (options.profile_scoring) cost += 1;
    if (options.high_freshness) cost += 2;
    if (options.reveal_emails) cost += 2;
    if (options.reveal_phones) cost += 14;
    return cost;
  };

  const costPerProfile = getCostPerProfile();
  const estimatedCost = costPerProfile * options.limit;
  // remainingCredits is now loaded via useEffect to avoid hydration mismatch

  const handleSearch = async (loadMore = false, overrideParams?: { query: string; location: string }) => {
    // Use override params if provided (for Find Similar), otherwise use state
    const searchQuery = overrideParams?.query ?? query;
    const searchLocation = overrideParams?.location ?? location;

    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (!canAfford(estimatedCost)) {
      const currentCredits = getRemainingCredits();
      setError(`Not enough credits. You need ${estimatedCost} but have ${currentCredits ?? 'unknown'}.`);
      return;
    }

    // Determine if this is a fresh search or loading more
    const isNewSearch = !loadMore || searchQuery !== activeQuery || searchLocation !== activeLocation;

    setLoading(true);
    if (loadMore) setIsLoadingMore(true);
    setError(null);

    // Clear previous results for fresh searches
    if (isNewSearch) {
      setResults([]);
      setThreadId(null);
    }

    try {
      // Build custom_filters for location
      const custom_filters: Record<string, string[]> = {};
      if (searchLocation.trim()) {
        custom_filters.locations = [searchLocation.trim()];
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          ...options,
          thread_id: isNewSearch ? undefined : threadId, // Only pass threadId for "Load More"
          custom_filters: Object.keys(custom_filters).length > 0 ? custom_filters : undefined,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Search failed — please try again');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      const newProfiles = data.profiles || [];
      // Only append for "Load More", replace for new searches
      const allResults = isNewSearch ? newProfiles : [...results, ...newProfiles];
      const newThreadId = data.thread_id || null;

      setResults(allResults);
      setThreadId(newThreadId);
      setActiveQuery(searchQuery); // Track what query these results are for
      setActiveLocation(searchLocation); // Track what location these results are for
      setCacheAge(0); // Fresh results

      // Save to cache for persistence
      saveSearchCache({
        query: searchQuery,
        location: searchLocation.trim() || undefined,
        results: allResults,
        threadId: newThreadId,
        options,
      });

      // Update Pearch balance from API response (source of truth)
      if (data.credits_remaining !== undefined) {
        updatePearchBalance(data.credits_remaining);
      }
      // Log estimated cost for history (Pearch credits_used is unreliable for fast search)
      const estimatedActualCost = newProfiles.length * costPerProfile;
      logCreditUsage('Search', estimatedActualCost, `${newProfiles.length} profiles`);
      triggerCreditUpdate();
      setRemainingCredits(getRemainingCredits()); // Update local state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const toggleOption = (key: keyof SearchOptions) => {
    if (key === 'type') {
      setOptions(prev => ({ ...prev, type: prev.type === 'fast' ? 'pro' : 'fast' }));
    } else if (key === 'limit') {
      return;
    } else {
      setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Search Candidates</h1>
        <p className="text-white/60">
          Use natural language to find the perfect candidates.
        </p>
      </div>

      {/* Job Context Banner - shows when searching for a specific job */}
      {jobContext && (
        <GlassCard className="bg-purple-500/10 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-white font-medium">Finding candidates for: {jobContext.jobTitle}</div>
                <div className="text-sm text-white/50">Job ID: {jobContext.jobId}</div>
              </div>
            </div>
            <button
              onClick={() => setJobContext(null)}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </GlassCard>
      )}

      {/* Search Bar */}
      <GlassCard>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-white/50 mb-2">Search Query</div>
            <GlassInput
              placeholder="e.g., Senior React developer with 5+ years experience"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
            />
          </div>

          {/* Location Filter - Uses Pearch API's custom_filters.locations */}
          <div>
            <div className="text-xs text-white/50 mb-2">Location Filter (optional)</div>
            <GlassInput
              placeholder="e.g., Ohio, USA or San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
            />
            <div className="text-xs text-white/30 mt-1">
              Enter a specific location to filter results. This is passed directly to the API for accurate filtering.
            </div>
          </div>

          {/* Search Type */}
          <div>
            <div className="text-xs text-white/50 mb-2">Search Type</div>
            <div className="flex gap-2">
              <button
                onClick={() => setOptions(prev => ({ ...prev, type: 'fast' }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${
                  options.type === 'fast'
                    ? 'bg-[#0A84FF] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                <div className="font-medium">Fast Search</div>
                <div className="text-xs opacity-70">1 credit/profile</div>
              </button>
              <button
                onClick={() => setOptions(prev => ({ ...prev, type: 'pro' }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${
                  options.type === 'pro'
                    ? 'bg-[#0A84FF] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                <div className="font-medium">Pro Search</div>
                <div className="text-xs opacity-70">5 credits/profile</div>
              </button>
            </div>
          </div>

          {/* Enhancements */}
          <div>
            <div className="text-xs text-white/50 mb-2">Enhancements (per profile)</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleOption('insights')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  options.insights ? 'bg-[#30D158] text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                AI Insights <span className="opacity-70">+1</span>
              </button>
              {/* Match Scoring removed - Pearch API returns same score for all results, no value for extra cost */}
              <button
                onClick={() => toggleOption('high_freshness')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  options.high_freshness ? 'bg-[#30D158] text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                Fresh Data <span className="opacity-70">+2</span>
              </button>
            </div>
          </div>

          {/* Contact Info — moved to per-candidate enrichment */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <svg className="w-4 h-4 text-[#0A84FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Email and phone are available per candidate after search — click any candidate to get contact info.</span>
            </div>
          </div>

          {/* Results Limit */}
          <div>
            <div className="text-xs text-white/50 mb-2">Results Limit</div>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 20, 50, 100, 200].map((num) => (
                <button
                  key={num}
                  onClick={() => setOptions(prev => ({ ...prev, limit: num }))}
                  className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                    options.limit === num
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70">Cost per profile:</span>
              <span className="text-white font-medium">{costPerProfile} credits</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70">Max profiles:</span>
              <span className="text-white font-medium">{options.limit}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-white font-medium">Estimated total:</span>
              <span className={`text-lg font-bold ${remainingCredits !== null && estimatedCost > remainingCredits ? 'text-red-400' : 'text-[#30D158]'}`}>
                {estimatedCost} credits
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-white/50">
              You have <span className="text-white">{remainingCredits ?? '...'}</span> credits remaining
            </div>
            <GlassButton
              variant="primary"
              onClick={() => handleSearch()}
              loading={loading}
              disabled={!query.trim() || (remainingCredits !== null && estimatedCost > remainingCredits)}
            >
              Search Candidates
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Error */}
      {error && (
        <GlassCard className="border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-3 text-red-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </GlassCard>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">
                Results ({results.length})
              </h2>
              {cacheAge !== null && cacheAge > 0 && (
                <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                  Cached {cacheAge < 60 ? `${cacheAge}m ago` : '< 1h ago'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Save Search Button */}
              <button
                onClick={() => {
                  setSaveSearchName(activeQuery);
                  setShowSaveModal(true);
                  setSaveSuccess(null);
                }}
                className="px-3 py-1.5 text-sm text-[#30D158] hover:text-white hover:bg-[#30D158]/20 rounded-lg transition-colors flex items-center gap-1.5 border border-[#30D158]/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Search
              </button>
              {saveSuccess && (
                <span className="text-xs text-[#30D158] animate-fade-in">{saveSuccess}</span>
              )}
              {/* Export Button */}
              <button
                onClick={() => setShowExportMenu(true)}
                className="px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
              <button
                onClick={handleClearResults}
                className="px-3 py-1.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors"
              >
                Clear
              </button>
              {threadId && (
                <GlassButton onClick={() => handleSearch(true)} loading={loading && isLoadingMore} size="sm">
                  Load More
                </GlassButton>
              )}
            </div>
          </div>

          {/* Dashboard Table View - Grouped by Match Score Tiers */}
          <CandidateTable
            profiles={results}
            onSelectCandidate={setSelectedProfile}
            onSaveCandidate={handleSaveCandidate}
            savedIds={savedIds}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <GlassCard className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="text-white/40 text-lg">Enter a search query to find candidates</div>
          <p className="text-white/30 mt-2">Try something like "React developer in New York"</p>
        </GlassCard>
      )}

      {/* Candidate Detail Modal */}
      {selectedProfile && (
        <CandidateDetailModal
          profile={selectedProfile}
          searchQuery={query}
          onClose={() => setSelectedProfile(null)}
          onSave={handleSaveCandidate}
          onFindSimilar={handleFindSimilar}
          onProfileUpdate={(updatedProfile) => {
            // Update the profile in results when enrichment happens
            setResults(prev => prev.map(p =>
              p.id === updatedProfile.id ? updatedProfile : p
            ));
            setSelectedProfile(updatedProfile);
          }}
          isSaved={selectedProfile.id ? savedIds.has(selectedProfile.id) : false}
        />
      )}

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowSaveModal(false)}
          />
          <div className="relative bg-[#1c1c1e] rounded-2xl p-6 w-96 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Save Search</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-white/50 text-sm mb-4">
              Save this search with {results.length} candidates so you can come back to it later.
            </p>
            <div className="mb-4">
              <div className="text-xs text-white/50 mb-2">Search Name</div>
              <input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="e.g., Pharmacy Directors - Ohio"
                className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-[#0A84FF] transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveSearchName.trim() && !savingSearch) {
                    handleSaveSearch();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/40">
                {results.length} candidates will be saved
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-white/70 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim() || savingSearch}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#30D158] text-white hover:bg-[#30D158]/80 transition-colors disabled:opacity-50"
                >
                  {savingSearch ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowExportMenu(false)}
          />
          <div className="relative bg-[#1c1c1e] rounded-2xl p-6 w-80 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Export {results.length} Candidates</h3>
              <button
                onClick={() => setShowExportMenu(false)}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-white/50 text-sm mb-4">Choose a format to export your search results:</p>
            <div className="space-y-2">
              <button
                onClick={() => { exportSearchResultsToCSV(results, activeQuery); setShowExportMenu(false); }}
                className="w-full px-4 py-3 text-left bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-[#30D158] font-medium">CSV</div>
                  <div className="text-white/50 text-sm">Excel, Google Sheets</div>
                </div>
                <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => { exportSearchResultsToMarkdown(results, activeQuery); setShowExportMenu(false); }}
                className="w-full px-4 py-3 text-left bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-[#0A84FF] font-medium">Markdown</div>
                  <div className="text-white/50 text-sm">Documentation, Notes</div>
                </div>
                <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => { exportSearchResultsToJSON(results, activeQuery); setShowExportMenu(false); }}
                className="w-full px-4 py-3 text-left bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-[#FF9500] font-medium">JSON</div>
                  <div className="text-white/50 text-sm">Data transfer, APIs</div>
                </div>
                <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
