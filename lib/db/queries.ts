import { db } from './index';
import { eq, desc, sql, and } from 'drizzle-orm';
import {
  users,
  sessions,
  creditAllocations,
  searches,
  candidates,
  searchCandidates,
  savedCandidates,
  creditTransactions,
  appSettings,
} from './schema';
import { Profile } from '@/lib/pearch';

// ─── Users ──────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return user || null;
}

export async function getUserById(id: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));
  return user || null;
}

export async function createUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  role?: string;
}) {
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role || 'user',
    })
    .returning();
  return user;
}

export async function updateUser(id: number, data: {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  passwordHash?: string;
}) {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated;
}

export async function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.id);
}

// ─── Sessions ───────────────────────────────────────────────

export async function getSessionById(id: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id));
  return session || null;
}

export async function createSessionRecord(id: string, userId: number, expiresAt: Date) {
  const [session] = await db
    .insert(sessions)
    .values({ id, userId, expiresAt })
    .returning();
  return session;
}

export async function deleteSessionRecord(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}

// ─── Credit Allocations ────────────────────────────────────

export async function getUserAllocation(userId: number): Promise<number> {
  const [alloc] = await db
    .select({ allocatedCredits: creditAllocations.allocatedCredits })
    .from(creditAllocations)
    .where(eq(creditAllocations.userId, userId));
  return alloc?.allocatedCredits ?? 0;
}

export async function setUserAllocation(userId: number, credits: number) {
  const [existing] = await db
    .select()
    .from(creditAllocations)
    .where(eq(creditAllocations.userId, userId));

  if (existing) {
    const [updated] = await db
      .update(creditAllocations)
      .set({ allocatedCredits: credits, updatedAt: new Date() })
      .where(eq(creditAllocations.userId, userId))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(creditAllocations)
      .values({ userId, allocatedCredits: credits })
      .returning();
    return created;
  }
}

export async function adjustUserAllocation(userId: number, delta: number) {
  const current = await getUserAllocation(userId);
  const newAmount = Math.max(0, current + delta);
  return setUserAllocation(userId, newAmount);
}

export async function getAllAllocations() {
  return db
    .select({
      userId: creditAllocations.userId,
      allocatedCredits: creditAllocations.allocatedCredits,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(creditAllocations)
    .innerJoin(users, eq(creditAllocations.userId, users.id))
    .orderBy(users.id);
}

export async function getTotalAllocated(): Promise<number> {
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${creditAllocations.allocatedCredits}), 0)` })
    .from(creditAllocations);
  return Number(result?.total || 0);
}

// ─── Searches ───────────────────────────────────────────────

export async function createSearch(data: {
  name: string;
  query: string;
  location?: string;
  options: Record<string, unknown>;
  threadId?: string;
  creditsUsed?: number;
  userId?: number;
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
      userId: data.userId || null,
    })
    .returning();
  return search;
}

export async function listSearches(userId?: number) {
  const query = db
    .select({
      id: searches.id,
      name: searches.name,
      query: searches.query,
      location: searches.location,
      totalResults: searches.totalResults,
      creditsUsed: searches.creditsUsed,
      userId: searches.userId,
      createdAt: searches.createdAt,
    })
    .from(searches);

  if (userId !== undefined) {
    return query
      .where(eq(searches.userId, userId))
      .orderBy(desc(searches.createdAt));
  }

  return query.orderBy(desc(searches.createdAt));
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

export async function saveCandidateToDb(pearchId: string, notes: string = '', userId?: number) {
  // First ensure the candidate exists
  const candidate = await getCandidateByPearchId(pearchId);
  if (!candidate) return null;

  const [saved] = await db
    .insert(savedCandidates)
    .values({ candidateId: candidate.id, notes, userId: userId || null })
    .onConflictDoNothing()
    .returning();
  return saved;
}

export async function getSavedCandidatesFromDb(userId?: number) {
  const baseQuery = db
    .select({
      saved: savedCandidates,
      candidate: candidates,
    })
    .from(savedCandidates)
    .innerJoin(candidates, eq(savedCandidates.candidateId, candidates.id));

  const results = userId !== undefined
    ? await baseQuery.where(eq(savedCandidates.userId, userId)).orderBy(desc(savedCandidates.savedAt))
    : await baseQuery.orderBy(desc(savedCandidates.savedAt));

  return results.map((r) => ({
    ...candidateToProfile(r.candidate),
    savedAt: r.saved.savedAt?.toISOString() || new Date().toISOString(),
    notes: r.saved.notes || '',
    savedId: r.saved.id,
  }));
}

export async function updateSavedCandidateNotes(
  savedId: number,
  notes: string
) {
  const [updated] = await db
    .update(savedCandidates)
    .set({ notes })
    .where(eq(savedCandidates.id, savedId))
    .returning();
  return updated;
}

export async function removeSavedCandidateById(savedId: number) {
  await db
    .delete(savedCandidates)
    .where(eq(savedCandidates.id, savedId));
}

export async function removeSavedCandidate(candidateId: number) {
  await db
    .delete(savedCandidates)
    .where(eq(savedCandidates.candidateId, candidateId));
}

export async function isCandidateSavedForUser(pearchId: string, userId: number): Promise<boolean> {
  const candidate = await getCandidateByPearchId(pearchId);
  if (!candidate) return false;

  const [saved] = await db
    .select({ id: savedCandidates.id })
    .from(savedCandidates)
    .where(and(
      eq(savedCandidates.candidateId, candidate.id),
      eq(savedCandidates.userId, userId)
    ));

  return !!saved;
}

// ─── Credit Transactions ────────────────────────────────────

export async function logCreditTransaction(data: {
  operation: string;
  credits: number;
  details?: string;
  searchId?: number;
  candidateId?: number;
  userId?: number;
}) {
  const [tx] = await db
    .insert(creditTransactions)
    .values({
      operation: data.operation,
      credits: data.credits,
      details: data.details || null,
      searchId: data.searchId || null,
      candidateId: data.candidateId || null,
      userId: data.userId || null,
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
      details: `Balance sync: ${balance}`,
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
