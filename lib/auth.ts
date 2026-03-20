import { cookies } from 'next/headers';
import { db } from './db';
import { users, sessions } from './db/schema';
import { eq, and } from 'drizzle-orm';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

function generateSessionId(): string {
  // Crypto-safe UUID
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  return sessionId;
}

export async function getUserFromRequest(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('merraine-auth');
  if (!authCookie?.value || authCookie.value.length < 10) return null;

  const sessionId = authCookie.value;

  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, session.userId), eq(users.isActive, true)));

    return user || null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUserFromRequest();
  if (!user) {
    throw new AuthError('Unauthorized - Please log in', 401);
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new AuthError('Forbidden - Admin access required', 403);
  }
  return user;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
