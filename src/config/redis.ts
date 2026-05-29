import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const isRedisEnabled = process.env.REDIS_ENABLED === "true";

export let redisConnection: Redis | null = null;

if (isRedisEnabled) {
  if (!process.env.REDIS_URL) {
    console.error("Application startup failed: REDIS_ENABLED is true but REDIS_URL is missing.");
    process.exit(1);
  }

  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      // Exponential backoff with a cap at 3000ms
      const delay = Math.min(times * 100, 3000);
      console.warn(`[Redis] Connection lost. Attempting reconnection #${times} in ${delay}ms...`);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = "READONLY";
      if (err.message.slice(0, targetError.length) === targetError) {
        return true;
      }
      return false;
    }
  });

  redisConnection.on("connect", () => {
    console.log("Redis connected successfully.");
  });

  redisConnection.on("error", (err) => {
    console.error("Redis connection error:", err);
  });
} else {
  console.log("Redis is temporarily disabled via env. Bypassing socket connection.");
}
