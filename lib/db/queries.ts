import { db } from './index';
import { eq, desc, sql } from 'drizzle-orm';
import {
  searches,
  candidates,
  searchCandidates,
  savedCandidates,
  creditTransactions,
  appSettings,
} from './schema';
import { Profile } from '@/lib/pearch';

// ─── Searches ───────────────────────────────────────────────

export async function createSearch(data: {
  name: string;
  query: string;
  location?: string;
  options: Record<string, unknown>;
  threadId?: string;
  creditsUsed?: number;
}) {
  const [search] = await db
    .insert(searches)
    .values({
      name: data.name,
      query: data.query,
      location: data.location || null,
      options: data.options,
      threadId: data.threadId || null,
      creditsUsed: data.creditsUsed || 0,
      totalResults: 0,
    })
    .returning();
  return search;
}

export async function listSearches() {
  return db
    .select({
      id: searches.id,
      name: searches.name,
      query: searches.query,
      location: searches.location,
      totalResults: searches.totalResults,
      creditsUsed: searches.creditsUsed,
      createdAt: searches.createdAt,
    })
    .from(searches)
    .orderBy(desc(searches.createdAt));
}

export async function getSearchWithCandidates(searchId: number) {
  const [search] = await db
    .select()
    .from(searches)
    .where(eq(searches.id, searchId));

  if (!search) return null;

  const results = await db
    .select({
      candidate: candidates,
      score: searchCandidates.score,
      position: searchCandidates.position,
    })
    .from(searchCandidates)
    .innerJoin(candidates, eq(searchCandidates.candidateId, candidates.id))
    .where(eq(searchCandidates.searchId, searchId))
    .orderBy(searchCandidates.position);

  return {
    ...search,
    candidates: results.map((r) => ({
      ...candidateToProfile(r.candidate),
      score: r.score ?? undefined,
    })),
  };
}

export async function renameSearch(searchId: number, name: string) {
  const [updated] = await db
    .update(searches)
    .set({ name, updatedAt: new Date() })
    .where(eq(searches.id, searchId))
    .returning();
  return updated;
}

export async function deleteSearch(searchId: number) {
  await db.delete(searches).where(eq(searches.id, searchId));
}

// ─── Candidates ─────────────────────────────────────────────

function profileToCandidate(profile: Profile) {
  return {
    pearchId: profile.id || '',
    name: profile.name || null,
    headline: profile.headline || null,
    location: profile.location || null,
    summary: profile.summary || null,
    experience: (profile.experience as unknown) || null,
    education: (profile.education as unknown) || null,
    skills: profile.skills || null,
    email: profile.email || null,
    phone: profile.phone || null,
    linkedinUrl: profile.linkedin_url || null,
    pictureUrl: profile.picture_url || null,
    score: profile.score ?? null,
    insights: profile.insights || null,
  };
}

function candidateToProfile(c: typeof candidates.$inferSelect): Profile {
  return {
    id: c.pearchId,
    name: c.name || undefined,
    headline: c.headline || undefined,
    location: c.location || undefined,
    summary: c.summary || undefined,
    experience: (c.experience as Profile['experience']) || undefined,
    education: (c.education as Profile['education']) || undefined,
    skills: c.skills || undefined,
    email: c.email || undefined,
    phone: c.phone || undefined,
    linkedin_url: c.linkedinUrl || undefined,
    picture_url: c.pictureUrl || undefined,
    score: c.score ?? undefined,
    insights: c.insights || undefined,
  };
}

export async function upsertCandidate(profile: Profile): Promise<number> {
  if (!profile.id) throw new Error('Profile must have an id (pearch_id)');

  const data = profileToCandidate(profile);

  const [result] = await db
    .insert(candidates)
    .values(data)
    .onConflictDoUpdate({
      target: candidates.pearchId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning({ id: candidates.id });

  return result.id;
}

export async function addCandidatesToSearch(
  searchId: number,
  profiles: Profile[]
) {
  if (profiles.length === 0) return;

  // Upsert all candidates and collect their IDs
  const candidateIds: { id: number; score?: number }[] = [];
  for (const profile of profiles) {
    if (!profile.id) continue;
    const id = await upsertCandidate(profile);
    candidateIds.push({ id, score: profile.score });
  }

  // Get current max position for this search
  const [maxPos] = await db
    .select({ max: sql<number>`COALESCE(MAX(${searchCandidates.position}), 0)` })
    .from(searchCandidates)
    .where(eq(searchCandidates.searchId, searchId));

  let position = (maxPos?.max || 0) + 1;

  // Insert junction records (skip duplicates)
  for (const { id, score } of candidateIds) {
    await db
      .insert(searchCandidates)
      .values({
        searchId,
        candidateId: id,
        score: score ?? null,
        position: position++,
      })
      .onConflictDoNothing();
  }

  // Update total count
  const [count] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(searchCandidates)
    .where(eq(searchCandidates.searchId, searchId));

  await db
    .update(searches)
    .set({ totalResults: Number(count?.count || 0), updatedAt: new Date() })
    .where(eq(searches.id, searchId));
}

export async function enrichCandidateInDb(
  pearchId: string,
  enrichData: { email?: string; phone?: string },
  enrichmentOptions: Record<string, boolean>
) {
  const [updated] = await db
    .update(candidates)
    .set({
      email: enrichData.email || undefined,
      phone: enrichData.phone || undefined,
      isEnriched: true,
      enrichedAt: new Date(),
      enrichmentOptions,
      updatedAt: new Date(),
    })
    .where(eq(candidates.pearchId, pearchId))
    .returning();
  return updated;
}

export async function getCandidateByPearchId(pearchId: string) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.pearchId, pearchId));
  return candidate || null;
}

// ─── Saved Candidates ───────────────────────────────────────

export async function saveCandidateToDb(pearchId: string, notes: string = '') {
  // First ensure the candidate exists
  const candidate = await getCandidateByPearchId(pearchId);
  if (!candidate) return null;

  const [saved] = await db
    .insert(savedCandidates)
    .values({ candidateId: candidate.id, notes })
    .onConflictDoNothing()
    .returning();
  return saved;
}

export async function getSavedCandidatesFromDb() {
  const results = await db
    .select({
      saved: savedCandidates,
      candidate: candidates,
    })
    .from(savedCandidates)
    .innerJoin(candidates, eq(savedCandidates.candidateId, candidates.id))
    .orderBy(desc(savedCandidates.savedAt));

  return results.map((r) => ({
    ...candidateToProfile(r.candidate),
    savedAt: r.saved.savedAt?.toISOString() || new Date().toISOString(),
    notes: r.saved.notes || '',
    savedId: r.saved.id,
  }));
}

export async function updateSavedCandidateNotes(
  candidateId: number,
  notes: string
) {
  const [updated] = await db
    .update(savedCandidates)
    .set({ notes })
    .where(eq(savedCandidates.candidateId, candidateId))
    .returning();
  return updated;
}

export async function removeSavedCandidate(candidateId: number) {
  await db
    .delete(savedCandidates)
    .where(eq(savedCandidates.candidateId, candidateId));
}

// ─── Credit Transactions ────────────────────────────────────

export async function logCreditTransaction(data: {
  operation: string;
  credits: number;
  details?: string;
  searchId?: number;
  candidateId?: number;
}) {
  const [tx] = await db
    .insert(creditTransactions)
    .values({
      operation: data.operation,
      credits: data.credits,
      details: data.details || null,
      searchId: data.searchId || null,
      candidateId: data.candidateId || null,
    })
    .returning();
  return tx;
}

export async function getTotalCreditsUsed() {
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${creditTransactions.credits}), 0)` })
    .from(creditTransactions);
  return Number(result?.total || 0);
}

export async function getCreditHistory(limit: number = 50) {
  return db
    .select()
    .from(creditTransactions)
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

// Store latest balance — replaces previous to prevent unbounded row growth
export async function saveBalance(balance: number) {
  await db
    .delete(creditTransactions)
    .where(eq(creditTransactions.operation, 'balance_sync'));
  await db
    .insert(creditTransactions)
    .values({
      operation: 'balance_sync',
      credits: balance,
      details: `Pearch balance: ${balance}`,
    });
}

export async function getLastKnownBalance(): Promise<number | null> {
  const [result] = await db
    .select({ credits: creditTransactions.credits })
    .from(creditTransactions)
    .where(eq(creditTransactions.operation, 'balance_sync'))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(1);
  return result?.credits ?? null;
}

// ─── App Settings ────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const [result] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key));
  return result?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
