import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Lazy-init Upstash Redis to avoid build-time env var crashes
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// Proxy for backwards compatibility: `redis.get(...)` still works everywhere
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    const instance = getRedis();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

// IORedis for BullMQ (requires persistent connection)
let ioRedisConnection: IORedis | null = null;

export const getIORedisConnection = (): IORedis => {
  if (!ioRedisConnection) {
    ioRedisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return ioRedisConnection;
};

// Cache utilities
export const cache = {
  // Get cached value
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value as T | null;
  },

  // Set cached value with optional TTL (in seconds)
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } else {
      await redis.set(key, JSON.stringify(value));
    }
  },

  // Delete cached value
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  // Delete multiple keys by pattern
  async delByPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  // Increment counter
  async incr(key: string): Promise<number> {
    return await redis.incr(key);
  },

  // Set expiry on existing key
  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  },
};

// Rate limiting utilities
export const rateLimit = {
  async check(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetIn: ttl > 0 ? ttl : windowSeconds,
    };
  },
};

// Session utilities
export const session = {
  async create(userId: string, data: Record<string, unknown>, ttlSeconds = 86400): Promise<string> {
    const { nanoid } = await import('nanoid');
    const sessionId = nanoid(32);
    const key = `session:${sessionId}`;

    await redis.set(key, JSON.stringify({ userId, ...data }), { ex: ttlSeconds });

    return sessionId;
  },

  async get(sessionId: string): Promise<Record<string, unknown> | null> {
    const key = `session:${sessionId}`;
    const data = await redis.get(key);
    return data as Record<string, unknown> | null;
  },

  async destroy(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await redis.del(key);
  },

  async extend(sessionId: string, ttlSeconds = 86400): Promise<void> {
    const key = `session:${sessionId}`;
    await redis.expire(key, ttlSeconds);
  },
};
