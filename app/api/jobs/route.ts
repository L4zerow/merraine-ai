import { NextRequest, NextResponse } from 'next/server';
import { createPearchClient, Job } from '@/lib/pearch';

const apiKey = process.env.PEARCH_API_KEY;

export async function GET(request: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');

    const client = createPearchClient(apiKey);
    const result = await client.listJobs(limit ? parseInt(limit) : undefined);

    return NextResponse.json(result);
  } catch (error) {
    console.error('List jobs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body: Job[] = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: 'Jobs array is required' },
        { status: 400 }
      );
    }

    for (const job of body) {
      if (!job.job_id || !job.job_description) {
        return NextResponse.json(
          { error: 'Each job must have job_id and job_description' },
          { status: 400 }
        );
      }
    }

    const client = createPearchClient(apiKey);
    const result = await client.upsertJobs(body);

    return NextResponse.json({
      ...result as object,
      creditsUsed: body.length,
    });
  } catch (error) {
    console.error('Upsert jobs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upsert jobs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body: string[] = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: 'Job IDs array is required' },
        { status: 400 }
      );
    }

    const client = createPearchClient(apiKey);
    const result = await client.deleteJobs(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Delete jobs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete jobs' },
      { status: 500 }
    );
  }
}
