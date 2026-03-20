import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin, AuthError } from '@/lib/auth';
import { updateUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'User ID and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const updated = await updateUser(userId, { passwordHash: newHash });

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
