import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPearchClient, SearchParams, calculateSearchCost, Profile, CustomFilters } from '@/lib/pearch';
import { rateLimit, getIdentifier, createRateLimitHeaders } from '@/lib/rateLimit';

const apiKey = process.env.PEARCH_API_KEY;

interface TransformedResult {
  profiles: Profile[];
  thread_id?: string;
  credits_used?: number;
  total_count?: number;  // For pagination
}

function transformSearchResults(apiResponse: Record<string, unknown>): TransformedResult {
  const searchResults = apiResponse.search_results as Array<{
    docid: string;
    profile: Record<string, unknown>;
    score?: number;  // Score is at result level, not profile level
  }> || [];

  const profiles: Profile[] = searchResults.map((result) => {
    const p = result.profile || {};

    const firstName = p.first_name as string || '';
    const lastName = p.last_name as string || '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';

    // Score is at the result level (search relevance), not inside profile
    // Check both locations for compatibility
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
    total_count: apiResponse.total_count as number | undefined,
  };
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const cookieStore = cookies();
  const authCookie = cookieStore.get('merraine-auth');
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    );
  }

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

  try {
    const body: SearchParams = await request.json();

    if (!body.query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const estimatedCost = calculateSearchCost(body, body.limit || 10);

    // Log search request for audit trail
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: '/api/search',
      query: body.query?.substring(0, 100),
      location: body.custom_filters?.locations?.[0] || 'none',
      searchType: body.type || 'fast',
      limit: body.limit || 10,
      estimatedCost,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }));

    const client = createPearchClient(apiKey);
    const result = await client.search(body);

    const transformed = transformSearchResults(result as Record<string, unknown>);

    // Log actual credits used
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: '/api/search',
      query: body.query?.substring(0, 100),
      creditsUsed: transformed.credits_used || estimatedCost,
      profilesReturned: transformed.profiles.length
    }));

    return NextResponse.json({
      ...transformed,
      estimatedCost,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
