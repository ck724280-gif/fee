interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory bucket cache with automatic sweep
const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

export interface RateLimitOptions {
  key: string;
  limit: number; // Max requests allowed
  windowSeconds: number; // Time window in seconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Checks and increments rate limit for a specific key (e.g. IP + endpoint).
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { key, limit, windowSeconds } = options;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, record);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(record.resetTime / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.ceil(record.resetTime / 1000),
  };
}

/**
 * Helper to extract client IP from Next.js request headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
