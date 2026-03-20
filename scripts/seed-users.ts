/**
 * Seed script: creates users, allocations, and migrates existing data to Dina.
 *
 * Usage:
 *   npx tsx scripts/seed-users.ts
 *
 * Requires DATABASE_URL or POSTGRES_URL env var.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, isNull, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from '../lib/db/schema';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL or POSTGRES_URL is required');
  process.exit(1);
}

const sqlClient = neon(url);
const db = drizzle(sqlClient, { schema });

const PASSWORD = 'LFG2026!';
const INITIAL_POOL = 41734;

const USERS = [
  { email: 'myles@lazerow.com', name: 'Myles', role: 'admin' },
  { email: 'dina@lazerow.com', name: 'Dina', role: 'admin' },
  { email: 'codi@merraine.com', name: 'Codi', role: 'user' },
  { email: 'jp@merraine.com', name: 'JP', role: 'user' },
];

async function main() {
  console.log('Seeding users...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const createdUsers: { id: number; email: string; name: string; role: string }[] = [];

  for (const userData of USERS) {
    // Check if user already exists
    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, userData.email));

    if (existing) {
      console.log(`  User ${userData.email} already exists (id: ${existing.id})`);
      createdUsers.push({ id: existing.id, email: existing.email, name: existing.name, role: existing.role });
      continue;
    }

    const [user] = await db
      .insert(schema.users)
      .values({
        email: userData.email,
        name: userData.name,
        passwordHash,
        role: userData.role,
      })
      .returning();

    console.log(`  Created user: ${user.email} (id: ${user.id}, role: ${user.role})`);
    createdUsers.push({ id: user.id, email: user.email, name: user.name, role: user.role });
  }

  console.log('\nSetting up credit allocations...');

  const dinaUser = createdUsers.find(u => u.email === 'dina@lazerow.com');

  for (const user of createdUsers) {
    const credits = user.email === 'dina@lazerow.com' ? INITIAL_POOL : 0;

    // Check if allocation exists
    const [existing] = await db
      .select()
      .from(schema.creditAllocations)
      .where(eq(schema.creditAllocations.userId, user.id));

    if (existing) {
      console.log(`  Allocation for ${user.email} already exists: ${existing.allocatedCredits}`);
      continue;
    }

    await db
      .insert(schema.creditAllocations)
      .values({ userId: user.id, allocatedCredits: credits });

    console.log(`  Allocated ${credits} credits to ${user.email}`);
  }

  // Migrate existing data to Dina
  if (dinaUser) {
    console.log('\nMigrating existing data to Dina...');

    // Update searches without userId
    const searchResult = await db
      .update(schema.searches)
      .set({ userId: dinaUser.id })
      .where(isNull(schema.searches.userId))
      .returning({ id: schema.searches.id });
    console.log(`  Assigned ${searchResult.length} searches to Dina`);

    // Update saved candidates without userId
    const savedResult = await db
      .update(schema.savedCandidates)
      .set({ userId: dinaUser.id })
      .where(isNull(schema.savedCandidates.userId))
      .returning({ id: schema.savedCandidates.id });
    console.log(`  Assigned ${savedResult.length} saved candidates to Dina`);

    // Update credit transactions without userId
    const txResult = await db
      .update(schema.creditTransactions)
      .set({ userId: dinaUser.id })
      .where(isNull(schema.creditTransactions.userId))
      .returning({ id: schema.creditTransactions.id });
    console.log(`  Assigned ${txResult.length} credit transactions to Dina`);
  }

  // Clean up old password_hash from app_settings
  try {
    await db
      .delete(schema.appSettings)
      .where(eq(schema.appSettings.key, 'password_hash'));
    console.log('\nRemoved password_hash from app_settings');
  } catch {
    console.log('\nNo password_hash in app_settings to remove');
  }

  console.log('\nDone! Users seeded successfully.');
  console.log('\nAll users can login with password: ' + PASSWORD);
  console.log('Users should change their password in Settings after first login.');
}

main().catch(console.error);
