/**
 * One-off: copy Redis user records into the backend Mongo users API.
 *
 *   node --env-file=.env.local --import tsx scripts/migrate-users-to-backend.ts
 *   # or: npm run migrate:users  (with env already loaded)
 */
import { Redis } from "@upstash/redis";

const USERS_INDEX_KEY = "school-bus:users:index";
const USER_PREFIX = "school-bus:user:";

type UserRecord = { email: string; createdAt: string };

function backendConfig(): { baseUrl: string; serviceKey: string } {
  const baseUrl = process.env.BACKEND_API_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.BACKEND_SERVICE_KEY?.trim();
  if (!baseUrl || !serviceKey) {
    throw new Error("BACKEND_API_URL and BACKEND_SERVICE_KEY are required");
  }
  return { baseUrl, serviceKey };
}

function redisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }
  return new Redis({ url, token });
}

function parseUser(value: unknown): UserRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.email !== "string" || typeof record.createdAt !== "string") {
    return null;
  }
  return { email: record.email, createdAt: record.createdAt };
}

async function postUser(
  config: { baseUrl: string; serviceKey: string },
  body: { id: string; email: string; createdAt: string },
): Promise<number> {
  const response = await fetch(`${config.baseUrl}/api/v1/users`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Service-Key": config.serviceKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return response.status;
}

async function main() {
  const config = backendConfig();
  const redis = redisClient();
  const ids = await redis.smembers(USERS_INDEX_KEY);
  if (!Array.isArray(ids) || ids.length === 0) {
    console.log("No users in Redis index.");
    return;
  }

  let created = 0;
  let existing = 0;
  let conflict = 0;
  let errors = 0;

  for (const id of ids) {
    if (typeof id !== "string" || !id) {
      errors += 1;
      console.error("skip: invalid index member", id);
      continue;
    }
    const raw = await redis.get(`${USER_PREFIX}${id}`);
    const user = parseUser(raw);
    if (!user) {
      errors += 1;
      console.error(`skip: missing/invalid user record for ${id}`);
      continue;
    }

    try {
      const status = await postUser(config, {
        id,
        email: user.email,
        createdAt: user.createdAt,
      });
      if (status === 201) {
        created += 1;
      } else if (status === 200) {
        existing += 1;
      } else if (status === 409) {
        conflict += 1;
        console.error(`409 conflict for id=${id} email=${user.email}`);
      } else {
        errors += 1;
        console.error(`HTTP ${status} for id=${id} email=${user.email}`);
      }
    } catch (error) {
      errors += 1;
      console.error(`network error for id=${id}`, error);
    }
  }

  console.log(
    `Done. index=${ids.length} created=${created} existing=${existing} conflict=${conflict} errors=${errors}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
