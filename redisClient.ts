import Redis from "ioredis";

// Cache Redis client globally to reuse connections in serverless environments
// This prevents "max number of clients reached" errors
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
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 100, 3000);
    },
  });

// Cache globally to reuse connection across serverless invocations
globalForRedis.redis = redis;

export default redis;
