import { Redis } from "@upstash/redis";

let redisClient: Redis | null | undefined;

export function getAuthRedis(): Redis | null {
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
export function resetAuthRedisCache(): void {
  redisClient = undefined;
}
