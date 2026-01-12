import { NextRequest, NextResponse } from 'next/server';
import { createPearchClient } from '@/lib/pearch';

const apiKey = process.env.PEARCH_API_KEY;

export async function POST(request: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      );
    }

    const client = createPearchClient(apiKey);
    const result = await client.findMatchingJobs(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Match error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Matching failed' },
      { status: 500 }
    );
  }
}
