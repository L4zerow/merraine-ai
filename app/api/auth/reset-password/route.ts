import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { setSetting } from '@/lib/db/queries';

const ENV_PASSWORD = process.env.AUTH_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    const { masterPassword, newPassword } = await request.json();

    if (!masterPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Master password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters' },
        { status: 400 }
      );
    }

    // Verify against the original env var password (master reset key)
    if (!ENV_PASSWORD || masterPassword !== ENV_PASSWORD) {
      return NextResponse.json(
        { error: 'Master password is incorrect' },
        { status: 403 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    try {
      await setSetting('password_hash', newHash);
    } catch (err) {
      console.error('Password reset save error:', err);
      return NextResponse.json(
        { error: 'Failed to save new password' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
