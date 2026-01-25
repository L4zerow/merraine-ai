# Merraine AI - P0 Quick Fixes Implementation Guide

> **Completed:** 2026-01-22
> **Implemented By:** lazbot via THEALGORITHM
> **Time Taken:** ~90 minutes

---

## What Was Implemented

Three P0 quick fixes from the BUILD_LOG.md have been completed:

1. ✅ **Request Logging** - All API calls now logged to console
2. ✅ **Auth Checks** - API routes verify authentication before processing
3. ✅ **Rate Limiting** - In-memory rate limiter prevents abuse

---

## 1. Request Logging

### Files Changed
- `app/api/search/route.ts` - Added logging before and after Pearch API calls
- `app/api/enrich/route.ts` - Added logging for profile enrichment

### What It Does
Logs every API request to console with:
- Timestamp (ISO 8601)
- Endpoint path
- Query preview (first 100 chars)
- Search parameters (location, type, limit)
- Estimated cost
- Actual credits used
- IP address (from x-forwarded-for or x-real-ip headers)

### Log Format
```json
{
  "timestamp": "2026-01-22T18:45:23.123Z",
  "endpoint": "/api/search",
  "query": "Senior React developers in Austin",
  "location": "Austin, TX",
  "searchType": "fast",
  "limit": 10,
  "estimatedCost": 10,
  "ip": "192.168.1.1"
}
```

### Viewing Logs

**Development (local):**
```bash
npm run dev
# Logs appear in terminal
```

**Production (Vercel):**
```bash
vercel logs <deployment-url>
# Or view in Vercel dashboard
```

### Future Enhancement
Replace console.log with proper logging service:
- Vercel Logs (built-in, queryable)
- Datadog, LogRocket, or Sentry
- Database table (for long-term audit trail)

---

## 2. Auth Checks on API Routes

### Files Changed
- `app/api/search/route.ts` - Added auth verification
- `app/api/enrich/route.ts` - Added auth verification

### What It Does
Before processing any request:
1. Reads `merraine-auth` cookie
2. Checks if value equals `'authenticated'`
3. Returns 401 Unauthorized if missing or invalid
4. Only proceeds if authenticated

### Code Added
```typescript
import { cookies } from 'next/headers';

// At top of POST/GET handler
const cookieStore = cookies();
const authCookie = cookieStore.get('merraine-auth');
if (authCookie?.value !== 'authenticated') {
  return NextResponse.json(
    { error: 'Unauthorized - Please log in' },
    { status: 401 }
  );
}
```

### Why This Matters
- **Previously:** Middleware protected routes, but API routes were callable directly
- **Now:** Even if middleware is bypassed, API routes reject unauthorized requests
- **Defense in depth:** Multiple layers of auth checking

### Testing
```bash
# Should fail (no cookie)
curl http://localhost:3000/api/search -X POST -H "Content-Type: application/json" -d '{"query":"test"}'
# Expected: {"error":"Unauthorized - Please log in"}

# Should succeed (with valid session)
# Login via browser first, then use browser's dev tools to copy cookie
```

---

## 3. Rate Limiting

### Files Created
- `lib/rateLimit.ts` - In-memory rate limiter

### Files Changed
- `app/api/search/route.ts` - Rate limit: 15 requests/minute
- `app/api/enrich/route.ts` - Rate limit: 30 requests/minute

### What It Does
Tracks requests per IP address:
- `/api/search`: Max 15 requests per 60 seconds
- `/api/enrich`: Max 30 requests per 60 seconds
- Returns 429 Too Many Requests if limit exceeded
- Includes standard rate limit headers

### Response When Blocked
```json
{
  "error": "Too many requests. Please wait before searching again.",
  "retryAfter": 45
}
```

With headers:
```
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706131523000
```

### Implementation Details

**Storage:** In-memory Map (resets on server restart)
- Good enough for MVP
- For production: Use Upstash Redis or Vercel KV

**Identifier:** IP address from headers
- Checks `x-forwarded-for` (Vercel/proxy)
- Falls back to `x-real-ip`
- Falls back to `'unknown'` (all dev requests share limit)

**Sliding Window:** 60-second windows
- Count resets after 60 seconds
- Old entries cleaned up every 5 minutes

### Why These Limits?

**Search: 15/minute**
- Average search takes 2-4 seconds
- Legitimate user: ~10-12 searches/minute max
- Malicious script: Would hit 100+ searches/minute
- 15 is comfortable buffer for real usage

**Enrich: 30/minute**
- Profile enrichment is faster (~1 second)
- User might click multiple profiles quickly
- Higher limit for better UX

### Testing Rate Limit

```bash
# Run 20 searches in quick succession
for i in {1..20}; do
  curl http://localhost:3000/api/search \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Cookie: merraine-auth=authenticated" \
    -d "{\"query\":\"test $i\",\"type\":\"fast\",\"limit\":5}"
  echo "Request $i"
done

# Expected: First 15 succeed, remaining 5 get 429 error
```

### Adjusting Limits

Edit `lib/rateLimit.ts` or the route files:

```typescript
// More restrictive (good for production)
rateLimit(identifier, { limit: 10, windowMs: 60000 });

// More permissive (good for testing)
rateLimit(identifier, { limit: 30, windowMs: 60000 });

// Different window (5 minutes instead of 1 minute)
rateLimit(identifier, { limit: 50, windowMs: 300000 });
```

---

## What's NOT Implemented (Still TODO)

These require more work and are tracked in BUILD_LOG.md:

| Priority | Task | Why Not Done | Effort |
|----------|------|-------------|--------|
| **P0** | Server-side credit validation | Needs database | 15-20 hrs |
| **P1** | Audit logging to database | Needs database | 8-10 hrs |
| **P1** | Per-user auth | Needs database | 20-30 hrs |
| **P2** | JWT tokens | Needs user table | 8-10 hrs |
| **P2** | Saved candidates sync | Needs database | 10-15 hrs |

---

## Deployment

### No Additional Env Vars Needed
All changes work with existing `.env.local`:
```bash
PEARCH_API_KEY=pk_...
AUTH_USERNAME=...
AUTH_PASSWORD=...
```

### Testing Locally

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Start dev server
npm run dev

# 3. Login via browser
open http://localhost:3000/login

# 4. Test search (should work)
# 5. Try 20 searches quickly (should rate limit after 15)
```

### Deploying to Vercel

```bash
# If using Vercel CLI
vercel --prod

# Or push to main branch (auto-deploy)
git add .
git commit -m "Add P0 security fixes: auth checks, rate limiting, logging"
git push origin main
```

### Monitoring

**View logs in production:**
```bash
vercel logs --follow
```

**Watch for:**
- `"endpoint": "/api/search"` - Search requests
- `"endpoint": "/api/enrich"` - Profile enrichments
- `"error": "Too many requests"` - Rate limit triggers
- `"error": "Unauthorized"` - Auth failures

---

## Impact Assessment

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Credit manipulation** | Easy (DevTools) | Easy (DevTools) | ⚠️ Still vulnerable |
| **Rapid API abuse** | 1000+ req/sec possible | 15-30 req/min max | ✅ 40x reduction |
| **Auth bypass** | Middleware only | Middleware + API routes | ✅ Defense in depth |
| **Audit trail** | None | Console logs | ✅ Basic visibility |
| **Dispute resolution** | Impossible | Limited | ⚠️ Needs DB for full trail |

---

## Next Steps (Priority Order)

### Immediate (Before Sharing Externally)
1. **Test the three fixes** - Verify nothing broke
2. **Monitor logs for 24 hours** - Ensure rate limits are appropriate
3. **Document any issues** - Update this guide

### Short-term (Next 1-2 Weeks)
1. **Plan database architecture** - Postgres on Vercel? Supabase? PlanetScale?
2. **Implement server-side credit validation** - P0 blocker for external use
3. **Move logs to database** - Queryable audit trail

### Medium-term (Next Month)
1. **Per-user authentication** - User table + bcrypt passwords
2. **JWT tokens** - Replace static cookie
3. **Admin dashboard** - View usage, manage users

---

## Questions?

**Rate limits too strict?**
- Edit limits in `app/api/search/route.ts` and `app/api/enrich/route.ts`

**Logs too noisy?**
- Comment out console.log lines or add log level filtering

**Need to bypass rate limit for testing?**
- Temporarily increase limits or add IP whitelist in `lib/rateLimit.ts`

**Need distributed rate limiting?**
- Install `@upstash/ratelimit` and `@upstash/redis`
- See BUILD_LOG.md "Quick Fixes" section for code example

---

**Implementation Complete:** 2026-01-22
**Status:** Ready for testing
**Next:** Monitor logs, adjust rate limits if needed, plan database implementation
