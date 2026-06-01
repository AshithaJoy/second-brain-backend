import { Worker } from "bullmq";
import { redisConnection, isRedisEnabled } from "../config/redis";
import { prisma } from "../config/db";
import { OpenAIService } from "../services/openai/openai.service";
import { InstagramService } from "../services/instagram/instagram.service";

if (isRedisEnabled && redisConnection) {
  // ── 1. REWRITE DUMP WORKER ───────────────────────────────────────────────────
  const rewriteDumpWorker = new Worker(
    "rewrite-dump",
    async (job) => {
      console.log(`[Worker: rewrite-dump] Job ${job.id} for user ${job.data.userId}`);
      const { dumpId, title, text, userId, jobId } = job.data;

      try {
        const result = await OpenAIService.rewriteDump(title, text, userId);

        // Update Dump in DB with rewritten text and title
        await prisma.dump.update({
          where: { id: dumpId },
          data: {
            title: result.title,
            text: JSON.stringify(result),
            ts: "just now",
          },
        });

        // Update tracking AIJob
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(result),
          },
        });
      } catch (err: any) {
        console.error(`[Worker: rewrite-dump] Job ${job.id} failed:`, err);
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            resultJson: JSON.stringify({ error: err.message || "Failed" }),
          },
        });
        throw err;
      }
    },
    { connection: redisConnection as any }
  );

  // ── 2. GENERATE HOOKS WORKER ─────────────────────────────────────────────────
  const generateHooksWorker = new Worker(
    "generate-hooks",
    async (job) => {
      console.log(`[Worker: generate-hooks] Job ${job.id} for user ${job.data.userId}`);
      const { postId, title, mood, userId, jobId } = job.data;

      try {
        const result = await OpenAIService.generateHooks(title, mood, userId);

        // Save structured result as serialized JSON inside Post.caption
        await prisma.post.update({
          where: { id: postId },
          data: { caption: JSON.stringify(result) },
        });

        // Update tracking AIJob
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(result),
          },
        });
      } catch (err: any) {
        console.error(`[Worker: generate-hooks] Job ${job.id} failed:`, err);
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            resultJson: JSON.stringify({ error: err.message || "Failed" }),
          },
        });
        throw err;
      }
    },
    { connection: redisConnection as any }
  );

  // ── 3. GENERATE PITCH WORKER ─────────────────────────────────────────────────
  const generatePitchWorker = new Worker(
    "generate-pitch",
    async (job) => {
      console.log(`[Worker: generate-pitch] Job ${job.id} for user ${job.data.userId}`);
      const { collabId, brandName, profileUrl, niche, userId, jobId } = job.data;

      try {
        const result = await OpenAIService.generatePitch(brandName, profileUrl, niche);

        // Update Collab and related deliverables in DB
        await prisma.$transaction(async (tx) => {
          // Clear any old deliverables first to insert new suggestions
          await tx.deliverable.deleteMany({ where: { collabId } });

          // Update main Collab
          await tx.collab.update({
            where: { id: collabId },
            data: {
              quote: result.quote,
              negotiatedAmount: result.negotiatedAmount,
              pitchDraft: result.pitchDraft,
              notes: result.notes,
              deliverables: {
                create: result.deliverables.map((d: any) => ({
                  text: d.text,
                  type: d.type,
                  completed: false,
                })),
              },
            },
          });
        });

        // Update tracking AIJob
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(result),
          },
        });
      } catch (err: any) {
        console.error(`[Worker: generate-pitch] Job ${job.id} failed:`, err);
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            resultJson: JSON.stringify({ error: err.message || "Failed" }),
          },
        });
        throw err;
      }
    },
    { connection: redisConnection as any }
  );

  // ── 4. SCAN BRAND WORKER ─────────────────────────────────────────────────────
  const scanBrandWorker = new Worker(
    "scan-brand",
    async (job) => {
      console.log(`[Worker: scan-brand] Job ${job.id} for user ${job.data.userId}`);
      const { niche, userId, jobId } = job.data;

      try {
        // Simulate scanning Instagram and discover 2 target brand profiles based on niche
        let mockProfiles = [];
        if (niche === "minimalist-productivity") {
          mockProfiles = ["https://instagram.com/focusflow.io", "https://instagram.com/monojournals"];
        } else if (niche === "aesthetic-lifestyle") {
          mockProfiles = ["https://instagram.com/norselinen", "https://instagram.com/meltandmist"];
        } else {
          mockProfiles = ["https://instagram.com/stackdev", "https://instagram.com/glassnote"];
        }

        const results = [];
        for (const url of mockProfiles) {
          const profile = await InstagramService.getBrandProfile(url);

          // Save discovered brand into Collab database as 'dream brand' lead
          const collab = await prisma.collab.create({
            data: {
              brand: profile.fullName || profile.username,
              contactName: "Partnership Team",
              email: `collabs@${profile.username}.com`,
              platform: "Instagram",
              status: "DREAM_BRAND",
              notes: `AI Brand Discovery Scan: ${profile.biography} Profile followers: ${profile.followersCount}.`,
              userId,
            },
          });
          results.push(collab);
        }

        // Update tracking AIJob
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify({ brandsDiscovered: results }),
          },
        });
      } catch (err: any) {
        console.error(`[Worker: scan-brand] Job ${job.id} failed:`, err);
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            resultJson: JSON.stringify({ error: err.message || "Failed" }),
          },
        });
        throw err;
      }
    },
    { connection: redisConnection as any }
  );

  // ── 5. GENERATE CAPTIONS WORKER ────────────────────────────────────────────────
  const generateCaptionsWorker = new Worker(
    "generate-captions",
    async (job) => {
      console.log(`[Worker: generate-captions] Job ${job.id} for user ${job.data.userId}`);
      const { postId, title, mood, userId, jobId } = job.data;

      try {
        const post = await prisma.post.findUnique({ where: { id: postId } });
        let hooksData = null;
        if (post && post.caption) {
          try {
            const parsed = JSON.parse(post.caption);
            if (parsed && typeof parsed === "object" && Array.isArray(parsed.hooks)) {
              hooksData = parsed;
              console.log(`[Worker: generate-captions] Pipeline Chaining: Successfully loaded hooks from post.caption`);
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }

        const result = await OpenAIService.generateCaptions(title, mood, hooksData, userId);

        // Save result as serialized JSON inside Post.notes field
        await prisma.post.update({
          where: { id: postId },
          data: { notes: JSON.stringify(result) },
        });

        // Update tracking AIJob
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(result),
          },
        });
      } catch (err: any) {
        console.error(`[Worker: generate-captions] Job ${job.id} failed:`, err);
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            resultJson: JSON.stringify({ error: err.message || "Failed" }),
          },
        });
        throw err;
      }
    },
    { connection: redisConnection as any }
  );

  console.log("AI background workers started successfully.");
} else {
  console.log("AI background workers bypassed (Redis is disabled).");
}
