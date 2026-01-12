'use client';

import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassTextarea } from '@/components/ui';
import { Job } from '@/lib/pearch';
import { logCreditUsage, canAfford } from '@/lib/credits';
import { useCreditUpdate } from '@/components/CreditTracker';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newJob, setNewJob] = useState({ job_id: '', job_description: '' });
  const [saving, setSaving] = useState(false);

  const triggerCreditUpdate = useCreditUpdate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      if (response.ok) {
        setJobs(data.jobs || []);
      } else {
        setError(data.error || 'Failed to fetch jobs');
      }
    } catch {
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddJob = async () => {
    if (!newJob.job_id.trim() || !newJob.job_description.trim()) {
      setError('Job ID and description are required');
      return;
    }

    if (!canAfford(1)) {
      setError('Not enough credits. Adding a job costs 1 credit.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([newJob]),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add job');
      }

      logCreditUsage('Add Job', 1, newJob.job_id);
      triggerCreditUpdate();
      setNewJob({ job_id: '', job_description: '' });
      setShowForm(false);
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add job');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([jobId]),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete job');
      }

      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Management</h1>
          <p className="text-white/60">
            Index your job listings for candidate matching.
          </p>
        </div>
        <GlassButton variant="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Job'}
        </GlassButton>
      </div>

      {/* Add Job Form */}
      {showForm && (
        <GlassCard>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Add New Job</h3>
            <GlassInput
              label="Job ID"
              placeholder="e.g., senior-react-dev-001"
              value={newJob.job_id}
              onChange={(e) => setNewJob(prev => ({ ...prev, job_id: e.target.value }))}
            />
            <GlassTextarea
              label="Job Description"
              placeholder="Enter the full job description..."
              value={newJob.job_description}
              onChange={(e) => setNewJob(prev => ({ ...prev, job_description: e.target.value }))}
              rows={6}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Cost: 1 credit</span>
              <GlassButton variant="primary" onClick={handleAddJob} loading={saving}>
                Save Job
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

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

      {/* Jobs List */}
      {loading ? (
        <GlassCard className="text-center py-12">
          <div className="text-white/50">Loading jobs...</div>
        </GlassCard>
      ) : jobs.length === 0 ? (
        <GlassCard className="text-center py-12">
          <div className="text-white/40 text-lg">No jobs indexed yet</div>
          <p className="text-white/30 mt-2">Add your first job to start matching candidates</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Indexed Jobs ({jobs.length})</h2>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <GlassCard key={job.job_id} hover>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white">{job.job_id}</h3>
                    <p className="text-white/70 text-sm mt-2 line-clamp-3">
                      {job.job_description}
                    </p>
                  </div>
                  <GlassButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteJob(job.job_id)}
                  >
                    Delete
                  </GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
