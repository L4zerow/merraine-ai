/**
 * Seed script: adds Donald (dr@merraine.com) and Rebecca (rd@merraine.com)
 * with 1,000 credits each. Idempotent — safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/add-dr-rd-users.ts
 *   # or: npm run db:seed:dr-rd
 *
 * Requires DATABASE_URL or POSTGRES_URL env var.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
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
const INITIAL_CREDITS = 1000;

const USERS = [
  { email: 'dr@merraine.com', name: 'Donald', role: 'user' },
  { email: 'rd@merraine.com', name: 'Rebecca', role: 'user' },
];

async function main() {
  console.log('Adding Donald and Rebecca...\n');

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const userData of USERS) {
    let userId: number;

    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, userData.email));

    if (existing) {
      userId = existing.id;
      console.log(`  User ${userData.email} already exists (id: ${userId})`);
    } else {
      const [user] = await db
        .insert(schema.users)
        .values({
          email: userData.email,
          name: userData.name,
          passwordHash,
          role: userData.role,
        })
        .returning();
      userId = user.id;
      console.log(`  Created user: ${user.email} (id: ${user.id}, role: ${user.role})`);
    }

    const [existingAllocation] = await db
      .select()
      .from(schema.creditAllocations)
      .where(eq(schema.creditAllocations.userId, userId));

    if (!existingAllocation) {
      await db
        .insert(schema.creditAllocations)
        .values({ userId, allocatedCredits: INITIAL_CREDITS });
      console.log(`  Allocated ${INITIAL_CREDITS} credits to ${userData.email}`);
    } else if (existingAllocation.allocatedCredits === 0) {
      await db
        .update(schema.creditAllocations)
        .set({ allocatedCredits: INITIAL_CREDITS, updatedAt: new Date() })
        .where(eq(schema.creditAllocations.userId, userId));
      console.log(`  Set allocation for ${userData.email} to ${INITIAL_CREDITS} (was 0)`);
    } else if (existingAllocation.allocatedCredits === INITIAL_CREDITS) {
      console.log(`  Allocation for ${userData.email} already at ${INITIAL_CREDITS}, skipping`);
    } else {
      console.log(
        `  WARNING: ${userData.email} has existing allocation of ${existingAllocation.allocatedCredits}. Skipping to avoid overwriting. Adjust via admin UI if needed.`
      );
    }
  }

  console.log('\nDone.');
  console.log(`Both users can login with password: ${PASSWORD}`);
  console.log('Users should change their password in Settings after first login.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
