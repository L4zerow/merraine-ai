import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPearchClient, EnrichParams, calculateEnrichCost } from '@/lib/pearch';
import { rateLimit, getIdentifier, createRateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const apiKey = process.env.PEARCH_API_KEY;

export async function GET(request: NextRequest) {
  // Verify authentication
  const cookieStore = cookies();
  const authCookie = cookieStore.get('merraine-auth');
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

  // Rate limiting: 30 enrichments per minute (higher than search since these are quick)
  const identifier = getIdentifier(request);
  const rateLimitResult = rateLimit(identifier, { limit: 30, windowMs: 60000 });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait before enriching profiles again.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult, 30),
      }
    );
  }

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

    // Log enrich request for audit trail
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: '/api/enrich',
      profileId: id?.substring(0, 20),
      highFreshness: params.high_freshness,
      revealEmails: params.reveal_emails,
      revealPhones: params.reveal_phones,
      estimatedCost,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }));

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
