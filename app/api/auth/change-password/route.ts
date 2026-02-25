import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getSetting, setSetting } from '@/lib/db/queries';

const ENV_PASSWORD = process.env.AUTH_PASSWORD;

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('merraine-auth');
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters' },
        { status: 400 }
      );
    }

    // Verify current password against DB hash first, then env var fallback
    let storedHash: string | null = null;
    try {
      storedHash = await getSetting('password_hash');
    } catch {
      // DB unavailable — cannot change password without persistence
      return NextResponse.json(
        { error: 'Password change is unavailable (database not configured)' },
        { status: 503 }
      );
    }

    let currentValid = false;
    if (storedHash) {
      currentValid = await bcrypt.compare(currentPassword, storedHash);
    } else if (ENV_PASSWORD) {
      currentValid = currentPassword === ENV_PASSWORD;
    }

    if (!currentValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 403 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    try {
      await setSetting('password_hash', newHash);
    } catch (err) {
      console.error('Password change save error:', err);
      return NextResponse.json(
        { error: 'Failed to save new password' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
