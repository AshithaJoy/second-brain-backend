import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const isRedisEnabled = process.env.REDIS_ENABLED === "true";

export let redisConnection: Redis | null = null;

if (isRedisEnabled) {
  let source = "REDIS_URL";
  let redisUrl = process.env.REDIS_URL || "";

  if (process.env.REDISHOST) {
    source = "REDISHOST (Railway Redis)";
    const host = process.env.REDISHOST;
    const port = process.env.REDISPORT || "6379";
    const user = process.env.REDISUSER || "default";
    const password = process.env.REDISPASSWORD || "";
    redisUrl = password
      ? `redis://${user}:${password}@${host}:${port}`
      : `redis://${host}:${port}`;
  } else if (process.env.REDIS_PUBLIC_URL) {
    source = "REDIS_PUBLIC_URL (Railway Redis Public)";
    redisUrl = process.env.REDIS_PUBLIC_URL;
  } else if (!redisUrl) {
    source = "default fallback";
    redisUrl = "redis://localhost:6379";
  }

  // Parse host and port for verification/printing
  let activeHost = "unknown";
  let activePort = "unknown";
  try {
    const urlWithoutProtocol = redisUrl.includes("://") ? redisUrl.split("://")[1] : redisUrl;
    // Format: [user:password@]host:port
    const hostPortPart = urlWithoutProtocol.includes("@") ? urlWithoutProtocol.split("@")[1] : urlWithoutProtocol;
    const parts = hostPortPart.split(":");
    activeHost = parts[0].split("/")[0].split("?")[0];
    activePort = parts[1] ? parts[1].split("/")[0].split("?")[0] : "6379";
  } catch (e) {
    activeHost = "parse-error";
    activePort = "parse-error";
  }

  console.log(`[Redis] Sourcing connection from: ${source}`);
  console.log(`[Redis] Active Redis host: ${activeHost}`);
  console.log(`[Redis] Active Redis port: ${activePort}`);

  if (activeHost.includes("upstash.io")) {
    console.warn("[Redis] WARNING: Connected to Upstash Redis database. Ensure you migrate to Railway Redis when available.");
  }

  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
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
    console.log(`Redis connected successfully to host: ${activeHost}:${activePort}`);
  });

  redisConnection.on("error", (err) => {
    console.error(`Redis connection error (host: ${activeHost}:${activePort}):`, err);
  });
} else {
  console.log("Redis is temporarily disabled via env. Bypassing socket connection.");
}
