# Merraine AI - Failure Mode Analysis (EN-7)

## EXECUTIVE SUMMARY

**Resilience Assessment:** Merraine AI has **moderate failure protection in happy-path scenarios but catastrophic vulnerabilities in state corruption and API failure modes.**

The application relies heavily on localStorage for both credits and search state with no server-side ground truth, creating cascading failure scenarios where a single API error or storage corruption can silently desynchronize the client from actual API usage.

---

## PART A: STRENGTHS - Well-Handled Failure Modes

### 1. Authentication Token Expiry with HttpOnly Cookie
**Pattern:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/app/api/auth/login/route.ts`

```typescript
cookieStore.set('merraine-auth', 'authenticated', {
  httpOnly: true,           // ✓ XSS-proof
  secure: true,             // ✓ HTTPS-enforced
  sameSite: 'strict',       // ✓ CSRF-protected
  maxAge: 60 * 60 * 24 * 7, // ✓ 7-day expiry
  path: '/',
});
```

**Strength:** If cookie expires mid-session, middleware immediately redirects to `/login`. No ghost auth state possible.

**Code:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/middleware.ts` (lines 4-26)

---

### 2. Search Cache Expiry with Age Validation
**Pattern:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/lib/searchCache.ts`

```typescript
const age = Date.now() - cacheData.timestamp;
if (age > CACHE_EXPIRY_MS) {  // 1 hour
  clearSearchCache();
  return null;
}
```

**Strength:** Stale data is automatically purged. No user sees 4-hour-old search results.

**Graceful Fallback:** If localStorage access fails (private browsing), functions catch and warn:
```typescript
catch (error) {
  console.warn('Failed to load search cache:', error);
  return null;
}
```

---

### 3. Credit Affordability Check Before API Call
**Pattern:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/lib/credits.ts`

```typescript
export function canAfford(cost: number): boolean {
  const state = getStoredCredits();
  return (state.used + cost) <= (state.limit - 5);  // 5-credit buffer
}
```

**Strength:** Client-side check prevents "insufficient credits" errors from reaching API. Blocks expensive operations ($14 phone reveals) upfront.

**Code:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/app/search/page.tsx` (lines 173-177)

---

### 4. Error Boundary with Recovery Option
**Pattern:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/app/error.tsx`

```typescript
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);  // Logs to console for debugging
  }, [error]);

  return (
    <button onClick={reset}>Try again</button>  // Allows recovery
  );
}
```

**Strength:** User can retry failed page loads without full restart.

---

### 5. Try-Catch on Search API with Error Display
**Pattern:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/app/search/page.tsx` (lines 242-247)

```typescript
try {
  const response = await fetch('/api/search', { ... });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Search failed');
  }
  // ... process results
} catch (err) {
  setError(err instanceof Error ? err.message : 'Search failed');
} finally {
  setLoading(false);
  setIsLoadingMore(false);
}
```

**Strength:** Network errors don't leave UI in loading state. User sees human-readable message.

---

## PART B: WEAKNESSES - Catastrophic Failure Modes

### FAILURE MODE #1: Silent Credit Desynchronization
**Severity:** CATASTROPHIC | **Probability:** HIGH

**Scenario:** User searches and `credits_used` is logged to localStorage, but Pearch API actually charged MORE (or different pricing). Client now believes it has X credits remaining, but Pearch records Y.

**Code Location:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/app/search/page.tsx` (lines 236-240)

```typescript
// Client-side estimate, not ground truth
const actualCost = data.credits_used !== undefined ? data.credits_used : (newProfiles.length * costPerProfile);
logCreditUsage('Search', actualCost, `${newProfiles.length} profiles`);
```

**Problem:**
- Server never stores credit state
- If Pearch API changes pricing (phone reveal from $14 → $20), client keeps using old math
- User thinks they have 500 credits remaining, but Pearch says 400
- User will eventually exceed limits without warning

**Proof:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/lib/credits.ts` (line 16)
```typescript
const STORAGE_KEY = 'merraine_credits';
const DEFAULT_LIMIT = 5000;  // ← Hardcoded, not validated against server
```

**Impact:** Billing disputes, API overages, loss of trust.

---

### FAILURE MODE #2: localStorage Gets Cleared → Credit Amnesia
**Severity:** CRITICAL | **Probability:** MEDIUM

**Scenario:**
- User logs out of macOS (or browser clears site data)
- Browser deletes localStorage
- User logs back in
- `getStoredCredits()` returns `{ used: 0, limit: 5000, logs: [] }` (fresh state)
- User thinks they have 5000 credits, but API has charged 3000 already
- User searches again, unknowingly exceeds account

**Code Location:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/lib/credits.ts` (lines 25-41)

```typescript
export function getStoredCredits(): CreditState {
  if (typeof window === 'undefined') {
    return { used: 0, limit: DEFAULT_LIMIT, logs: [] };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, limit: DEFAULT_LIMIT };
    }
  } catch (e) {
    console.error('Error reading credit state:', e);  // Silent fallback
  }
  return { used: 0, limit: DEFAULT_LIMIT, logs: [] };  // ← Resets to zero
}
```

**Problem:**
- No server-side source of truth
- User experiences sudden "you have 5000 credits" after deletion
- No way to audit what actually got charged

**Proof of Vulnerability:** Test in private browsing
1. Login
2. Search (credits decrement)
3. Close private window
4. Open private window again
5. Credits will reset to 0 used

**Impact:** Revenue leakage, user confusion, untrackable billing.

---

### FAILURE MODE #3: Private Browsing Mode → localStorage Unavailable
**Severity:** HIGH | **Probability:** MEDIUM

**Scenario:**
- User opens Merraine in Safari Private Browsing
- All localStorage writes throw errors (silently caught)
- User searches 5 times, thinks they've used credits
- Browser cache cleared
- User searches again
- Same credits shown as "used"
- User thinks they searched once, actually searched 6 times
- Pearch API charged for 6 searches, client shows 1

**Code Location:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/lib/searchCache.ts` (lines 37-42)

```typescript
try {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
} catch (error) {
  console.warn('Failed to save search cache:', error);  // ← Silent failure
}
```

**Problem:**
- Errors are only logged to console (not visible to user)
- No UI indicator "Your credits aren't being tracked right now"
- User assumes normal operation

**Similar Pattern in Credits:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/lib/credits.ts` (lines 46-50)

```typescript
export function saveCredits(state: CreditState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving credit state:', e);  // ← User never sees this
  }
}
```

**Impact:** Silent data loss, untrackable usage, user confusion.

---

### FAILURE MODE #4: Concurrent Operations → Race Condition on Saved Candidates
**Severity:** HIGH | **Probability:** MEDIUM

**Scenario:**
- User saves Candidate A to localStorage
- User saves Candidate B in parallel (simultaneous click)
- Both calls read current candidates array at T=0
- Call 1 adds A and writes back
- Call 2 adds B and writes back (overwrites Call 1's result)
- Candidate A is lost

**Code Location:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/lib/savedCandidates.ts` (lines 23-43)

```typescript
export function saveCandidate(profile: Profile): SavedCandidate {
  const candidates = getSavedCandidates();  // Read at T=0

  // ... check if exists ...

  const savedCandidate: SavedCandidate = { ...profile, ... };
  candidates.push(savedCandidate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));  // Write at T=N
  // ← Between read and write, another call could have written
}
```

**Proof Test:**
```javascript
// In browser console, rapid fire:
saveCandidate(profile1);
saveCandidate(profile2);
saveCandidate(profile3);
// One or more may be lost
```

**Problem:**
- No locking mechanism
- Duplicate saves not caught (line 27 only checks existing candidates)
- User might save 3 candidates, only 2 appear

**Impact:** Data loss, user frustration.

---

### FAILURE MODE #5: Pearch API Returns 500, Client Commits Credits Anyway
**Severity:** CRITICAL | **Probability:** LOW

**Scenario:**
- Pearch API times out or returns 500 error
- Client fetch fails at `data.credits_used` (undefined)
- Code falls back to estimate: `newProfiles.length * costPerProfile`
- If response body was partial JSON (truncated connection), `data.profiles` might be `[]`
- Client logs 0 credits used (because 0 profiles)
- But Pearch actually charged the user

**Code Location:** `/Users/laz/Desktop/WADL/Clients/Merraine/AI/app/search/page.tsx` (lines 210-240)

```typescript
const data = await response.json();  // ← Throws if invalid JSON

if (!response.ok) {
  throw new Error(data.error || 'Search failed');  // ← Caught
}

const newProfiles = data.profiles || [];  // ← Defaults to []
// ...
const actualCost = data.credits_used !== undefined ? data.credits_used : (newProfiles.length * costPerProfile);
logCreditUsage('Search', actualCost, ...);  // ← If newProfiles is [], logs 0
```

**Attack Vector:** Pearch API returns `{ error: "Server error", profiles: [] }`
- Client throws error (good)
- But then catches on line 243

Actually, this is **partially mitigated** by the error handling. But if response is:
```json
{ "profiles": [], "credits_used": 100 }
```
And client receives truncated at `"profiles": []`, then:
- `data.credits_used === undefined` (truncated)
- Falls back to `0 * 5 = 0` credits logged
- User loses 100 credits, thinks they lost 0

**Impact:** Billing fraud potential (user's fault, but app enabled it).

---

## SUMMARY TABLE

| Failure Mode | Severity | Probability | Data Loss | User Impact |
|---|---|---|---|---|
| **Credit Desynchronization** | CATASTROPHIC | HIGH | Yes | Overages, billing disputes |
| **localStorage Cleared** | CRITICAL | MEDIUM | Yes | Credit amnesia, overages |
| **Private Browsing** | HIGH | MEDIUM | Yes | Silent tracking loss |
| **Concurrent Saves** | HIGH | MEDIUM | Yes | Candidate data loss |
| **Pearch API 500** | CRITICAL | LOW | Possibly | Silent undercount |

---

## OVERALL ASSESSMENT

**Merraine AI has weak resilience to storage failures and no server-side source of truth, making credit tracking unreliable and saved data vulnerable to loss under concurrent operations or storage exhaustion scenarios.**

The application prioritizes happy-path user experience (smooth search, caching) over data integrity, with catch-all error handlers that silently fail rather than alert the user.

---

## MITIGATION RECOMMENDATIONS (Not Implemented)

### Quick Wins
1. **Server-side credit tracking** - Only trust Pearch's reported `credits_used`, reject local estimate
2. **Add visual warning** - If localStorage save fails, show "⚠️ Data not saved" badge
3. **Use unique keys for concurrent operations** - Implement optimistic locking for saved candidates
4. **Validate storage access on app load** - Detect private browsing and warn user upfront

### Structural
1. Move credits to server-side session storage (tied to auth cookie)
2. Implement conflict-free merge strategy for offline-first operations
3. Add server-side audit log of all credit operations
4. Use IndexedDB with service worker for resilient offline state

---

**Analysis Date:** January 21, 2026
**Model:** Haiku 4.5
**Method:** Code review + failure mode enumeration
