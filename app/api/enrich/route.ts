import { NextRequest, NextResponse } from 'next/server';
import { createPearchClient, EnrichParams, calculateEnrichCost } from '@/lib/pearch';

export const dynamic = 'force-dynamic';

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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    const params: EnrichParams = {
      id,
      high_freshness: searchParams.get('high_freshness') === 'true',
      reveal_emails: searchParams.get('reveal_emails') === 'true',
      reveal_phones: searchParams.get('reveal_phones') === 'true',
      with_profile: searchParams.get('with_profile') === 'true',
    };

    const estimatedCost = calculateEnrichCost(params);

    const client = createPearchClient(apiKey);
    const result = await client.enrichProfile(params);

    return NextResponse.json({
      ...result,
      estimatedCost,
    });
  } catch (error) {
    console.error('Enrich error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enrich failed' },
      { status: 500 }
    );
  }
}
