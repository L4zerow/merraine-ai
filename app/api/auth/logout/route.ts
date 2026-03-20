import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('merraine-auth');

  if (authCookie?.value && authCookie.value.length > 10) {
    try {
      await deleteSession(authCookie.value);
    } catch {
      // Session may already be gone
    }
  }

  cookieStore.delete('merraine-auth');
  return NextResponse.json({ success: true });
}
