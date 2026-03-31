import { NextRequest, NextResponse } from 'next/server';
import { createPearchClient, SearchParams, calculateSearchCost, Profile, CustomFilters, PearchTimeoutError, PearchRateLimitError, PearchAuthError } from '@/lib/pearch';
import { rateLimit, getIdentifier, createRateLimitHeaders } from '@/lib/rateLimit';
import { saveBalance, getUserAllocation, adjustUserAllocation, logCreditTransaction } from '@/lib/db/queries';
import { requireUser, AuthError } from '@/lib/auth';

const apiKey = process.env.PEARCH_API_KEY;
const hasDatabase = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const PEARCH_MAX_LIMIT = 1000; // Pearch API confirmed max per request (Feb 13 call)

interface TransformedResult {
  profiles: Profile[];
  thread_id?: string;
  credits_used?: number;
  credits_remaining?: number;
  total_count?: number;
}

function transformSearchResults(apiResponse: Record<string, unknown>): TransformedResult {
  const searchResults = apiResponse.search_results as Array<{
    docid: string;
    profile: Record<string, unknown>;
    score?: number;
  }> || [];

  const profiles: Profile[] = searchResults.map((result) => {
    const p = result.profile || {};

    const firstName = p.first_name as string || '';
    const lastName = p.last_name as string || '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';

    const score = result.score ?? (p.score as number | undefined);

    return {
      id: (p.docid || p.linkedin_slug || result.docid) as string,
      name,
      headline: p.title as string || p.headline as string || '',
      location: p.location as string || '',
      summary: p.summary as string || '',
      skills: (p.skills as string[]) || [],
      email: p.email as string || (p.emails as string[])?.[0] || '',
      phone: p.phone as string || (p.phones as string[])?.[0] || '',
      linkedin_url: p.linkedin_slug
        ? `https://linkedin.com/in/${p.linkedin_slug}`
        : p.linkedin_url as string || '',
      score,
      insights: p.insights as string || '',
      experience: p.experience as Profile['experience'] || [],
      education: p.education as Profile['education'] || [],
      picture_url: p.picture_url as string || '',
    };
  });

  return {
    profiles,
    thread_id: apiResponse.thread_id as string,
    credits_used: apiResponse.credits_used as number | undefined,
    credits_remaining: apiResponse.credits_remaining as number | undefined,
    total_count: (apiResponse.total_estimate ?? apiResponse.total_count) as number | undefined,
  };
}


export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    // Rate limiting: 15 searches per minute
    const identifier = getIdentifier(request);
    const rateLimitResult = rateLimit(identifier, { limit: 15, windowMs: 60000 });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before searching again.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult, 15),
        }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const body: SearchParams = await request.json();

    if (!body.query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const requestedLimit = body.limit || 10;
    const estimatedCost = calculateSearchCost(body, requestedLimit);

    // Check user's credit allocation
    if (hasDatabase) {
      const allocation = await getUserAllocation(user.id);
      if (allocation < estimatedCost) {
        return NextResponse.json(
          { error: `Insufficient credits. You have ${allocation} allocated but need up to ${estimatedCost}. Ask an admin to allocate more.` },
          { status: 402 }
        );
      }
    }

    // Log search request for audit trail
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: '/api/search',
      userId: user.id,
      userEmail: user.email,
      query: body.query?.substring(0, 100),
      location: body.custom_filters?.locations?.[0] || 'none',
      searchType: body.type || 'fast',
      limit: requestedLimit,
      estimatedCost,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }));

    const client = createPearchClient(apiKey);

    // Cap limit at Pearch max (1,000) — single call, no batching needed
    body.limit = Math.min(requestedLimit, PEARCH_MAX_LIMIT);

    const result = await client.search(body);
    const transformed = transformSearchResults(result as Record<string, unknown>);

    // Log actual credits used + thread_id for Pearch quality debugging
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: '/api/search',
      userId: user.id,
      query: body.query?.substring(0, 100),
      thread_id: transformed.thread_id,
      creditsUsed: transformed.credits_used || estimatedCost,
      profilesReturned: transformed.profiles.length,
    }));

    // Persist Pearch balance to DB for dashboard sync
    if (hasDatabase && transformed.credits_remaining !== undefined) {
      saveBalance(transformed.credits_remaining).catch(() => {});
    }

    // Deduct from user's allocation based on actual cost
    const actualCost = transformed.credits_used ?? estimatedCost;
    if (hasDatabase) {
      await adjustUserAllocation(user.id, -actualCost);
      await logCreditTransaction({
        operation: 'search',
        credits: actualCost,
        details: `Search: "${body.query?.substring(0, 50)}" - ${transformed.profiles.length} profiles`,
        userId: user.id,
      });
    }

    return NextResponse.json({
      ...transformed,
      estimatedCost,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Search error:', error);

    if (error instanceof PearchTimeoutError) {
      return NextResponse.json({ error: error.message }, { status: 504 });
    }
    if (error instanceof PearchRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof PearchAuthError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed — please try again' },
      { status: 500 }
    );
  }
}
