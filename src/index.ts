import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { cookieParser } from "./middleware/cookieParser";
import { errorHandler } from "./middleware/error";

// Logger interception for production audit logs
const logsBuffer: string[] = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function formatLogMessage(args: any[]): string {
  return args.map(arg => {
    if (arg && arg.stack) return `${arg.message}\n${arg.stack}`;
    return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
  }).join(' ');
}

console.log = (...args) => {
  logsBuffer.push(`[${new Date().toISOString()}] [INFO] ${formatLogMessage(args)}`);
  if (logsBuffer.length > 500) logsBuffer.shift();
  originalLog(...args);
};

console.warn = (...args) => {
  logsBuffer.push(`[${new Date().toISOString()}] [WARN] ${formatLogMessage(args)}`);
  if (logsBuffer.length > 500) logsBuffer.shift();
  originalWarn(...args);
};

console.error = (...args) => {
  logsBuffer.push(`[${new Date().toISOString()}] [ERROR] ${formatLogMessage(args)}`);
  if (logsBuffer.length > 500) logsBuffer.shift();
  originalError(...args);
};

// Import modules
import authRoutes from "./modules/auth/auth.routes";
import plannerRoutes from "./modules/planner/planner.routes";
import brainRoutes from "./modules/brain/brain.routes";
import collabsRoutes from "./modules/collabs/collabs.routes";
import reelsRoutes from "./modules/reels/reels.routes";
import aiRoutes from "./modules/ai/ai.routes";
import brollRoutes from "./modules/broll/broll.routes";
import journalRoutes from "./modules/journal/journal.routes";
import instagramRoutes from "./modules/instagram/instagram.routes";
import profileRoutes from "./modules/creator-profile/profile.routes";

import { validateEnv } from "./config/env";
import { prisma } from "./config/db";
import { isRedisEnabled, redisConnection } from "./config/redis";
import * as queues from "./config/queues";

dotenv.config();
validateEnv();

console.log("[Instagram Config]");
console.log(`META_CLIENT_ID=${process.env.META_CLIENT_ID || ""}`);
console.log(`META_CLIENT_SECRET_LOADED=${process.env.META_CLIENT_SECRET ? "true" : "false"}`);
console.log(`META_REDIRECT_URI=${process.env.META_REDIRECT_URI || ""}`);
console.log(`FRONTEND_URL=${process.env.FRONTEND_URL || ""}`);

// Boot background workers conditionally
if (process.env.REDIS_ENABLED === "true") {
  import("./workers/ai-jobs.worker")
    .then(() => console.log("[Workers] AI Job workers loaded."))
    .catch((err) => console.error("[Workers] Failed to load AI Job workers:", err));

  import("./workers/reel-analysis.worker")
    .then(() => console.log("[Workers] Reel analysis worker loaded."))
    .catch((err) => console.error("[Workers] Failed to load Reel analysis worker:", err));

  import("./workers/instagramPublish.worker")
    .then(() => console.log("[Workers] Instagram publish worker loaded."))
    .catch((err) => console.error("[Workers] Failed to load Instagram publish worker:", err));

  import("./workers/recovery.cron").then((module) => {
    module.startRecoveryCron();
  });
} else {
  console.log("[Workers] Redis is disabled. Background worker bootstrap skipped.");
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://instabrain.co.in",
  "https://www.instabrain.co.in",
  "https://second-brain.co.in",
  "https://www.second-brain.co.in"
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

// Allow all *.vercel.app subdomains (covers preview + production deployments)
const vercelOriginPattern = /^https:\/\/[a-z0-9-]+-instabrain\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleaned = origin.replace(/\/$/, "");
      if (
        allowedOrigins.includes(cleaned) ||
        vercelOriginPattern.test(cleaned) ||
        cleaned === "https://second-brain-instabrain.vercel.app"
      ) {
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
      "generateCaptionsQueue",
      "instagramPublishQueue"
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

  // 4. Publishing Job Counts
  try {
    const [pendingCount, stuckCount, oldestPendingJob, oldestStuckJob] = await Promise.all([
      prisma.publishingJob.count({ where: { status: "PENDING" } }),
      prisma.publishingJob.count({ where: { status: "STUCK" } }),
      prisma.publishingJob.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" }
      }),
      prisma.publishingJob.findFirst({
        where: { status: "STUCK" },
        orderBy: { createdAt: "asc" }
      })
    ]);

    const now = new Date();
    const oldestPendingJobAgeMinutes = oldestPendingJob
      ? Math.max(0, Math.floor((now.getTime() - oldestPendingJob.createdAt.getTime()) / 60000))
      : 0;

    const oldestStuckJobAgeMinutes = oldestStuckJob
      ? Math.max(0, Math.floor((now.getTime() - oldestStuckJob.createdAt.getTime()) / 60000))
      : 0;

    health.services.publishingJobs = { pending: pendingCount, stuck: stuckCount };
    health.oldestPendingJobAgeMinutes = oldestPendingJobAgeMinutes;
    health.oldestStuckJobAgeMinutes = oldestStuckJobAgeMinutes;

    if (stuckCount > 0) {
      health.status = "degraded";
    }
  } catch (err: any) {
    health.services.publishingJobs = `error: ${err.message}`;
    health.oldestPendingJobAgeMinutes = 0;
    health.oldestStuckJobAgeMinutes = 0;
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
app.use("/api/instagram", instagramRoutes);
app.use("/api/profile", profileRoutes);

app.get("/api/railway-audit", async (req, res) => {
  try {
    const columns = await prisma.$queryRaw`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('User', 'InstagramSnapshot', 'CreatorProfile', 'InstagramAIAnalysis', 'CreatorIntelligence', 'CreatorOpportunity', 'HookLibrary')
    `;
    
    const migrations = await prisma.$queryRaw`
      SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5
    `.catch(() => []);

    const postId = req.query.postId as string;
    let post = null;
    let jobs: any[] = [];
    if (postId) {
      post = await prisma.post.findUnique({
        where: { id: postId },
        include: { brolls: true }
      });
      jobs = await prisma.publishingJob.findMany({
        where: { postId }
      });
    }

    const redisEnv: Record<string, string> = {};
    for (const key of Object.keys(process.env)) {
      if (key.includes("REDIS")) {
        const val = process.env[key] || "";
        redisEnv[key] = val.replace(/:[^:@]*@/, ':***@').replace(/([?&]password=)[^&]*/, '$1***');
      }
    }

    res.json({
      DATABASE_URL: (process.env.DATABASE_URL || "").replace(/:[^:@]*@/, ':***@'),
      DATABASE_URL_UNMASKED: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      envKeys: Object.keys(process.env),
      redisEnv,
      schema: { columns, migrations },
      debug: { post, jobs }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get("/api/railway-data", async (req, res) => {
  try {
    const email = "ashithamariya1998@gmail.com";
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        instagramUserId: true,
        instagramUsername: true,
        instagramConnectedAt: true,
        instagramSnapshots: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, createdAt: true, profileJson: true, mediaJson: true }
        },
        instagramAiAnalyses: {
          orderBy: { analyzedAt: 'desc' },
          take: 3
        },
        creatorIntelligences: true,
        creatorOpportunities: { orderBy: { createdAt: 'desc' }, take: 10 },
        hookLibraries: { take: 5 }
      }
    });
    
    if (!user) {
      return res.json({ error: "User not found" });
    }

    res.json({
      env: {
        ALLOW_INSTAGRAM_MOCKS: process.env.ALLOW_INSTAGRAM_MOCKS,
        META_CLIENT_ID: process.env.META_CLIENT_ID ? 'Exists' : 'Missing',
        META_CLIENT_SECRET: process.env.META_CLIENT_SECRET ? 'Exists' : 'Missing',
        META_REDIRECT_URI: process.env.META_REDIRECT_URI
      },
      user: {
        id: user.id,
        email: user.email,
        instagramUserId: user.instagramUserId,
        instagramUsername: user.instagramUsername,
        instagramConnectedAt: user.instagramConnectedAt
      },
      snapshots: user.instagramSnapshots.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        profileJsonSize: s.profileJson ? JSON.stringify(s.profileJson).length : 0,
        mediaJsonSize: s.mediaJson ? JSON.stringify(s.mediaJson).length : 0,
        mediaItemCount: s.mediaJson ? (s.mediaJson as unknown as any[]).length : 0
      })),
      aiAnalyses: user.instagramAiAnalyses,
      creatorIntelligence: user.creatorIntelligences,
      opportunities: user.creatorOpportunities,
      hooks: user.hookLibraries
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/railway-logs", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send(logsBuffer.join("\n"));
});

app.get('/api/railway-audit-2', async (req, res) => {
  try {
    const dns = require("dns");
    const net = require("net");

    const checkHost = (host: string, port: number): Promise<any> => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolvedIp = "unknown";
        dns.lookup(host, (err: any, address: string) => {
          if (!err && address) {
            resolvedIp = address;
          }
          socket.setTimeout(1500);
          socket.on("connect", () => {
            socket.destroy();
            resolve({ host, port, resolvedIp, status: "connected" });
          });
          socket.on("error", (err: any) => {
            socket.destroy();
            resolve({ host, port, resolvedIp, status: "error", error: err.message });
          });
          socket.on("timeout", () => {
            socket.destroy();
            resolve({ host, port, resolvedIp, status: "timeout" });
          });
          socket.connect(port, host);
        });
      });
    };

    const hostsToCheck = [
      "redis",
      "Redis",
      "redis.railway.internal",
      "Redis.railway.internal",
      "redis.railway",
      "Redis.railway"
    ];

    const dnsResults = await Promise.all(hostsToCheck.map(h => checkHost(h, 6379)));

    const userCols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY column_name`);
    const tables = await prisma.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
    const migrations = await prisma.$queryRawUnsafe(`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC`);
    res.json({ dnsResults, userCols, tables, migrations });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] Second Brain Backend running on port ${PORT}`);
});
