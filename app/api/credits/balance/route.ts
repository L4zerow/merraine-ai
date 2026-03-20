import { NextResponse } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';
import { getUserAllocation } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

const apiKey = process.env.PEARCH_API_KEY;
const hasDatabase = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// Returns user's credit allocation + master pool balance for admins
export async function GET() {
  try {
    const user = await requireUser();

    let masterBalance: number | null = null;

    // Try live balance from API provider
    if (apiKey) {
      try {
        const res = await fetch('https://api.pearch.ai/v1/user', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const balance = data.credits_remaining ?? data.credit_balance ?? data.remaining_credits ?? data.credits;
          if (balance != null) {
            masterBalance = Number(balance);
            if (hasDatabase) {
              try {
                const { saveBalance } = await import('@/lib/db/queries');
                await saveBalance(masterBalance);
              } catch {
                // Not critical
              }
            }
          }
        }
      } catch {
        // API unreachable — fall through to DB
      }
    }

    // Fallback: DB snapshot
    if (masterBalance === null && hasDatabase) {
      try {
        const { getLastKnownBalance } = await import('@/lib/db/queries');
        masterBalance = await getLastKnownBalance();
      } catch {
        // No balance available
      }
    }

    // Get user's allocation
    let userAllocation = 0;
    if (hasDatabase) {
      userAllocation = await getUserAllocation(user.id);
    }

    return NextResponse.json({
      credits_remaining: userAllocation,
      masterBalance,
      userAllocation,
      role: user.role,
      source: masterBalance !== null ? 'live' : 'cached',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ credits_remaining: null }, { status: 500 });
  }
}
