import { Queue } from "bullmq";
import { redisConnection, isRedisEnabled } from "./redis";

export let analyzeReelQueue: Queue | null = null;
export let rewriteDumpQueue: Queue | null = null;
export let generateHooksQueue: Queue | null = null;
export let generatePitchQueue: Queue | null = null;
export let scanBrandQueue: Queue | null = null;
export let generateCaptionsQueue: Queue | null = null;
export let instagramPublishQueue: Queue | null = null;

if (isRedisEnabled && redisConnection) {
  analyzeReelQueue = new Queue("analyze-reel", { connection: redisConnection as any });
  rewriteDumpQueue = new Queue("rewrite-dump", { connection: redisConnection as any });
  generateHooksQueue = new Queue("generate-hooks", { connection: redisConnection as any });
  generatePitchQueue = new Queue("generate-pitch", { connection: redisConnection as any });
  scanBrandQueue = new Queue("scan-brand", { connection: redisConnection as any });
  generateCaptionsQueue = new Queue("generate-captions", { connection: redisConnection as any });
  instagramPublishQueue = new Queue("instagram-publish", { connection: redisConnection as any });
  console.log("BullMQ queues initialized.");
} else {
  console.log("BullMQ queues bypassed (Redis is disabled).");
}
