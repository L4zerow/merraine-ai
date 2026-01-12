'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassTextarea } from '@/components/ui';
import { MatchedJob } from '@/lib/pearch';
import { logCreditUsage, canAfford } from '@/lib/credits';
import { useCreditUpdate } from '@/components/CreditTracker';

export default function MatchesPage() {
  const [profileJson, setProfileJson] = useState('');
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobCount, setJobCount] = useState(0);

  const triggerCreditUpdate = useCreditUpdate();

  useEffect(() => {
    fetch('/api/jobs')
      .then((res) => res.json())
      .then((data) => {
        const jobs = data.jobs || [];
        setJobCount(jobs.length);
      })
      .catch(() => setJobCount(0));
  }, []);

  const handleMatch = async () => {
    if (!profileJson.trim()) {
      setError('Please enter a profile JSON');
      return;
    }

    let profile;
    try {
      profile = JSON.parse(profileJson);
    } catch {
      setError('Invalid JSON format');
      return;
    }

    if (!canAfford(jobCount)) {
      setError(`Not enough credits. Matching costs up to ${jobCount} credits.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Matching failed');
      }

      const matchedJobs = data.jobs || [];
      setMatches(matchedJobs);

      logCreditUsage('Job Matching', matchedJobs.length, `${matchedJobs.length} matches`);
      triggerCreditUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed');
    } finally {
      setLoading(false);
    }
  };

  const sampleProfile = JSON.stringify(
    {
      name: 'Jane Developer',
      headline: 'Senior Full Stack Engineer',
      location: 'San Francisco, CA',
      skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
      experience: [
        {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          duration: '3 years',
        },
      ],
    },
    null,
    2
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Job Matching</h1>
        <p className="text-white/60">
          Match a candidate profile against your indexed jobs.
        </p>
      </div>

      {/* Job Count Warning */}
      {jobCount === 0 && (
        <GlassCard className="border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-center gap-3 text-yellow-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>No jobs indexed yet. Add jobs first to use matching.</span>
            <a href="/jobs" className="ml-auto text-yellow-300 hover:text-yellow-200 underline">
              Go to Jobs
            </a>
          </div>
        </GlassCard>
      )}

      {/* Profile Input */}
      <GlassCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Candidate Profile</h2>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setProfileJson(sampleProfile)}
            >
              Load Sample
            </GlassButton>
          </div>

          <GlassTextarea
            placeholder="Paste candidate profile JSON here..."
            value={profileJson}
            onChange={(e) => setProfileJson(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />

          <div className="flex items-center justify-between">
            <div className="text-sm text-white/50">
              {jobCount > 0 ? (
                <>
                  <span className="text-white">{jobCount}</span> jobs indexed - Cost: up to{' '}
                  <span className="text-white">{jobCount}</span> credits
                </>
              ) : (
                'No jobs to match against'
              )}
            </div>
            <GlassButton
              variant="primary"
              onClick={handleMatch}
              loading={loading}
              disabled={!profileJson.trim() || jobCount === 0}
            >
              Find Matching Jobs
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
      {matches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Matching Jobs ({matches.length})
          </h2>

          <div className="grid gap-4">
            {matches.map((job) => (
              <GlassCard key={job.job_id} hover>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {job.job_id}
                      </h3>
                    </div>
                    <p className="text-sm text-white/70 line-clamp-3">
                      {job.job_description}
                    </p>
                    {job.relevance && (
                      <p className="text-sm text-white/60 mt-2 italic">
                        {job.relevance}
                      </p>
                    )}
                  </div>
                  {job.score !== undefined && (
                    <div className="text-right">
                      <div className="text-3xl font-bold gradient-text">
                        {Math.round(job.score * 100)}%
                      </div>
                      <div className="text-xs text-white/50">Match Score</div>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && matches.length === 0 && profileJson && !error && (
        <GlassCard className="text-center py-12">
          <div className="text-white/40 text-lg">No matches found</div>
          <p className="text-white/30 mt-2">
            Try a different profile or add more jobs
          </p>
        </GlassCard>
      )}
    </div>
  );
}
