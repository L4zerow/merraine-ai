'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput } from '@/components/ui';
import { Profile, calculateSearchCost } from '@/lib/pearch';
import { logCreditUsage, canAfford, getRemainingCredits } from '@/lib/credits';
import { useCreditUpdate } from '@/components/CreditTracker';
import { saveCandidate, isCandidateSaved, getSavedCount } from '@/lib/savedCandidates';
import CandidateDetailModal from '@/components/CandidateDetailModal';

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
  const [options, setOptions] = useState<SearchOptions>({
    type: 'fast',
    insights: false,
    profile_scoring: false,
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

  const triggerCreditUpdate = useCreditUpdate();

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

  const handleSaveCandidate = (profile: Profile) => {
    if (!profile.id) return;
    saveCandidate(profile);
    setSavedIds(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(profile.id!);
      return newSet;
    });
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
  const remainingCredits = typeof window !== 'undefined' ? getRemainingCredits() : 300;

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (!canAfford(estimatedCost)) {
      setError(`Not enough credits. You need ${estimatedCost} but have ${remainingCredits}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          ...options,
          thread_id: threadId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      const newProfiles = data.profiles || [];
      const allResults = threadId ? [...results, ...newProfiles] : newProfiles;
      setResults(allResults);
      setThreadId(data.thread_id || null);

      // Log actual credit usage
      const actualCost = newProfiles.length * costPerProfile;
      logCreditUsage('Search', actualCost, `${newProfiles.length} profiles @ ${costPerProfile}/each`);
      triggerCreditUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
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

      {/* Search Bar */}
      <GlassCard>
        <div className="space-y-4">
          <GlassInput
            placeholder="e.g., Senior React developer with 5+ years experience in San Francisco"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />

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
              <button
                onClick={() => toggleOption('profile_scoring')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  options.profile_scoring ? 'bg-[#30D158] text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                Match Scoring <span className="opacity-70">+1</span>
              </button>
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

          {/* Contact Info */}
          <div>
            <div className="text-xs text-white/50 mb-2">Contact Information (per profile)</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleOption('reveal_emails')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  options.reveal_emails ? 'bg-[#0A84FF] text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                Reveal Emails <span className="opacity-70">+2</span>
              </button>
              <button
                onClick={() => toggleOption('reveal_phones')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  options.reveal_phones ? 'bg-[#FF9500] text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                Reveal Phones <span className="text-[#FF9500]/70">+14</span>
              </button>
            </div>
          </div>

          {/* Results Limit */}
          <div>
            <div className="text-xs text-white/50 mb-2">Results Limit</div>
            <div className="flex gap-2">
              {[5, 10, 20, 50].map((num) => (
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
              <span className={`text-lg font-bold ${estimatedCost > remainingCredits ? 'text-red-400' : 'text-[#30D158]'}`}>
                {estimatedCost} credits
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-white/50">
              You have <span className="text-white">{remainingCredits}</span> credits remaining
            </div>
            <GlassButton
              variant="primary"
              onClick={handleSearch}
              loading={loading}
              disabled={!query.trim() || estimatedCost > remainingCredits}
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
            <h2 className="text-2xl font-semibold text-white">
              Results ({results.length})
            </h2>
            {threadId && (
              <GlassButton onClick={handleSearch} loading={loading} size="sm">
                Load More
              </GlassButton>
            )}
          </div>

          <div className="grid gap-4">
            {results.map((profile, index) => (
              <GlassCard
                key={profile.id || index}
                hover
                onClick={() => setSelectedProfile(profile)}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {profile.picture_url ? (
                    <img
                      src={profile.picture_url}
                      alt={profile.name || 'Profile'}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {profile.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white">{profile.name || 'Unknown'}</h3>
                    <p className="text-white/70 text-sm">{profile.headline || 'No headline'}</p>
                    <p className="text-white/50 text-sm">{profile.location || 'Location unknown'}</p>

                    {profile.skills && profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {profile.skills.slice(0, 5).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/70">
                            {skill}
                          </span>
                        ))}
                        {profile.skills.length > 5 && (
                          <span className="px-2 py-0.5 text-xs text-white/50">
                            +{profile.skills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    {profile.insights && (
                      <p className="text-sm text-white/60 mt-2 italic">{profile.insights}</p>
                    )}

                    <div className="flex gap-4 mt-3" onClick={(e) => e.stopPropagation()}>
                      {profile.email && (
                        <a href={`mailto:${profile.email}`} className="text-[#0A84FF] text-sm hover:underline flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {profile.email}
                        </a>
                      )}
                      {profile.phone && (
                        <a href={`tel:${profile.phone}`} className="text-[#FF9500] text-sm hover:underline flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {profile.phone}
                        </a>
                      )}
                      {profile.linkedin_url && (
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0A84FF] text-sm hover:underline flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {profile.score !== undefined && (
                      <div className="text-right">
                        <div className="text-2xl font-bold gradient-text">
                          {Math.round(profile.score * 100)}%
                        </div>
                        <div className="text-xs text-white/50">Match</div>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveCandidate(profile);
                      }}
                      disabled={!profile.id || savedIds.has(profile.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        profile.id && savedIds.has(profile.id)
                          ? 'bg-[#30D158]/20 text-[#30D158] cursor-default'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {profile.id && savedIds.has(profile.id) ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                          Saved
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
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
          isSaved={selectedProfile.id ? savedIds.has(selectedProfile.id) : false}
        />
      )}
    </div>
  );
}
