import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getSetting } from '@/lib/db/queries';

const VALID_USERNAME = process.env.AUTH_USERNAME;
const ENV_PASSWORD = process.env.AUTH_PASSWORD;

async function verifyPassword(password: string): Promise<boolean> {
  try {
    const storedHash = await getSetting('password_hash');
    if (storedHash) {
      return bcrypt.compare(password, storedHash);
    }
  } catch {
    // DB not available — fall through to env var check
  }

  // Fallback: check env var (initial setup or DB unreachable)
  return ENV_PASSWORD ? password === ENV_PASSWORD : false;
}

export async function POST(request: NextRequest) {
  try {
    if (!VALID_USERNAME) {
      console.error('AUTH_USERNAME must be set in environment');
      return NextResponse.json(
        { error: 'Authentication not configured' },
        { status: 500 }
      );
    }

    const { username, password } = await request.json();

    const usernameMatch = username === VALID_USERNAME;
    const passwordMatch = usernameMatch ? await verifyPassword(password) : false;

    if (usernameMatch && passwordMatch) {
      const cookieStore = cookies();
      cookieStore.set('merraine-auth', 'authenticated', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
