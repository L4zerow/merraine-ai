import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSearch, listSearches, addCandidatesToSearch, logCreditTransaction } from '@/lib/db/queries';
import { Profile } from '@/lib/pearch';

export const dynamic = 'force-dynamic';

function checkAuth() {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('merraine-auth');
  return authCookie?.value === 'authenticated';
}

// GET /api/searches — list all saved searches
export async function GET() {
  if (!checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await listSearches();
    return NextResponse.json({ searches: result });
  } catch (error) {
    console.error('List searches error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list searches' },
      { status: 500 }
    );
  }
}

// POST /api/searches — save a search with its results
export async function POST(request: NextRequest) {
  if (!checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    // Create the search record
    const search = await createSearch({
      name,
      query,
      location,
      options,
      threadId,
      creditsUsed,
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
      });
    }

    return NextResponse.json({ search });
  } catch (error) {
    console.error('Save search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save search' },
      { status: 500 }
    );
  }
}
