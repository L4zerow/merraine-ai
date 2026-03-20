import { NextRequest, NextResponse } from 'next/server';
import { requireUser, AuthError } from '@/lib/auth';
import {
  getSavedCandidatesFromDb,
  saveCandidateToDb,
  updateSavedCandidateNotes,
  removeSavedCandidateById,
  upsertCandidate,
} from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

// GET /api/candidates/saved — list saved candidates for current user
export async function GET() {
  try {
    const user = await requireUser();
    const candidates = await getSavedCandidatesFromDb(user.id);
    return NextResponse.json({ candidates });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to get saved candidates' }, { status: 500 });
  }
}

// POST /api/candidates/saved — save a candidate
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { profile, notes } = await request.json();

    if (!profile?.id) {
      return NextResponse.json({ error: 'Profile with ID is required' }, { status: 400 });
    }

    // Ensure candidate exists in DB first
    await upsertCandidate(profile);

    const saved = await saveCandidateToDb(profile.id, notes || '', user.id);
    return NextResponse.json({ saved });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Save candidate error:', error);
    return NextResponse.json({ error: 'Failed to save candidate' }, { status: 500 });
  }
}

// PATCH /api/candidates/saved — update notes
export async function PATCH(request: NextRequest) {
  try {
    await requireUser();
    const { savedId, notes } = await request.json();

    if (!savedId) {
      return NextResponse.json({ error: 'savedId is required' }, { status: 400 });
    }

    const updated = await updateSavedCandidateNotes(savedId, notes || '');
    return NextResponse.json({ saved: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
  }
}

// DELETE /api/candidates/saved — remove a saved candidate
export async function DELETE(request: NextRequest) {
  try {
    await requireUser();
    const { savedId } = await request.json();

    if (!savedId) {
      return NextResponse.json({ error: 'savedId is required' }, { status: 400 });
    }

    await removeSavedCandidateById(savedId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to remove candidate' }, { status: 500 });
  }
}
