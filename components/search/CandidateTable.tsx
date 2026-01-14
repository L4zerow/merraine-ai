'use client';

import { useState, useMemo } from 'react';
import { Profile } from '@/lib/pearch';
import {
  groupByTier,
  sortProfiles,
  scoreToPercentage,
  getTierForScore,
  generateProfileKey,
  TIERS,
  TierGroups,
  TierName,
  SortColumn,
  SortDirection,
  SortConfig,
} from '@/lib/searchResultsUtils';

interface CandidateTableProps {
  profiles: Profile[];
  onSelectCandidate: (profile: Profile) => void;
  onSaveCandidate: (profile: Profile) => void;
  savedIds: Set<string>;
}

interface SortableHeaderProps {
  column: SortColumn;
  label: string;
  sortConfig: SortConfig;
  onSort: (column: SortColumn) => void;
  className?: string;
}

function SortableHeader({ column, label, sortConfig, onSort, className = '' }: SortableHeaderProps) {
  const isActive = sortConfig.column === column;

  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider cursor-pointer hover:text-white/70 transition-colors ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>
          {sortConfig.direction === 'asc' ? '↑' : '↓'}
        </span>
      </div>
    </th>
  );
}

interface TierSectionProps {
  tierName: TierName;
  profiles: Profile[];
  sortConfig: SortConfig;
  onSort: (column: SortColumn) => void;
  onSelectCandidate: (profile: Profile) => void;
  onSaveCandidate: (profile: Profile) => void;
  savedIds: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function TierSection({
  tierName,
  profiles,
  sortConfig,
  onSort,
  onSelectCandidate,
  onSaveCandidate,
  savedIds,
  isCollapsed,
  onToggleCollapse,
}: TierSectionProps) {
  const tier = TIERS.find(t => t.name === tierName)!;
  const sortedProfiles = useMemo(() => sortProfiles(profiles, sortConfig), [profiles, sortConfig]);

  if (profiles.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Tier Header */}
      <button
        onClick={onToggleCollapse}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-t-xl ${tier.bgColor} border border-white/10 border-b-0 hover:bg-white/10 transition-colors`}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: tier.color }}
        />
        <span className="text-white font-medium">{tier.label}</span>
        <span className="text-white/50 text-sm">({profiles.length})</span>
        <span className={`ml-auto text-white/50 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
          ▼
        </span>
      </button>

      {/* Table */}
      {!isCollapsed && (
        <div className="overflow-x-auto rounded-b-xl border border-white/10 border-t-0">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <SortableHeader column="name" label="Candidate" sortConfig={sortConfig} onSort={onSort} className="w-[35%]" />
                <SortableHeader column="score" label="Match" sortConfig={sortConfig} onSort={onSort} className="w-[12%]" />
                <SortableHeader column="location" label="Location" sortConfig={sortConfig} onSort={onSort} className="w-[18%]" />
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-[25%]">Skills</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedProfiles.map((profile) => (
                <CandidateRow
                  key={profile.id || generateProfileKey(profile)}
                  profile={profile}
                  onSelect={() => onSelectCandidate(profile)}
                  onSave={() => onSaveCandidate(profile)}
                  isSaved={profile.id ? savedIds.has(profile.id) : false}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface CandidateRowProps {
  profile: Profile;
  onSelect: () => void;
  onSave: () => void;
  isSaved: boolean;
}

function CandidateRow({ profile, onSelect, onSave, isSaved }: CandidateRowProps) {
  const scorePercent = scoreToPercentage(profile.score);
  const tier = getTierForScore(scorePercent);

  return (
    <tr
      onClick={onSelect}
      className="hover:bg-white/5 cursor-pointer transition-colors"
    >
      {/* Candidate Column */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {profile.picture_url ? (
            <img
              src={profile.picture_url}
              alt={profile.name || 'Profile'}
              loading="lazy"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                // Hide broken images
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {profile.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-white font-medium truncate">{profile.name || 'Unknown'}</div>
            <div className="text-white/50 text-sm truncate">{profile.headline || 'No headline'}</div>
          </div>
        </div>
      </td>

      {/* Score Column */}
      <td className="px-4 py-3">
        <div
          className="inline-flex items-center px-2 py-1 rounded-full text-sm font-bold"
          style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
        >
          {/* Show "Matched" when score is 100% (API always returns 4) or unavailable */}
          {scorePercent >= 100 || scorePercent < 0 ? 'Matched' : `${scorePercent}%`}
        </div>
      </td>

      {/* Location Column */}
      <td className="px-4 py-3">
        <div className="text-white/70 text-sm truncate">
          {profile.location || 'Unknown'}
        </div>
      </td>

      {/* Skills Column */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {profile.skills?.slice(0, 3).map((skill, i) => (
            <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/70">
              {skill}
            </span>
          ))}
          {(profile.skills?.length || 0) > 3 && (
            <span className="px-2 py-0.5 text-xs text-white/40">
              +{(profile.skills?.length || 0) - 3}
            </span>
          )}
        </div>
      </td>

      {/* Actions Column */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onSave}
          disabled={!profile.id || isSaved}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
            isSaved
              ? 'bg-[#30D158]/20 text-[#30D158] cursor-default'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isSaved ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              Saved
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save
            </>
          )}
        </button>
      </td>
    </tr>
  );
}

export default function CandidateTable({
  profiles,
  onSelectCandidate,
  onSaveCandidate,
  savedIds,
}: CandidateTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'score',
    direction: 'desc',
  });
  const [collapsedTiers, setCollapsedTiers] = useState<Set<TierName>>(new Set());

  // Group profiles by tier
  const tierGroups = useMemo(() => groupByTier(profiles), [profiles]);

  const handleSort = (column: SortColumn) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const toggleTierCollapse = (tierName: TierName) => {
    setCollapsedTiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tierName)) {
        newSet.delete(tierName);
      } else {
        newSet.add(tierName);
      }
      return newSet;
    });
  };

  if (profiles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Tier Sections */}
      {(['excellent', 'good', 'fair', 'below'] as TierName[]).map(tierName => (
        <TierSection
          key={tierName}
          tierName={tierName}
          profiles={tierGroups[tierName]}
          sortConfig={sortConfig}
          onSort={handleSort}
          onSelectCandidate={onSelectCandidate}
          onSaveCandidate={onSaveCandidate}
          savedIds={savedIds}
          isCollapsed={collapsedTiers.has(tierName)}
          onToggleCollapse={() => toggleTierCollapse(tierName)}
        />
      ))}
    </div>
  );
}
