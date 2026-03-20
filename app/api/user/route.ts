import { NextResponse } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';
import { getUserAllocation } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    const allocation = await getUserAllocation(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      allocation,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
