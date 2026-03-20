import { NextRequest, NextResponse } from 'next/server';
import { createSearch, listSearches, addCandidatesToSearch, logCreditTransaction } from '@/lib/db/queries';
import { requireUser, AuthError } from '@/lib/auth';
import { Profile } from '@/lib/pearch';

export const dynamic = 'force-dynamic';

// GET /api/searches — list saved searches for current user
export async function GET() {
  try {
    const user = await requireUser();
    // Users see their own searches; admins see all
    const result = user.role === 'admin'
      ? await listSearches()
      : await listSearches(user.id);
    return NextResponse.json({ searches: result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('List searches error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list searches' },
      { status: 500 }
    );
  }
}

// POST /api/searches — save a search with its results
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json();
    const { name, query, location, options, threadId, creditsUsed, profiles } = body as {
      name: string;
      query: string;
      location?: string;
      options: Record<string, unknown>;
      threadId?: string;
      creditsUsed?: number;
      profiles: Profile[];
    };

    if (!name || !query) {
      return NextResponse.json(
        { error: 'Name and query are required' },
        { status: 400 }
      );
    }

    // Create the search record with userId
    const search = await createSearch({
      name,
      query,
      location,
      options,
      threadId,
      creditsUsed,
      userId: user.id,
    });

    // Save all candidates and link to this search
    if (profiles && profiles.length > 0) {
      await addCandidatesToSearch(search.id, profiles);
    }

    // Log credit transaction
    if (creditsUsed && creditsUsed > 0) {
      await logCreditTransaction({
        operation: 'search_saved',
        credits: creditsUsed,
        details: `Saved search "${name}" with ${profiles?.length || 0} candidates`,
        searchId: search.id,
        userId: user.id,
      });
    }

    return NextResponse.json({ search });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Save search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save search' },
      { status: 500 }
    );
  }
}
