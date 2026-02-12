import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const hasDatabase = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// Returns the last known credit balance from DB
// Does NOT call Pearch API — balance syncs automatically on search/enrich
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('merraine-auth');
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasDatabase) {
    return NextResponse.json({ credits_remaining: null });
  }

  try {
    const { getLastKnownBalance } = await import('@/lib/db/queries');
    const balance = await getLastKnownBalance();
    return NextResponse.json({ credits_remaining: balance });
  } catch {
    return NextResponse.json({ credits_remaining: null });
  }
}
