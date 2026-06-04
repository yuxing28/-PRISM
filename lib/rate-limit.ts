interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULT_DAILY_LIMIT = 8;

function getLimit(): number {
  const v = process.env.RATE_LIMIT_PER_DAY;
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}

function getNextUtcMidnight(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return next.getTime();
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const limit = getLimit();
  const now = Date.now();
  const resetAt = getNextUtcMidnight();

  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }
  if (bucket.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count++;
  return { allowed: true, limit, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

export function getRateLimitStatus(ip: string): RateLimitResult {
  const limit = getLimit();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= Date.now()) {
    return { allowed: true, limit, remaining: limit, resetAt: getNextUtcMidnight() };
  }
  return {
    allowed: bucket.count < limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function resetRateLimit(ip: string): void {
  buckets.delete(ip);
}
