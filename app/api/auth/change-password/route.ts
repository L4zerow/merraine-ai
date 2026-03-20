import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireUser, AuthError } from '@/lib/auth';
import { getUserById, updateUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

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

    const fullUser = await getUserById(user.id);
    if (!fullUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentValid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!currentValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 403 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await updateUser(user.id, { passwordHash: newHash });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
