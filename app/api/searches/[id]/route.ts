import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSearchWithCandidates, renameSearch, deleteSearch } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

function checkAuth() {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('merraine-auth');
  return authCookie?.value === 'authenticated';
}

// GET /api/searches/[id] — get a saved search with all its candidates
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchId = parseInt(params.id);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: 'Invalid search ID' }, { status: 400 });
    }

    const result = await getSearchWithCandidates(searchId);
    if (!result) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get search' },
      { status: 500 }
    );
  }
}

// PATCH /api/searches/[id] — rename a saved search
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchId = parseInt(params.id);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: 'Invalid search ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body as { name: string };

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const updated = await renameSearch(searchId, name);
    if (!updated) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    return NextResponse.json({ search: updated });
  } catch (error) {
    console.error('Rename search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rename search' },
      { status: 500 }
    );
  }
}

// DELETE /api/searches/[id] — delete a saved search
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchId = parseInt(params.id);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: 'Invalid search ID' }, { status: 400 });
    }

    await deleteSearch(searchId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete search' },
      { status: 500 }
    );
  }
}
