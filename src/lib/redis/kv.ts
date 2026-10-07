import { Redis } from "@upstash/redis";

let redisClient: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

/** Reset cached client (tests only). */
export function resetRedisCache(): void {
  redisClient = undefined;
}

/** Commands billing (and similar) use. Upstash Redis implements them. */
export type Kv = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(
    key: string,
    value: unknown,
    opts?: { ex: number } | { nx: true },
  ): Promise<unknown>;
  getdel<T = unknown>(key: string): Promise<T | null>;
  del(...keys: string[]): Promise<unknown>;
  sadd(key: string, member: string): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  incr(key: string): Promise<number>;
};

export function toKv(redis: Redis): Kv {
  return {
    get: (key) => redis.get(key),
    set: (key, value, opts) => {
      if (opts && "nx" in opts) return redis.set(key, value, { nx: true });
      if (opts && "ex" in opts) return redis.set(key, value, { ex: opts.ex });
      return redis.set(key, value);
    },
    getdel: (key) => redis.getdel(key),
    del: (...keys) => redis.del(...keys),
    sadd: (key, member) => redis.sadd(key, member),
    expire: (key, seconds) => redis.expire(key, seconds),
    incr: (key) => redis.incr(key),
  };
}
