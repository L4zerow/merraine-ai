'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Profile } from '@/lib/pearch';
import { GlassButton } from '@/components/ui';
import { scoreToPercentage, getTierForScore } from '@/lib/searchResultsUtils';

interface CandidateDetailModalProps {
  profile: Profile;
  searchQuery?: string;
  onClose: () => void;
  onSave?: (profile: Profile) => void;
  isSaved?: boolean;
}

export default function CandidateDetailModal({
  profile,
  searchQuery,
  onClose,
  onSave,
  isSaved = false,
}: CandidateDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Wait for client-side mount before rendering portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const hasInsights = profile.insights && profile.insights.trim().length > 0;
  const hasSummary = profile.summary && profile.summary.trim().length > 0;
  const hasExperience = profile.experience && profile.experience.length > 0;
  const hasEducation = profile.education && profile.education.length > 0;
  const hasSkills = profile.skills && profile.skills.length > 0;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={handleBackdropClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#1c1c1e] border border-white/10 shadow-2xl"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-start gap-4">
            {profile.picture_url ? (
              <img
                src={profile.picture_url}
                alt={profile.name || 'Profile'}
                className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl border-2 border-white/20">
                {profile.name?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">{profile.name || 'Unknown'}</h2>
              <p className="text-white/70 text-lg">{profile.headline || 'No headline'}</p>
              <p className="text-white/50 flex items-center gap-1 mt-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {profile.location || 'Location unknown'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-sm font-medium hover:bg-[#004182] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    View LinkedIn
                  </a>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {profile.email}
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {profile.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Why the Fit Section */}
          {(hasInsights || profile.score !== undefined) && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0A84FF]/20 to-[#5AC8FA]/10 border border-[#0A84FF]/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0A84FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Why the Fit
                </h3>
                {profile.score !== undefined && (() => {
                  const scorePercent = scoreToPercentage(profile.score);
                  const tier = getTierForScore(scorePercent);
                  const displayScore = scorePercent >= 100 || scorePercent < 0 ? 'Matched' : `${scorePercent}%`;
                  return (
                    <div className="text-right">
                      <div
                        className="text-3xl font-bold"
                        style={{ color: tier.color }}
                      >
                        {displayScore}
                      </div>
                      <div className="text-xs text-white/50">Match Status</div>
                    </div>
                  );
                })()}
              </div>
              {searchQuery && (
                <p className="text-white/50 text-sm mb-2">
                  For search: "{searchQuery}"
                </p>
              )}
              {hasInsights ? (
                <p className="text-white/80 leading-relaxed">{profile.insights}</p>
              ) : profile.score !== undefined ? (
                <p className="text-white/60 italic">
                  Enable "AI Insights" in search options to see detailed fit analysis.
                </p>
              ) : null}
            </div>
          )}

          {/* Summary */}
          {hasSummary && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                About
              </h3>
              <p className="text-white/70 leading-relaxed">{profile.summary}</p>
            </div>
          )}

          {/* Experience */}
          {hasExperience && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Experience
              </h3>
              <div className="space-y-4">
                {profile.experience!.map((exp, index) => (
                  <div key={index} className="relative pl-4 border-l-2 border-white/20">
                    <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-[#0A84FF]" />
                    <h4 className="font-medium text-white">{exp.title || 'Unknown Role'}</h4>
                    <p className="text-white/70">{exp.company || 'Unknown Company'}</p>
                    {exp.duration && (
                      <p className="text-white/50 text-sm">{exp.duration}</p>
                    )}
                    {exp.description && (
                      <p className="text-white/60 text-sm mt-1">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {hasEducation && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                Education
              </h3>
              <div className="space-y-3">
                {profile.education!.map((edu, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white/5">
                    <h4 className="font-medium text-white">{edu.school || 'Unknown School'}</h4>
                    <p className="text-white/70">
                      {[edu.degree, edu.field].filter(Boolean).join(' in ') || 'Degree unknown'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {hasSkills && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Skills ({profile.skills!.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills!.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No detailed info available - only show if truly nothing useful */}
          {!hasInsights && !hasSummary && !hasExperience && !hasEducation && !hasSkills && !profile.headline && (
            <div className="text-center py-8 text-white/50">
              <p>Limited profile information available.</p>
              <p className="text-sm mt-2">Try using "Pro Search" or enabling "AI Insights" for more details.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <GlassButton onClick={onClose}>
            Close
          </GlassButton>
          {onSave && (
            <button
              onClick={() => onSave(profile)}
              disabled={isSaved}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isSaved
                  ? 'bg-[#30D158]/20 text-[#30D158] cursor-default'
                  : 'bg-[#0A84FF] text-white hover:bg-[#0A84FF]/80'
              }`}
            >
              {isSaved ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                  Saved to Candidates
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save Candidate
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  // Don't render anything until mounted (prevents SSR issues)
  if (!mounted) return null;

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body);
}
