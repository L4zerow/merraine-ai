/**
 * Reset a user's password from the command line.
 * Use this when an admin is locked out and can't use the admin panel.
 *
 * Usage:
 *   npx tsx scripts/reset-password.ts <email> <new-password>
 *
 * Example:
 *   npx tsx scripts/reset-password.ts dina@lazerow.com NewPassword123
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

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>');
  process.exit(1);
}

if (newPassword.length < 4) {
  console.error('Password must be at least 4 characters');
  process.exit(1);
}

const sqlClient = neon(url);
const db = drizzle(sqlClient, { schema });

async function main() {
  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()));

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(schema.users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  console.log(`Password reset for ${user.name} (${user.email}, role: ${user.role})`);
  console.log('They can now log in with the new password.');
}

main().catch(console.error);
