import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { cookieParser } from "./middleware/cookieParser";
import { errorHandler } from "./middleware/error";

// Import modules
import authRoutes from "./modules/auth/auth.routes";
import plannerRoutes from "./modules/planner/planner.routes";
import brainRoutes from "./modules/brain/brain.routes";
import collabsRoutes from "./modules/collabs/collabs.routes";
import reelsRoutes from "./modules/reels/reels.routes";
import aiRoutes from "./modules/ai/ai.routes";
import brollRoutes from "./modules/broll/broll.routes";
import journalRoutes from "./modules/journal/journal.routes";

import { validateEnv } from "./config/env";
import { prisma } from "./config/db";
import { isRedisEnabled, redisConnection } from "./config/redis";
import * as queues from "./config/queues";

dotenv.config();
validateEnv();

// Boot background workers conditionally
if (process.env.REDIS_ENABLED === "true") {
  import("./workers/ai-jobs.worker")
    .then(() => console.log("[Workers] AI Job workers loaded."))
    .catch((err) => console.error("[Workers] Failed to load AI Job workers:", err));

  import("./workers/reel-analysis.worker")
    .then(() => console.log("[Workers] Reel analysis worker loaded."))
    .catch((err) => console.error("[Workers] Failed to load Reel analysis worker:", err));
} else {
  console.log("[Workers] Redis is disabled. Background worker bootstrap skipped.");
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://instabrain.co.in",
  "https://www.instabrain.co.in"
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleaned = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(cleaned)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser);
app.use(morgan("dev"));

app.get("/health", async (req, res) => {
  const health: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {}
  };

  let hasError = false;

  // 1. Database Check
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = "connected";
  } catch (err: any) {
    health.services.database = `error: ${err.message}`;
    hasError = true;
  }

  // 2. Redis Check
  if (isRedisEnabled) {
    if (redisConnection && (redisConnection.status === "ready" || redisConnection.status === "connect")) {
      health.services.redis = "connected";
    } else {
      health.services.redis = `disconnected (status: ${redisConnection?.status || "none"})`;
      hasError = true;
    }
  } else {
    health.services.redis = "disabled";
  }

  // 3. Queues Check
  if (isRedisEnabled) {
    const queueNames = [
      "analyzeReelQueue",
      "rewriteDumpQueue",
      "generateHooksQueue",
      "generatePitchQueue",
      "scanBrandQueue",
      "generateCaptionsQueue"
    ];

    const queueStatus: Record<string, string> = {};
    for (const name of queueNames) {
      const q = (queues as any)[name];
      if (q) {
        queueStatus[name] = "active";
      } else {
        queueStatus[name] = "inactive";
        hasError = true;
      }
    }
    health.services.queues = queueStatus;
  } else {
    health.services.queues = "disabled";
  }

  if (hasError) {
    health.status = "error";
    return res.status(500).json(health);
  }

  return res.status(200).json(health);
});

// Map routes
app.use("/api/auth", authRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/brain", brainRoutes);
app.use("/api/collabs", collabsRoutes);
app.use("/api/reels", reelsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/broll", brollRoutes);
app.use("/api/journal", journalRoutes);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] Second Brain Backend running on port ${PORT}`);
});
