# Merraine AI - Stress Testing Guide

## Setup

```bash
cd /Users/laz/Desktop/WADL/Clients/Merraine/AI
npm run dev
# Server starts on http://localhost:3000
```

Keep the terminal open to watch logs in real-time.

---

## Test 1: Auth Check (Should FAIL without login)

**What we're testing:** API routes reject unauthenticated requests

### Test Command
```bash
curl http://localhost:3000/api/search \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"test","type":"fast","limit":5}'
```

### Expected Result
```json
{"error":"Unauthorized - Please log in"}
```

**Status Code:** 401

### What This Proves
The API route is checking auth. Even if someone bypasses the Next.js middleware, they can't call the API directly.

---

## Test 2: Rate Limiting (Should BLOCK after 15 requests)

**What we're testing:** Can't spam more than 15 searches per minute

### Test Script
Save this as `test-rate-limit.sh`:

```bash
#!/bin/bash
echo "Firing 20 search requests..."
echo "Expected: First 15 succeed, last 5 get 429 Too Many Requests"
echo ""

# Login first to get cookie
# (You'll need to do this manually in browser: http://localhost:3000/login)
# Then copy the cookie from browser dev tools

COOKIE="merraine-auth=authenticated"

for i in {1..20}; do
  echo -n "Request $i: "

  RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/search \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" \
    -d "{\"query\":\"test $i\",\"type\":\"fast\",\"limit\":5}")

  STATUS=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$STATUS" = "429" ]; then
    echo "❌ RATE LIMITED (expected after 15)"
    echo "   Response: $(echo $BODY | jq -r '.error')"
  elif [ "$STATUS" = "200" ]; then
    echo "✅ SUCCESS"
  else
    echo "⚠️  Status $STATUS"
  fi

  sleep 0.1  # Small delay to avoid overwhelming dev server
done

echo ""
echo "Test complete. Expected: 15 successes, 5 rate limits"
```

### Expected Output
```
Request 1: ✅ SUCCESS
Request 2: ✅ SUCCESS
...
Request 15: ✅ SUCCESS
Request 16: ❌ RATE LIMITED (expected after 15)
Request 17: ❌ RATE LIMITED (expected after 15)
Request 18: ❌ RATE LIMITED (expected after 15)
Request 19: ❌ RATE LIMITED (expected after 15)
Request 20: ❌ RATE LIMITED (expected after 15)
```

### Rate Limit Response
```json
{
  "error": "Too many requests. Please wait before searching again.",
  "retryAfter": 45
}
```

**Headers:**
```
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706131523000
```

### What This Proves
Even if someone writes a script to spam searches, they can only do 15 per minute. At 15 searches/min with 5 results each = 75 profiles/min max, vs unlimited before.

---

## Test 3: Logging (Should see in terminal)

**What we're testing:** Every request gets logged

### Test Command
```bash
# Login first via browser: http://localhost:3000/login
# Then make a search via the UI or curl:

curl http://localhost:3000/api/search \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: merraine-auth=authenticated" \
  -d '{"query":"Senior React developers in Austin","type":"fast","limit":10}'
```

### Expected in Terminal (where npm run dev is running)
```json
{
  "timestamp": "2026-01-22T19:15:23.456Z",
  "endpoint": "/api/search",
  "query": "Senior React developers in Austin",
  "location": "none",
  "searchType": "fast",
  "limit": 10,
  "estimatedCost": 10,
  "ip": "::1"
}
```

Then after API returns:
```json
{
  "timestamp": "2026-01-22T19:15:25.789Z",
  "endpoint": "/api/search",
  "query": "Senior React developers in Austin",
  "creditsUsed": 10,
  "profilesReturned": 10
}
```

### What This Proves
You now have an audit trail. If someone abuses the API, you can see:
- What they searched
- When they searched
- How many credits they used
- Their IP address

---

## Test 4: Multi-Tab Stress Test

**What we're testing:** Rate limiting works across tabs

### Steps
1. Open http://localhost:3000 in 3 different browser tabs
2. Login in all 3 tabs
3. Fire searches rapidly in all 3 tabs simultaneously
4. After ~15 searches total, you should see error in UI:

```
Error: Too many requests. Please wait before searching again.
```

### What This Proves
Rate limiting is per-IP, not per-tab. Can't bypass by opening multiple tabs.

---

## Test 5: Wait and Retry

**What we're testing:** Rate limit resets after 1 minute

### Steps
1. Trigger rate limit (make 15+ searches)
2. Wait 60 seconds
3. Try another search

### Expected
First search after 60 seconds should succeed. The window resets.

---

## Production Testing (After Deploy)

### View Logs on Vercel
```bash
vercel logs --follow

# Or specific deployment
vercel logs <deployment-url> --follow
```

### Simulate Attack
```bash
# From your local machine, hit production API
for i in {1..100}; do
  curl https://your-app.vercel.app/api/search \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Cookie: merraine-auth=authenticated" \
    -d "{\"query\":\"attack test $i\",\"type\":\"fast\",\"limit\":5}"
done
```

**Expected:** 15 succeed, 85 get rate limited, all logged to Vercel.

---

## Adjusting Rate Limits

If 15/min is too strict or too loose:

**Edit:** `app/api/search/route.ts`

```typescript
// Current: 15 requests per minute
const rateLimitResult = rateLimit(identifier, { limit: 15, windowMs: 60000 });

// More strict (10 per minute)
const rateLimitResult = rateLimit(identifier, { limit: 10, windowMs: 60000 });

// More permissive (30 per minute)
const rateLimitResult = rateLimit(identifier, { limit: 30, windowMs: 60000 });

// Different window (20 per 5 minutes)
const rateLimitResult = rateLimit(identifier, { limit: 20, windowMs: 300000 });
```

---

## What's NOT Protected Yet

These are still vulnerable (need database):

1. **Credit manipulation** - User can still reset credits via DevTools
2. **No persistent audit** - Logs clear on server restart
3. **No per-user limits** - Everyone shares the same 15/min pool (per IP)

See BUILD_LOG.md for remaining P0/P1 fixes.
