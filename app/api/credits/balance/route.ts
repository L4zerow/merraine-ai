import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const apiKey = process.env.PEARCH_API_KEY;
const hasDatabase = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// Fetches LIVE credit balance from Pearch /v1/user endpoint
// Falls back to DB snapshot if Pearch is unreachable
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('merraine-auth');
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try live Pearch balance first (real-time, authoritative)
  if (apiKey) {
    try {
      const res = await fetch('https://api.pearch.ai/v1/user', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        // Don't cache — we want the real number
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        // Extract credits_remaining from the user response
        const balance = data.credits_remaining ?? data.credit_balance ?? data.remaining_credits ?? data.credits;
        if (balance != null) {
          // Also persist to DB so other parts of the app stay in sync
          if (hasDatabase) {
            try {
              const { saveBalance } = await import('@/lib/db/queries');
              await saveBalance(Number(balance));
            } catch {
              // DB save failed — not critical, we still have the live number
            }
          }
          return NextResponse.json({ credits_remaining: Number(balance), source: 'live' });
        }
      }
    } catch {
      // Pearch API unreachable — fall through to DB
    }
  }

  // Fallback: DB snapshot from last search/enrich
  if (hasDatabase) {
    try {
      const { getLastKnownBalance } = await import('@/lib/db/queries');
      const balance = await getLastKnownBalance();
      return NextResponse.json({ credits_remaining: balance, source: 'cached' });
    } catch {
      return NextResponse.json({ credits_remaining: null });
    }
  }

  return NextResponse.json({ credits_remaining: null });
}
