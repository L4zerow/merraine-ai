'use client';

import { useState } from 'react';
import { GlassCard, GlassButton, GlassInput } from '@/components/ui';
import { Profile, calculateSearchCost } from '@/lib/pearch';
import { logCreditUsage, canAfford } from '@/lib/credits';
import { useCreditUpdate } from '@/components/CreditTracker';

interface SearchOptions {
  type: 'fast' | 'pro';
  insights: boolean;
  profile_scoring: boolean;
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
    reveal_emails: false,
    reveal_phones: false,
    limit: 10,
  });
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  const triggerCreditUpdate = useCreditUpdate();

  const estimatedCost = calculateSearchCost({ query, ...options }, options.limit);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (!canAfford(estimatedCost)) {
      setError('Not enough credits. Reduce options or limit.');
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

      // Log credit usage
      const profileCount = newProfiles.length;
      let costPerProfile = options.type === 'pro' ? 5 : 1;
      if (options.insights) costPerProfile += 1;
      if (options.profile_scoring) costPerProfile += 1;
      if (options.reveal_emails) costPerProfile += 2;
      if (options.reveal_phones) costPerProfile += 14;
      const actualCost = profileCount * costPerProfile;
      logCreditUsage('Search', actualCost, `${profileCount} profiles`);
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
    <div className="space-y-8 animate-fade-in">
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
            placeholder="e.g., Senior React developer with 5+ years experience"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />

          {/* Options */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleOption('type')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                options.type === 'pro' ? 'bg-[#0A84FF] text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              {options.type === 'pro' ? 'Pro (5/profile)' : 'Fast (1/profile)'}
            </button>
            <button
              onClick={() => toggleOption('insights')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                options.insights ? 'bg-[#0A84FF] text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              Insights (+1)
            </button>
            <button
              onClick={() => toggleOption('profile_scoring')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                options.profile_scoring ? 'bg-[#0A84FF] text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              Scoring (+1)
            </button>
            <button
              onClick={() => toggleOption('reveal_emails')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                options.reveal_emails ? 'bg-[#0A84FF] text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              Emails (+2)
            </button>
            <button
              onClick={() => toggleOption('reveal_phones')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                options.reveal_phones ? 'bg-[#FF9500] text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              Phones (+14)
            </button>
            <select
              value={options.limit}
              onChange={(e) => setOptions(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 text-white border-none"
            >
              <option value="5">5 results</option>
              <option value="10">10 results</option>
              <option value="20">20 results</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-white/50">
              Estimated: <span className="text-white font-medium">{estimatedCost} credits</span>
            </div>
            <GlassButton
              variant="primary"
              onClick={handleSearch}
              loading={loading}
              disabled={!query.trim()}
            >
              Search
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
              <GlassButton onClick={handleSearch} loading={loading}>
                Load More
              </GlassButton>
            )}
          </div>

          <div className="grid gap-4">
            {results.map((profile, index) => (
              <GlassCard key={profile.id || index} hover>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {profile.name?.charAt(0) || '?'}
                  </div>
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
                      </div>
                    )}

                    <div className="flex gap-4 mt-3">
                      {profile.email && (
                        <a href={`mailto:${profile.email}`} className="text-[#0A84FF] text-sm hover:underline">
                          {profile.email}
                        </a>
                      )}
                      {profile.linkedin_url && (
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0A84FF] text-sm hover:underline">
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                  {profile.score !== undefined && (
                    <div className="text-right">
                      <div className="text-2xl font-bold gradient-text">
                        {Math.round(profile.score * 100)}%
                      </div>
                      <div className="text-xs text-white/50">Match</div>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <GlassCard className="text-center py-12">
          <div className="text-white/40 text-lg">Enter a search query to find candidates</div>
        </GlassCard>
      )}
    </div>
  );
}
