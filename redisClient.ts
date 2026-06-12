import Redis from "ioredis";

/**
 * Redis Cloud Essentials caps us at ~30 concurrent connections, which
 * is easy to blow past on Vercel because:
 *
 *  1. Each warm Lambda container keeps its ioredis TCP socket open for
 *     the entire lifetime of the container (5–15 min idle), holding a
 *     connection slot even when nothing is happening.
 *  2. Vercel spins up multiple containers under load, so a single
 *     traffic spike can produce N parallel sockets — one per container.
 *  3. Each cron tick also opens a connection, often in a separate
 *     container from the one serving user traffic.
 *
 * The `globalThis` cache below dedupes within a single Node process
 * (i.e. within one warm container), but it can't help across
 * containers. The settings on the ioredis client below are tuned to
 * minimize the per-container footprint:
 *
 *  - `lazyConnect: true`    Don't open the TCP socket at module load.
 *                           We only pay for a connection slot once the
 *                           first command actually runs. This matters
 *                           on cold starts where the request might not
 *                           need Redis at all (an error path, etc).
 *  - `keepAlive: 30_000`    Send TCP keepalives every 30s. Keeps
 *                           healthy idle sockets alive long enough to
 *                           be reused by the next request, but lets
 *                           dead/idle ones get reaped by intermediaries
 *                           rather than lingering forever.
 *  - `family: 0`            Allow both IPv4 and IPv6. Some Redis Cloud
 *                           CNAMEs resolve to both; without this
 *                           ioredis can sometimes open redundant
 *                           sockets racing each.
 *  - `enableOfflineQueue: false`  Fail fast when not connected instead
 *                           of buffering commands forever, so a bad
 *                           cluster doesn't quietly hold open requests.
 *
 * If we ever need to push throughput past Essentials' 30-connection
 * ceiling, the right move is migrating to Upstash (HTTP-based, no
 * persistent connections) or upgrading the Redis Cloud plan.
 */

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redis =
  globalForRedis.redis ??
  new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
    keepAlive: 30_000,
    family: 0,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 100, 3000);
    },
  });

globalForRedis.redis = redis;

export default redis;
