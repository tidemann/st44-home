/**
 * Rate Limiting Middleware
 *
 * Redis-backed rate limiting with sliding window algorithm.
 * Provides configurable rate limits per key with:
 * - Standard response headers (X-RateLimit-*)
 * - Graceful fallback when Redis is unavailable
 * - Per-IP, per-user, or custom key strategies
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { redis, isRedisReady } from '../core/redis.js';
import { TooManyRequestsError } from '../errors/index.js';

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /** Key prefix for Redis (e.g., 'ratelimit:login:') */
  keyPrefix: string;
  /** Maximum number of requests allowed in the time window */
  points: number;
  /** Time window duration in seconds */
  duration: number;
  /** Duration to block after limit exceeded (default: same as duration) */
  blockDuration?: number;
  /** Custom function to generate the rate limit key (default: request IP) */
  keyGenerator?: (req: FastifyRequest) => string | undefined;
  /** Whether to skip rate limiting when Redis is unavailable (default: true for availability) */
  skipOnError?: boolean;
}

/**
 * Default key generator using request IP
 */
function defaultKeyGenerator(req: FastifyRequest): string {
  return req.ip;
}

/**
 * Create a rate limiting preHandler hook
 *
 * @example
 * // Limit to 10 requests per hour by email
 * server.post('/auth/login', {
 *   preHandler: createRateLimiter({
 *     keyPrefix: 'ratelimit:login:',
 *     points: 10,
 *     duration: 3600,
 *     keyGenerator: (req) => (req.body as any)?.email,
 *   })
 * }, handler);
 *
 * @example
 * // Global IP-based rate limit
 * server.addHook('onRequest', createRateLimiter({
 *   keyPrefix: 'ratelimit:global:',
 *   points: 1000,
 *   duration: 60,
 * }));
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    keyPrefix,
    points,
    duration,
    blockDuration = duration,
    keyGenerator = defaultKeyGenerator,
    skipOnError = true,
  } = options;

  // Return async preHandler - do NOT call done() in async functions
  // Fastify uses promise resolution to signal completion in async handlers
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Generate the rate limit key
    const identifier = keyGenerator(request);

    // Skip if no identifier could be generated
    if (!identifier) {
      request.log.warn({ keyPrefix }, 'Rate limiter: No identifier, skipping');
      return;
    }

    const key = `${keyPrefix}${identifier}`;

    // Check if Redis is available
    if (!isRedisReady()) {
      if (skipOnError) {
        request.log.warn({ key }, 'Rate limiter: Redis unavailable, skipping check');
        return;
      }
      // If not skipping on error, deny the request for safety
      throw new TooManyRequestsError('Rate limiting service unavailable', duration);
    }

    try {
      // Get current count and TTL in a single pipeline
      const pipeline = redis.pipeline();
      pipeline.get(key);
      pipeline.ttl(key);
      const results = await pipeline.exec();

      if (!results) {
        request.log.warn({ key }, 'Rate limiter: Pipeline returned null');
        return;
      }

      const [[, currentValue], [, ttl]] = results as [[null, string | null], [null, number]];
      const count = currentValue ? parseInt(currentValue, 10) : 0;
      const remaining = Math.max(0, points - count);

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', points);
      reply.header('X-RateLimit-Remaining', remaining);

      // Calculate reset time
      const resetTime = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + duration * 1000;
      reply.header('X-RateLimit-Reset', Math.floor(resetTime / 1000));

      // Check if limit exceeded
      if (count >= points) {
        const retryAfter = ttl > 0 ? ttl : blockDuration;
        reply.header('Retry-After', retryAfter);

        request.log.warn({ key, count, points, retryAfter }, 'Rate limit exceeded');

        throw new TooManyRequestsError('Too many requests. Please try again later.', retryAfter);
      }

      // Increment counter
      const incrPipeline = redis.pipeline();
      incrPipeline.incr(key);

      // Set expiry only on first request (when TTL is -2 or count is 0)
      if (count === 0 || ttl === -2) {
        incrPipeline.expire(key, duration);
      }

      await incrPipeline.exec();

      // Update remaining header after increment
      reply.header('X-RateLimit-Remaining', Math.max(0, remaining - 1));
    } catch (error) {
      // Re-throw our own errors
      if (error instanceof TooManyRequestsError) {
        throw error;
      }

      // Handle Redis errors
      request.log.error({ err: error, key }, 'Rate limiter: Redis error');

      if (skipOnError) {
        return;
      }

      throw new TooManyRequestsError('Rate limiting service unavailable', duration);
    }
  };
}

/**
 * Create IP-based rate limiter
 */
export function createIpRateLimiter(keyPrefix: string, points: number, duration: number) {
  return createRateLimiter({
    keyPrefix,
    points,
    duration,
  });
}

/**
 * Create user-based rate limiter (requires authentication)
 */
export function createUserRateLimiter(keyPrefix: string, points: number, duration: number) {
  return createRateLimiter({
    keyPrefix,
    points,
    duration,
    keyGenerator: (req) => req.user?.userId,
  });
}

/**
 * Create email-based rate limiter (for auth endpoints)
 */
export function createEmailRateLimiter(keyPrefix: string, points: number, duration: number) {
  return createRateLimiter({
    keyPrefix,
    points,
    duration,
    keyGenerator: (req) => {
      const body = req.body as Record<string, unknown> | undefined;
      return typeof body?.email === 'string' ? body.email.toLowerCase() : undefined;
    },
  });
}

// Preset rate limiters for common use cases
export const rateLimiters = {
  /**
   * Login: 10 attempts per hour per email
   */
  login: createEmailRateLimiter('ratelimit:login:', 10, 3600),

  /**
   * Forgot password: 3 requests per hour per email
   */
  forgotPassword: createEmailRateLimiter('ratelimit:forgot-password:', 3, 3600),

  /**
   * Registration: 5 attempts per hour per IP
   */
  register: createIpRateLimiter('ratelimit:register:', 5, 3600),

  /**
   * Task completion: 100 per minute per user (prevent grinding)
   */
  taskComplete: createUserRateLimiter('ratelimit:task-complete:', 100, 60),

  /**
   * Global API: 1000 requests per minute per IP
   */
  globalApi: createIpRateLimiter('ratelimit:global:', 1000, 60),
};
