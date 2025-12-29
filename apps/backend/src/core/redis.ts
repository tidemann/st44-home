/**
 * Redis Client
 *
 * Provides Redis connection for:
 * - Rate limiting
 * - Session storage
 * - Caching
 *
 * Configuration via environment variables:
 * - REDIS_HOST (default: localhost)
 * - REDIS_PORT (default: 6379)
 */

import Redis from 'ioredis';

/**
 * Redis connection options
 */
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  retryStrategy: (times: number): number | null => {
    if (times > 10) {
      // Stop retrying after 10 attempts
      console.error('Redis: Max retry attempts reached, giving up');
      return null;
    }
    // Exponential backoff with max 2 second delay
    const delay = Math.min(times * 100, 2000);
    console.log(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately - allows graceful handling when Redis is unavailable
};

/**
 * Main Redis client instance
 */
export const redis = new Redis(redisOptions);

// Connection event handlers
redis.on('connect', () => {
  console.log('Redis: Connected');
});

redis.on('ready', () => {
  console.log('Redis: Ready for commands');
});

redis.on('error', (err: Error) => {
  console.error('Redis: Connection error:', err.message);
});

redis.on('close', () => {
  console.log('Redis: Connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis: Reconnecting...');
});

/**
 * Check if Redis is connected and ready
 */
export function isRedisReady(): boolean {
  return redis.status === 'ready';
}

/**
 * Gracefully disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redis.status !== 'end') {
    await redis.quit();
  }
}

/**
 * Connect to Redis (for lazy connection mode)
 */
export async function connectRedis(): Promise<void> {
  if (redis.status === 'wait') {
    await redis.connect();
  }
}
