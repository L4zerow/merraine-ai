import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPearchClient, EnrichParams, calculateEnrichCost } from '@/lib/pearch';
import { rateLimit, getIdentifier, createRateLimitHeaders } from '@/lib/rateLimit';
import { enrichCandidateInDb, logCreditTransaction, getCandidateByPearchId, saveBalance } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

const apiKey = process.env.PEARCH_API_KEY;
const hasDatabase = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);

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

    // Check if already enriched in DB (avoid paying twice)
    if (hasDatabase) {
      try {
        const existing = await getCandidateByPearchId(id);
        if (existing?.isEnriched) {
          const wantsEmails = searchParams.get('reveal_emails') === 'true';
          const wantsPhones = searchParams.get('reveal_phones') === 'true';
          const opts = (existing.enrichmentOptions || {}) as Record<string, boolean>;

          // If already enriched with what they want, return cached data
          if ((!wantsEmails || opts.reveal_emails) && (!wantsPhones || opts.reveal_phones)) {
            return NextResponse.json({
              email: existing.email,
              phone: existing.phone,
              estimatedCost: 0,
              cached: true,
            });
          }
        }
      } catch {
        // DB not available yet, continue with API call
      }
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

    // Save enrichment to DB if available
    if (hasDatabase) {
      try {
        const enrichData: { email?: string; phone?: string } = {};
        const resultAny = result as Record<string, unknown>;
        // Pearch enrich response nests data inside 'profile' object
        const profileData = (resultAny.profile || resultAny) as Record<string, unknown>;
        // Email: check best_business_email, business_emails[], email, emails[]
        enrichData.email =
          (profileData.best_business_email as string) ||
          (profileData.business_emails as string[])?.[0] ||
          (profileData.email as string) ||
          (resultAny.email as string) ||
          (resultAny.emails as string[])?.[0] ||
          undefined;
        // Phone: check phone_numbers[], phone, phones[]
        enrichData.phone =
          (profileData.phone_numbers as string[])?.[0] ||
          (profileData.phone as string) ||
          (resultAny.phone as string) ||
          (resultAny.phones as string[])?.[0] ||
          undefined;

        await enrichCandidateInDb(id, enrichData, {
          reveal_emails: params.reveal_emails ?? false,
          reveal_phones: params.reveal_phones ?? false,
          high_freshness: params.high_freshness ?? false,
        });

        await logCreditTransaction({
          operation: 'enrich',
          credits: estimatedCost,
          details: `Enriched profile ${id.substring(0, 20)}`,
        });
      } catch (dbError) {
        // DB save failed but enrichment succeeded — don't fail the request
        console.error('DB save after enrich failed:', dbError);
      }
    }

    // Extract email/phone from Pearch response for consistent frontend format
    const resultAnyFinal = result as Record<string, unknown>;
    const profileDataFinal = (resultAnyFinal.profile || resultAnyFinal) as Record<string, unknown>;
    const extractedEmail =
      (profileDataFinal.best_business_email as string) ||
      (profileDataFinal.business_emails as string[])?.[0] ||
      (profileDataFinal.email as string) ||
      '';
    const extractedPhone =
      (profileDataFinal.phone_numbers as string[])?.[0] ||
      (profileDataFinal.phone as string) ||
      '';

    // Persist balance to DB
    const resultAnyBalance = result as Record<string, unknown>;
    if (hasDatabase && resultAnyBalance.credits_remaining !== undefined) {
      saveBalance(resultAnyBalance.credits_remaining as number).catch(() => {});
    }

    return NextResponse.json({
      ...result,
      email: extractedEmail,
      phone: extractedPhone,
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
