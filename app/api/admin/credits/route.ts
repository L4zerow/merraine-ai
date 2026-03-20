import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth';
import {
  getAllAllocations,
  getTotalAllocated,
  getLastKnownBalance,
  setUserAllocation,
  getUserAllocation,
} from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

const apiKey = process.env.PEARCH_API_KEY;

// Fetch live master balance from API provider
async function getLiveMasterBalance(): Promise<number | null> {
  const cachedBalance = await getLastKnownBalance();
  if (!apiKey) return cachedBalance;

  try {
    const res = await fetch('https://api.pearch.ai/v1/user', {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const balance = data.credits_remaining ?? data.credit_balance ?? data.remaining_credits ?? data.credits;
      if (balance != null) return Number(balance);
    }
  } catch {
    // Fall through to cached
  }
  return cachedBalance;
}

// GET /api/admin/credits — view all allocations + pool status
export async function GET() {
  try {
    await requireAdmin();

    const [allocations, totalAllocated, masterBalance] = await Promise.all([
      getAllAllocations(),
      getTotalAllocated(),
      getLiveMasterBalance(),
    ]);

    return NextResponse.json({
      masterBalance,
      totalAllocated,
      unallocated: masterBalance != null ? masterBalance - totalAllocated : null,
      allocations,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to get credits' }, { status: 500 });
  }
}

// POST /api/admin/credits — allocate/transfer/reclaim credits
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const { action, userId, amount, fromUserId, toUserId } = await request.json();

    if (action === 'allocate') {
      if (!userId || amount === undefined) {
        return NextResponse.json({ error: 'userId and amount required' }, { status: 400 });
      }

      const [totalAllocated, masterBalance] = await Promise.all([
        getTotalAllocated(),
        getLastKnownBalance(),
      ]);

      const currentAllocation = await getUserAllocation(userId);
      const otherAllocated = totalAllocated - currentAllocation;
      const maxAvailable = masterBalance != null ? masterBalance - otherAllocated : Infinity;

      if (amount > maxAvailable) {
        return NextResponse.json(
          { error: `Cannot allocate ${amount}. Only ${maxAvailable} credits available.` },
          { status: 400 }
        );
      }

      if (amount < 0) {
        return NextResponse.json({ error: 'Amount must be non-negative' }, { status: 400 });
      }

      await setUserAllocation(userId, amount);
      return NextResponse.json({ success: true, allocated: amount });
    }

    if (action === 'transfer') {
      if (!fromUserId || !toUserId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'fromUserId, toUserId, and positive amount required' }, { status: 400 });
      }

      const fromAllocation = await getUserAllocation(fromUserId);
      if (fromAllocation < amount) {
        return NextResponse.json(
          { error: `Insufficient credits. User has ${fromAllocation}.` },
          { status: 400 }
        );
      }

      await setUserAllocation(fromUserId, fromAllocation - amount);
      const toAllocation = await getUserAllocation(toUserId);
      await setUserAllocation(toUserId, toAllocation + amount);

      return NextResponse.json({ success: true });
    }

    if (action === 'reclaim') {
      if (!userId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'userId and positive amount required' }, { status: 400 });
      }

      const currentAllocation = await getUserAllocation(userId);
      const reclaimAmount = Math.min(amount, currentAllocation);
      await setUserAllocation(userId, currentAllocation - reclaimAmount);

      return NextResponse.json({ success: true, reclaimed: reclaimAmount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Credit management error:', error);
    return NextResponse.json({ error: 'Failed to manage credits' }, { status: 500 });
  }
}
