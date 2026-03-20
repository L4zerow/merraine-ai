import { NextRequest, NextResponse } from 'next/server';
import { getSearchWithCandidates, renameSearch, deleteSearch } from '@/lib/db/queries';
import { requireUser, AuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/searches/[id] — get a saved search with all its candidates
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();

    const searchId = parseInt(params.id);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: 'Invalid search ID' }, { status: 400 });
    }

    const result = await getSearchWithCandidates(searchId);
    if (!result) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // Verify ownership (admins can see all)
    if (user.role !== 'admin' && result.userId !== user.id) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
  try {
    const user = await requireUser();

    const searchId = parseInt(params.id);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: 'Invalid search ID' }, { status: 400 });
    }

    // Check ownership
    const existing = await getSearchWithCandidates(searchId);
    if (!existing) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
  try {
    const user = await requireUser();

    const searchId = parseInt(params.id);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: 'Invalid search ID' }, { status: 400 });
    }

    // Check ownership
    const existing = await getSearchWithCandidates(searchId);
    if (!existing) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    await deleteSearch(searchId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Delete search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete search' },
      { status: 500 }
    );
  }
}
