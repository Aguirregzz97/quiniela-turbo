import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client.
 *
 * We picked Upstash over the previous Redis Cloud + ioredis combo
 * because the latter doesn't fit Vercel's serverless model:
 *   - ioredis holds a persistent TCP socket per Node process. Each
 *     warm Lambda container counted as a connection slot, even idle.
 *   - Redis Cloud Essentials caps at ~30 connections, which we kept
 *     bumping up against during normal traffic spikes.
 *   - Upstash speaks HTTP, so every command is a stateless request
 *     and there's no persistent connection at all. The connection
 *     limit problem just goes away.
 *
 * `automaticDeserialization: false` tells the Upstash client to
 * return raw strings from `get` and accept raw strings on `setex`,
 * exactly like ioredis used to. This way every existing call site
 * (which already does its own `JSON.stringify` / `JSON.parse`) keeps
 * working unchanged. If you'd rather store/retrieve objects natively,
 * flip this to true and drop the JSON dance at the call sites.
 *
 * Cached on `globalThis` in dev so HMR doesn't churn through clients.
 * In production this matters less (the Upstash client is HTTP-only,
 * so spinning up extra instances has no real cost) but it's a free
 * habit to keep.
 */

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const upstash =
  globalForRedis.redis ??
  Redis.fromEnv({
    automaticDeserialization: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = upstash;
}

/**
 * Thin adapter that exposes the subset of the old ioredis API our
 * call sites already use, with the runtime types we actually want.
 *
 * Why we need it: with `automaticDeserialization: false` the Upstash
 * client returns raw strings at runtime, but its TypeScript signature
 * still claims `get<TData>(key): Promise<TData | null>` defaulting to
 * `{}`. The adapter pins the return type to `string | null` so
 * consumers don't have to sprinkle generics or casts everywhere.
 */
const redis = {
  /** Returns the cached string, or `null` when the key is missing. */
  get(key: string): Promise<string | null> {
    return upstash.get<string>(key);
  },
  /**
   * Atomically sets `key` to `value` with `seconds` of TTL. Same
   * signature as ioredis' `setex` — the third argument must be a
   * string, callers stringify objects themselves.
   */
  setex(key: string, seconds: number, value: string): Promise<unknown> {
    return upstash.setex(key, seconds, value);
  },
};

export default redis;
