'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GlassCard, GlassButton } from '@/components/ui';
import { getStoredCredits } from '@/lib/credits';
import { getSavedCount } from '@/lib/savedCandidates';

export default function Dashboard() {
  const [credits, setCredits] = useState({ used: 0, limit: 300 });
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setCredits(getStoredCredits());
    setSavedCount(getSavedCount());

    const handleUpdate = () => {
      setCredits(getStoredCredits());
      setSavedCount(getSavedCount());
    };

    window.addEventListener('creditUpdate', handleUpdate);
    window.addEventListener('savedCandidatesUpdate', handleUpdate);
    return () => {
      window.removeEventListener('creditUpdate', handleUpdate);
      window.removeEventListener('savedCandidatesUpdate', handleUpdate);
    };
  }, []);

  const features = [
    {
      title: 'Search Candidates',
      description: 'Find candidates with natural language queries',
      href: '/search',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Manage Jobs',
      description: 'Index and manage your job listings',
      href: '/jobs',
      icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Match Candidates',
      description: 'Match profiles against your jobs',
      href: '/matches',
      icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Saved Candidates',
      description: `${savedCount} candidates saved`,
      href: '/saved',
      icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
      color: 'from-orange-500 to-amber-500',
    },
  ];

  const remaining = credits.limit - credits.used;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <div className="text-2xl font-bold text-white">{remaining}</div>
          <div className="text-xs text-white/50">Credits Remaining</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-bold text-white">{credits.used}</div>
          <div className="text-xs text-white/50">Credits Used</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-bold text-white">{savedCount}</div>
          <div className="text-xs text-white/50">Saved Candidates</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-bold text-[#30D158]">{Math.round((remaining / credits.limit) * 100)}%</div>
          <div className="text-xs text-white/50">Budget Available</div>
        </GlassCard>
      </div>

      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">
          Welcome to <span className="gradient-text">Merraine AI</span>
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          AI-powered recruiting platform. Find the right candidates faster.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <GlassCard hover className="h-full">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">{feature.title}</h2>
              <p className="text-white/60">{feature.description}</p>
            </GlassCard>
          </Link>
        ))}
      </div>

      <GlassCard className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Quick Start</h3>
            <p className="text-white/60 mt-1">Search for candidates to get started</p>
          </div>
          <Link href="/search">
            <GlassButton variant="primary">
              Start Searching
            </GlassButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
