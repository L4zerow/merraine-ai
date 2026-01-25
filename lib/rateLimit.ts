/**
 * Simple in-memory rate limiter for MVP
 *
 * For production, consider:
 * - Upstash Redis (@upstash/ratelimit + @upstash/redis)
 * - Distributed rate limiting across serverless instances
 *
 * Current implementation:
 * - In-memory Map (resets on server restart)
 * - Per-IP tracking
 * - Sliding window
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Store rate limit records in memory
const requests = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  requests.forEach((record, key) => {
    if (now > record.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => requests.delete(key));
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit?: number;
  /** Time window in milliseconds */
  windowMs?: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Time when the limit resets (Unix timestamp) */
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (usually IP address)
 * @param options - Rate limit configuration
 * @returns RateLimitResult with allowed status and metadata
 *
 * @example
 * ```ts
 * const result = rateLimit(ip, { limit: 20, windowMs: 60000 });
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     {
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': '20',
 *         'X-RateLimit-Remaining': '0',
 *         'X-RateLimit-Reset': result.resetTime.toString()
 *       }
 *     }
 *   );
 * }
 * ```
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { limit = 20, windowMs = 60000 } = options; // Default: 20 requests per minute
  const now = Date.now();
  const record = requests.get(identifier);

  // No record or window expired - start fresh
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    requests.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
    };
  }

  // Within window - check limit
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment and allow
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Get identifier from request (IP address)
 * Checks x-forwarded-for, x-real-ip, and falls back to 'unknown'
 */
export function getIdentifier(request: Request): string {
  const headers = request.headers;

  // Check x-forwarded-for (may contain multiple IPs, take first)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Check x-real-ip
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback (all requests from same "user" in dev)
  return 'unknown';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
}
