# Merraine AI - Build Log

> **Last Updated:** 2026-01-22
> **Status:** MVP (Internal Use Only)
> **Red Team Analysis:** Complete
> **P0 Quick Fixes:** ✅ Complete (auth checks, rate limiting, logging)

---

## Current Architecture Summary

| Component | Implementation | Status |
|-----------|---------------|--------|
| Framework | Next.js 14 (App Router) | Stable |
| Auth | Cookie-based (httpOnly, secure, sameSite) | MVP-ready |
| Data Persistence | localStorage only | MVP-ready |
| Credit Tracking | Client-side only | **Needs work** |
| Rate Limiting | None | **Critical gap** |
| Audit Logging | None | **Critical gap** |
| User Management | Single shared credential | MVP-only |

---

## Red Team Findings (2026-01-21)

### Critical Issues (P0)

#### 1. Client-Side Credit Manipulation
- **File:** `lib/credits.ts`
- **Problem:** Credits stored in localStorage can be reset via DevTools
- **Exploit:** `localStorage.setItem('merraine_credits', JSON.stringify({used: 0, limit: 5000, logs: []}))`
- **Impact:** Unlimited API usage, revenue loss
- **Fix Required:** Server-side credit ledger with validation before API calls

#### 2. No Rate Limiting
- **Files:** `app/api/search/route.ts`, `app/api/enrich/route.ts`
- **Problem:** Zero request throttling on any endpoint
- **Exploit:** Script loop can fire 1000+ requests/second
- **Impact:** Pearch budget drained in minutes, potential DoS
- **Fix Required:** Middleware-level rate limiting (recommend 10-20 req/min per session)

### Significant Issues (P1)

#### 3. No Audit Logging
- **Problem:** No server-side record of who searched what, when
- **Impact:** Cannot investigate abuse, resolve disputes, or prove compliance
- **Fix Required:** Log table with: timestamp, user_id, endpoint, params, credits_used

#### 4. Single Shared Credential
- **Files:** `app/api/auth/login/route.ts`, `middleware.ts`
- **Problem:** All users share one password via env vars
- **Impact:** No per-user accountability, no individual credit budgets
- **Fix Required:** User table with hashed passwords, per-user sessions

### Notable Issues (P2)

#### 5. localStorage Data Loss Risk
- **Files:** `lib/savedCandidates.ts`, `lib/searchCache.ts`, `lib/credits.ts`
- **Problem:** Browser clear = all data gone, no cross-device sync
- **Impact:** Recruiter loses saved candidates, search history
- **Fix Required:** Server-side backup with localStorage as cache layer

#### 6. Multi-Tab Race Condition
- **File:** `lib/credits.ts`
- **Problem:** Concurrent tabs can corrupt credit state (read-modify-write without locking)
- **Impact:** Credit counts become mathematically impossible
- **Fix Required:** SharedWorker or optimistic locking with timestamps

#### 7. Static Cookie Value
- **File:** `app/api/auth/login/route.ts` (line 23)
- **Problem:** Cookie value is just the string `'authenticated'`, not a signed token
- **Impact:** If cookie can be set (XSS bypass, etc.), instant auth
- **Fix Required:** Use signed JWT or cryptographic session token

---

## Implementation Backlog

### Phase 1: Security Hardening (Before External Sharing)

| Task | Priority | Effort | Status | Completed |
|------|----------|--------|--------|-----------|
| Add server-side credit validation | P0 | 15-20 hrs | ⏳ TODO | Database needed |
| Implement rate limiting middleware | P0 | 4-6 hrs | ✅ DONE | 2026-01-22 |
| Add API request logging | P1 | 8-10 hrs | ✅ DONE (console) | 2026-01-22 |
| Add auth check to API routes | P0 | 1 hr | ✅ DONE | 2026-01-22 |

### Phase 2: Multi-User Support (Before Paying Customers)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create user table & auth flow | P1 | 20-30 hrs | Database setup |
| Per-user credit budgets | P1 | 10-15 hrs | User table |
| Saved candidates server sync | P2 | 10-15 hrs | User table |
| Admin dashboard for usage | P2 | 15-20 hrs | Logging |

### Phase 3: Production Readiness

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Replace static cookie with JWT | P2 | 8-10 hrs | User table |
| Add CSRF tokens to mutations | P2 | 4-6 hrs | None |
| Implement session revocation | P2 | 6-8 hrs | JWT |
| Add error monitoring (Sentry) | P3 | 2-4 hrs | None |
| Add usage analytics | P3 | 8-10 hrs | Logging |

---

## Quick Fixes ✅ COMPLETED (2026-01-22)

**All three quick fixes have been implemented. See `IMPLEMENTATION_GUIDE.md` for full details.**

### 1. ✅ Add Auth Check to API Routes (1 hour)

**Status:** COMPLETE
**Files Changed:**
- `app/api/search/route.ts`
- `app/api/enrich/route.ts`

**What it does:** Verifies `merraine-auth` cookie before processing any API request. Returns 401 if unauthorized.

### 2. ✅ Add Basic Rate Limiting (4-6 hours)

**Status:** COMPLETE
**Files Created:**
- `lib/rateLimit.ts` - In-memory rate limiter with cleanup

**Files Changed:**
- `app/api/search/route.ts` - 15 requests/minute
- `app/api/enrich/route.ts` - 30 requests/minute

**What it does:** Tracks requests by IP, returns 429 if limit exceeded, includes standard rate limit headers.

### 3. ✅ Add Request Logging (30 minutes)

**Status:** COMPLETE (console only, DB logging still TODO)
**Files Changed:**
- `app/api/search/route.ts` - Logs query, cost, IP
- `app/api/enrich/route.ts` - Logs enrichment requests

**What it does:** Logs all API calls to console with timestamp, query preview, cost, and IP address.

---

**See `IMPLEMENTATION_GUIDE.md` for:**
- Testing instructions
- Deployment guide
- How to adjust rate limits
- Monitoring logs in production

---

## Database Schema (When Ready)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  credit_limit INTEGER DEFAULT 5000,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Credit Transactions (Audit Log)
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  operation VARCHAR(50) NOT NULL,
  credits INTEGER NOT NULL,
  endpoint VARCHAR(100),
  query_preview VARCHAR(100),
  pearch_thread_id VARCHAR(100),
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Saved Candidates (Server Backup)
CREATE TABLE saved_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  candidate_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (If using DB sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Environment Variables Needed (Production)

```bash
# Current (MVP)
PEARCH_API_KEY=pk_...
AUTH_USERNAME=...
AUTH_PASSWORD=...

# Future (Production)
DATABASE_URL=postgresql://...
JWT_SECRET=...
RATE_LIMIT_REDIS_URL=...  # Optional, for distributed rate limiting
SENTRY_DSN=...            # Optional, for error monitoring
```

---

## Testing Checklist (Before External Release)

- [ ] Verify auth cookie cannot be forged
- [ ] Test rate limiting blocks excessive requests
- [ ] Confirm credit manipulation via DevTools is blocked (server-side validation)
- [ ] Test multi-tab behavior doesn't corrupt state
- [ ] Verify saved candidates persist after browser clear (server sync)
- [ ] Test login rate limiting (brute force protection)
- [ ] Confirm API routes reject unauthenticated requests
- [ ] Test error messages don't leak sensitive info

---

## Changelog

### 2026-01-22
- ✅ Implemented P0 quick fixes (auth checks, rate limiting, logging)
- Created `IMPLEMENTATION_GUIDE.md` with testing and deployment instructions
- Created `lib/rateLimit.ts` for in-memory rate limiting
- Updated `app/api/search/route.ts` with auth + rate limit + logging
- Updated `app/api/enrich/route.ts` with auth + rate limit + logging
- Ready for testing and deployment

### 2026-01-21
- Initial build log created
- Red team analysis completed (32 agents)
- Identified 4 critical, 2 significant, 1 notable issues
- Prioritized implementation backlog

### Previous (from git)
- 2026-01-XX: Add Find Similar feature
- 2026-01-XX: Add export functionality
- 2026-01-XX: Add architecture diagrams

---

## Notes

**MVP Scope:** This architecture is intentionally simple for rapid iteration. The gaps identified are known tradeoffs, not oversights. The priority is validating product-market fit before investing in infrastructure.

**When to Upgrade:**
- Before sharing with anyone outside WADL team
- Before any external demo or pilot
- Before accepting payment

**Contact:** Laz (WADL)
