import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  real,
  jsonb,
  primaryKey,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ─── Users & Sessions ───────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // UUID string
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const creditAllocations = pgTable('credit_allocations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  allocatedCredits: integer('allocated_credits').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Saved searches — named search queries with their results
export const searches = pgTable('searches', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  query: text('query').notNull(),
  location: text('location'),
  options: jsonb('options').notNull(),
  threadId: text('thread_id'),
  totalResults: integer('total_results').default(0),
  creditsUsed: integer('credits_used').default(0),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Candidates — deduplicated by pearch_id across all searches
export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  pearchId: text('pearch_id').notNull().unique(),
  name: text('name'),
  headline: text('headline'),
  location: text('location'),
  summary: text('summary'),
  experience: jsonb('experience'),
  education: jsonb('education'),
  skills: text('skills').array(),
  email: text('email'),
  phone: text('phone'),
  linkedinUrl: text('linkedin_url'),
  pictureUrl: text('picture_url'),
  score: real('score'),
  insights: text('insights'),
  isEnriched: boolean('is_enriched').default(false),
  enrichedAt: timestamp('enriched_at'),
  enrichmentOptions: jsonb('enrichment_options'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Junction: which candidates belong to which search
export const searchCandidates = pgTable(
  'search_candidates',
  {
    searchId: integer('search_id')
      .notNull()
      .references(() => searches.id, { onDelete: 'cascade' }),
    candidateId: integer('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    score: real('score'),
    position: integer('position'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.searchId, table.candidateId] }),
  })
);

// Explicitly saved candidates with notes — per-user
export const savedCandidates = pgTable(
  'saved_candidates',
  {
    id: serial('id').primaryKey(),
    candidateId: integer('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    notes: text('notes').default(''),
    savedAt: timestamp('saved_at').defaultNow(),
  },
  (table) => ({
    uniqueSavedCandidatePerUser: uniqueIndex('unique_saved_candidate_per_user').on(table.candidateId, table.userId),
  })
);

// App settings — key-value store for runtime configuration (e.g. password override)
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Append-only credit ledger — server-side source of truth
export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  operation: text('operation').notNull(),
  credits: integer('credits').notNull(),
  details: text('details'),
  searchId: integer('search_id').references(() => searches.id, { onDelete: 'set null' }),
  candidateId: integer('candidate_id').references(() => candidates.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});
