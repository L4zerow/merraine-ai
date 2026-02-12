import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPearchClient, SearchParams, calculateSearchCost, Profile, CustomFilters } from '@/lib/pearch';
import { rateLimit, getIdentifier, createRateLimitHeaders } from '@/lib/rateLimit';
import { saveBalance } from '@/lib/db/queries';

const apiKey = process.env.PEARCH_API_KEY;
const hasDatabase = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const BATCH_SIZE = 50; // Pearch API max per request

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

// Auto-batch: for limits > 50, make multiple sequential Pearch API calls
// Uses thread_id + offset for pagination (thread_id alone replays same results)
async function batchSearch(
  client: ReturnType<typeof createPearchClient>,
  params: SearchParams,
  totalLimit: number
): Promise<TransformedResult> {
  const allProfiles: Profile[] = [];
  const seenIds = new Set<string>();
  let threadId = params.thread_id;
  let creditsRemaining: number | undefined;
  let totalCount: number | undefined;
  let offset = 0;

  while (allProfiles.length < totalLimit) {
    const batchLimit = Math.min(BATCH_SIZE, totalLimit - allProfiles.length);
    const batchParams: SearchParams = {
      ...params,
      limit: batchLimit,
      thread_id: threadId || undefined,
      offset: offset > 0 ? offset : undefined,
    };

    const result = await client.search(batchParams);
    const transformed = transformSearchResults(result as Record<string, unknown>);

    // Deduplicate profiles by ID
    const newProfiles = transformed.profiles.filter(p => {
      if (!p.id || seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });

    allProfiles.push(...newProfiles);
    threadId = transformed.thread_id;
    offset += transformed.profiles.length; // Advance offset by raw count
    if (transformed.credits_remaining !== undefined) {
      creditsRemaining = transformed.credits_remaining;
    }
    if (transformed.total_count !== undefined) {
      totalCount = transformed.total_count;
    }

    // Stop if Pearch returned fewer results than requested (pool exhausted)
    // or no thread_id for continuation
    if (transformed.profiles.length < batchLimit || !threadId) break;
  }

  return {
    profiles: allProfiles,
    thread_id: threadId,
    credits_remaining: creditsRemaining,
    total_count: totalCount,
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

    const requestedLimit = body.limit || 10;
    const estimatedCost = calculateSearchCost(body, requestedLimit);

    // Log search request for audit trail
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: '/api/search',
      query: body.query?.substring(0, 100),
      location: body.custom_filters?.locations?.[0] || 'none',
      searchType: body.type || 'fast',
      limit: requestedLimit,
      estimatedCost,
      batched: requestedLimit > BATCH_SIZE,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    }));

    const client = createPearchClient(apiKey);

    let transformed: TransformedResult;

    if (requestedLimit > BATCH_SIZE && !body.thread_id) {
      // Auto-batch for large requests (new searches only, not "Load More")
      transformed = await batchSearch(client, body, requestedLimit);
    } else {
      // Single request (small limit or Load More with thread_id)
      const result = await client.search(body);
      transformed = transformSearchResults(result as Record<string, unknown>);
    }

    // Log actual credits used
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      endpoint: '/api/search',
      query: body.query?.substring(0, 100),
      creditsUsed: transformed.credits_used || estimatedCost,
      profilesReturned: transformed.profiles.length,
      batched: requestedLimit > BATCH_SIZE,
    }));

    // Persist Pearch balance to DB for dashboard sync
    if (hasDatabase && transformed.credits_remaining !== undefined) {
      saveBalance(transformed.credits_remaining).catch(() => {});
    }

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
