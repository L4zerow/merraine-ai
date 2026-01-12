import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const VALID_USERNAME = 'test123';
const VALID_PASSWORD = 'mylesml';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set('merraine-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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
