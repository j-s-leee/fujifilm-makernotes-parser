import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy-init: only create Redis client when rate limiting is actually called.
// This allows the app to run without Upstash env vars in development.
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// Cache rate limiter instances (one per config)
const limiters = new Map<string, Ratelimit>();

function getLimiter(
  prefix: string,
  requests: number,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`,
): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const key = `${prefix}:${requests}:${window}`;
  if (limiters.has(key)) return limiters.get(key)!;

  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `ratelimit:${prefix}`,
  });
  limiters.set(key, limiter);
  return limiter;
}

export interface RateLimitResult {
  limited: boolean;
  retryAfter?: number; // seconds until reset
}

/**
 * Check rate limit for a given identifier (user ID or hashed IP).
 * Returns { limited: false } if Upstash is not configured (dev mode).
 */
export async function checkRateLimit(
  prefix: string,
  identifier: string,
  requests: number,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`,
): Promise<RateLimitResult> {
  const limiter = getLimiter(prefix, requests, window);
  if (!limiter) return { limited: false }; // No Upstash configured — allow all

  const result = await limiter.limit(identifier);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return { limited: true, retryAfter: Math.max(retryAfter, 1) };
  }

  return { limited: false };
}

/**
 * Hash an IP address for privacy-safe rate limiting.
 * Uses a simple non-reversible hash (not crypto-grade, just for bucketing).
 */
export function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `anon:${hash.toString(36)}`;
}

// Pre-configured rate limit checkers for each endpoint
export const rateLimits = {
  imageRecommend: (userId: string) =>
    checkRateLimit("recommend:image", userId, 20, "1 h"),

  textRecommend: (userId: string) =>
    checkRateLimit("recommend:text", userId, 30, "1 h"),

  upload: (userId: string) => checkRateLimit("upload", userId, 10, "1 h"),

  // Anonymous rate limits (IP-based, daily)
  anonImageRecommend: (hashedIp: string) =>
    checkRateLimit("recommend:image:anon", hashedIp, 3, "1 d"),

  anonTextRecommend: (hashedIp: string) =>
    checkRateLimit("recommend:text:anon", hashedIp, 3, "1 d"),
} as const;
