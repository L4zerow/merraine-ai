'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui';

interface Section {
  id: string;
  title: string;
  icon: string;
}

const sections: Section[] = [
  { id: 'getting-started', title: 'Getting Started', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { id: 'dashboard', title: 'Dashboard Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'search', title: 'Searching for Candidates', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'candidate-details', title: 'Viewing Candidate Details', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'saved', title: 'Saved Candidates', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
  { id: 'credits', title: 'Understanding Credits', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

function CollapsibleSection({
  id,
  title,
  icon,
  children,
  defaultOpen = false
}: {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div id={id} className="scroll-mt-24">
      <GlassCard className="overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 -m-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white text-left">{title}</h2>
          </div>
          <svg
            className={`w-5 h-5 text-white/60 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="mt-6">
            {children}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 my-4">
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-cyan-100 text-sm">{children}</div>
      </div>
    </div>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 my-4">
      <div className="flex gap-3">
        <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="text-orange-100 text-sm">{children}</div>
      </div>
    </div>
  );
}

function InfoTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {headers.map((header, i) => (
              <th key={i} className="text-left py-3 px-4 text-white/80 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {row.map((cell, j) => (
                <td key={j} className="py-3 px-4 text-white/60">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HelpPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to <span className="gradient-text">Merraine AI</span> Help
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Your complete guide to using the AI-powered recruiting platform.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Table of Contents - Desktop Sticky Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-28">
            <GlassCard>
              <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">Contents</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </GlassCard>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Getting Started */}
          <CollapsibleSection id="getting-started" title="Getting Started" icon={sections[0].icon} defaultOpen={true}>
            <div className="space-y-4 text-white/70">
              <p>
                <strong className="text-white">Merraine AI</strong> is an AI-powered recruiting platform that helps you find the right candidates faster.
              </p>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Platform Navigation</h3>
              <p>The platform has 4 main pages:</p>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Dashboard</p>
                  <p className="text-sm text-white/60">Your home base with stats and quick access</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Search</p>
                  <p className="text-sm text-white/60">Find candidates using AI-powered search</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Saved</p>
                  <p className="text-sm text-white/60">View and manage your saved candidates</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Help</p>
                  <p className="text-sm text-white/60">This guide and documentation</p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Dashboard Overview */}
          <CollapsibleSection id="dashboard" title="Dashboard Overview" icon={sections[1].icon}>
            <div className="space-y-4 text-white/70">
              <p>The Dashboard shows your activity overview and provides quick access to all features.</p>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Stats Bar</h3>
              <InfoTable
                headers={['Stat', 'What It Shows']}
                rows={[
                  ['Credits Remaining', 'Available search credits'],
                  ['Credits Used', 'Total credits spent'],
                  ['Saved Candidates', 'Number in your saved list'],
                  ['Budget Available', 'Percentage remaining'],
                ]}
              />

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Quick Actions</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Search Candidates</strong> - Start finding talent</li>
                <li><strong className="text-white">Saved Candidates</strong> - Access your saved list</li>
              </ul>
            </div>
          </CollapsibleSection>

          {/* Searching for Candidates */}
          <CollapsibleSection id="search" title="Searching for Candidates" icon={sections[2].icon}>
            <div className="space-y-4 text-white/70">
              <h3 className="text-lg font-semibold text-white mb-3">Writing Your Search Query</h3>
              <p>Use natural language to describe the candidate you are looking for:</p>

              <div className="bg-white/5 rounded-xl p-4 mt-4">
                <p className="text-sm text-white/80 font-medium mb-3">Example Queries:</p>
                <ul className="space-y-2 text-sm text-cyan-300">
                  <li>&quot;Senior React developer in San Francisco with 5+ years experience&quot;</li>
                  <li>&quot;Marketing manager with B2B SaaS background&quot;</li>
                  <li>&quot;Data scientist who knows Python and machine learning&quot;</li>
                  <li>&quot;HR Director with nonprofit experience in Chicago&quot;</li>
                </ul>
              </div>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Location Filter</h3>
              <p>Use the location filter to narrow results to a specific area:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                <li>Enter a city and state (e.g., &quot;Chicago, IL&quot;)</li>
                <li>Or just a state (e.g., &quot;California&quot;)</li>
                <li>Leave blank to search all locations</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Search Options</h3>
              <InfoTable
                headers={['Option', 'Description', 'Cost']}
                rows={[
                  ['Fast Search', 'Quick results with basic profiles', '1 credit/profile'],
                  ['Pro Search', 'Higher quality, more detailed profiles', '5 credits/profile'],
                ]}
              />

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Enhancements</h3>
              <InfoTable
                headers={['Enhancement', 'What You Get', 'Cost']}
                rows={[
                  ['AI Insights', 'Explanation of why candidates fit your search', '+1 credit'],
                  ['Fresh Data', 'Recently updated profile information', '+2 credits'],
                ]}
              />

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Contact Options</h3>
              <InfoTable
                headers={['Option', 'What You Get', 'Cost']}
                rows={[
                  ['Reveal Emails', 'Candidate email addresses', '+2 credits'],
                  ['Reveal Phones', 'Candidate phone numbers', '+14 credits'],
                ]}
              />

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using Results</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Save button</strong> - Add candidate to your saved list</li>
                <li><strong className="text-white">Click the card</strong> - View full candidate details</li>
                <li><strong className="text-white">Load More</strong> - Get additional results (uses more credits)</li>
                <li><strong className="text-white">Clear</strong> - Clear results and start fresh</li>
              </ul>

              <TipBox>
                Results are cached for up to 1 hour. If you navigate away and come back, your results will still be there.
              </TipBox>
            </div>
          </CollapsibleSection>

          {/* Viewing Candidate Details */}
          <CollapsibleSection id="candidate-details" title="Viewing Candidate Details" icon={sections[3].icon}>
            <div className="space-y-4 text-white/70">
              <p>Click on any candidate card to see their full profile in a detailed modal.</p>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Profile Sections</h3>
              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Header</p>
                  <p className="text-sm text-white/60">Photo, name, headline, location, and contact buttons</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Why the Fit</p>
                  <p className="text-sm text-white/60">AI insights explaining why this candidate matches your search</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">About</p>
                  <p className="text-sm text-white/60">Professional summary</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Experience</p>
                  <p className="text-sm text-white/60">Work history with titles, companies, and descriptions</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Education</p>
                  <p className="text-sm text-white/60">Schools, degrees, and fields of study</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Skills</p>
                  <p className="text-sm text-white/60">All skills as clickable tags</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Contact Buttons</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">LinkedIn</strong> - Opens their profile in a new tab</li>
                <li><strong className="text-white">Email</strong> - Opens your email client (if email was revealed)</li>
                <li><strong className="text-white">Phone</strong> - Starts a call (if phone was revealed)</li>
              </ul>

              <TipBox>
                Press Escape or click outside the modal to close it.
              </TipBox>
            </div>
          </CollapsibleSection>

          {/* Saved Candidates */}
          <CollapsibleSection id="saved" title="Saved Candidates" icon={sections[4].icon}>
            <div className="space-y-4 text-white/70">
              <h3 className="text-lg font-semibold text-white mb-3">How Saving Works</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Click &quot;Save&quot; on any candidate to add them to your list</li>
                <li>Button turns green with a checkmark when saved</li>
                <li>Access saved candidates from the Saved page</li>
                <li>Saving is free - it doesn&apos;t cost credits</li>
              </ul>

              <WarningBox>
                <strong>Important:</strong> Saved candidates are stored in your browser. Export your list regularly to keep a backup! Data is not synced across devices.
              </WarningBox>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Adding Notes</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Find the candidate in your saved list</li>
                <li>Click &quot;Add notes&quot; or the edit icon</li>
                <li>Type your notes</li>
                <li>Click &quot;Save Notes&quot;</li>
              </ol>

              <TipBox>
                Use notes to track interview feedback, contact status, and next steps.
              </TipBox>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Exporting</h3>
              <p>Click the Export dropdown to download your list:</p>

              <InfoTable
                headers={['Format', 'Best For']}
                rows={[
                  ['CSV', 'Excel, Google Sheets, databases'],
                  ['Markdown', 'Documents, Notion, Slack'],
                  ['JSON', 'Technical integrations, backups'],
                ]}
              />

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Removing Candidates</h3>
              <p>To remove a candidate from your saved list:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4 mt-2">
                <li>Click the trash icon on the candidate card</li>
                <li>Confirm the removal</li>
              </ol>
            </div>
          </CollapsibleSection>

          {/* Understanding Credits */}
          <CollapsibleSection id="credits" title="Understanding Credits" icon={sections[5].icon}>
            <div className="space-y-4 text-white/70">
              <p>Credits are the currency used for searching candidates. Different options cost different amounts.</p>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Credit Costs</h3>
              <InfoTable
                headers={['Action', 'Base Cost', 'Notes']}
                rows={[
                  ['Fast Search', '1 credit/profile', 'Basic profile data'],
                  ['Pro Search', '5 credits/profile', 'More detailed profiles'],
                  ['AI Insights', '+1 credit/profile', 'Adds explanation text'],
                  ['Fresh Data', '+2 credits/profile', 'Latest profile info'],
                  ['Reveal Emails', '+2 credits/profile', 'Shows email address'],
                  ['Reveal Phones', '+14 credits/profile', 'Shows phone number'],
                ]}
              />

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Example Calculations</h3>
              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Fast Search, 10 profiles</p>
                  <p className="text-sm text-white/60">1 x 10 = <span className="text-cyan-300">10 credits</span></p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Pro Search + AI Insights, 10 profiles</p>
                  <p className="text-sm text-white/60">(5 + 1) x 10 = <span className="text-cyan-300">60 credits</span></p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="font-semibold text-white mb-1">Pro Search + Email + Phone, 5 profiles</p>
                  <p className="text-sm text-white/60">(5 + 2 + 14) x 5 = <span className="text-cyan-300">105 credits</span></p>
                </div>
              </div>

              <TipBox>
                The cost estimate is shown before you search. You can adjust options to stay within budget.
              </TipBox>

              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Free Actions</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Saving candidates to your list</li>
                <li>Viewing saved candidates</li>
                <li>Adding notes to candidates</li>
                <li>Exporting your saved list</li>
                <li>Viewing this help guide</li>
              </ul>
            </div>
          </CollapsibleSection>

          {/* Back to Dashboard */}
          <div className="pt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
