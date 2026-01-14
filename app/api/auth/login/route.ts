import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Credentials from environment variables - NEVER hardcode
const VALID_USERNAME = process.env.AUTH_USERNAME;
const VALID_PASSWORD = process.env.AUTH_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    // Check if credentials are configured
    if (!VALID_USERNAME || !VALID_PASSWORD) {
      console.error('AUTH_USERNAME and AUTH_PASSWORD must be set in environment');
      return NextResponse.json(
        { error: 'Authentication not configured' },
        { status: 500 }
      );
    }

    const { username, password } = await request.json();

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set('merraine-auth', 'authenticated', {
        httpOnly: true,
        secure: true,  // Always require HTTPS
        sameSite: 'strict',  // Prevent CSRF
        maxAge: 60 * 60 * 24 * 7, // 1 week
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
