import { Queue } from "bullmq";
import { prisma } from "../config/db";
import { OpenAIService } from "../services/openai/openai.service";
import { InstagramService } from "../services/instagram/instagram.service";

export async function safeEnqueue(
  queue: Queue | null,
  jobName: string,
  data: any,
  opts?: any
) {
  // Check if Redis connection is ready
  const isRedisReady =
    queue &&
    queue.opts.connection &&
    (queue.opts.connection as any).status === "ready";

  if (queue && isRedisReady) {
    try {
      return await queue.add(jobName, data, opts);
    } catch (err) {
      console.warn(
        `[Queue: ${queue.name}] Redis add failed, falling back to in-memory processing:`,
        err
      );
    }
  }

  // Fallback: Process in-memory asynchronously to keep the server responsive
  const queueName = queue
    ? queue.name
    : jobName.split("-").slice(0, 2).join("-") || "unknown";

  console.log(
    `[Queue: ${queueName}] (Mock Mode - Redis Disabled) Processing job in-memory for job ID ${data.jobId}`
  );

  setTimeout(async () => {
    try {
      const jobId = data.jobId;
      if (queueName === "rewrite-dump") {
        const result = await OpenAIService.rewriteDump(data.title, data.text, data.userId);
        await prisma.dump.update({
          where: { id: data.dumpId },
          data: {
            title: result.title,
            text: JSON.stringify(result),
            ts: "just now",
          },
        });
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(result),
          },
        });
      } else if (queueName === "generate-hooks") {
        const result = await OpenAIService.generateHooks(data.title, data.mood, data.userId);

        await prisma.post.update({
          where: { id: data.postId },
          data: { caption: JSON.stringify(result) },
        });
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(result),
          },
        });
      } else if (queueName === "generate-pitch") {
        const result = await OpenAIService.generatePitch(
          data.brandName,
          data.profileUrl,
          data.niche
        );
        await prisma.$transaction(async (tx) => {
          await tx.deliverable.deleteMany({ where: { collabId: data.collabId } });
          await tx.collab.update({
            where: { id: data.collabId },
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
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(result),
          },
        });
      } else if (queueName === "scan-brand") {
        const niche = data.niche;
        let mockProfiles = [];
        if (niche === "minimalist-productivity") {
          mockProfiles = [
            "https://instagram.com/focusflow.io",
            "https://instagram.com/monojournals",
          ];
        } else if (niche === "aesthetic-lifestyle") {
          mockProfiles = [
            "https://instagram.com/norselinen",
            "https://instagram.com/meltandmist",
          ];
        } else {
          mockProfiles = [
            "https://instagram.com/stackdev",
            "https://instagram.com/glassnote",
          ];
        }

        const results = [];
        for (const url of mockProfiles) {
          const profile = await InstagramService.getBrandProfile(url);
          const collab = await prisma.collab.create({
            data: {
              brand: profile.fullName || profile.username,
              contactName: "Partnership Team",
              email: `collabs@${profile.username}.com`,
              platform: "Instagram",
              status: "DREAM_BRAND",
              notes: `AI Brand Discovery Scan: ${profile.biography} Profile followers: ${profile.followersCount}.`,
              userId: data.userId,
            },
          });
          results.push(collab);
        }
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify({ brandsDiscovered: results }),
          },
        });
      } else if (queueName === "analyze-reel") {
        const analysis = await OpenAIService.breakdownReel(data.url);
        await prisma.reelBreakdown.create({
          data: {
            url: data.url,
            insightsJson: JSON.stringify(analysis.insights),
            stepsJson: JSON.stringify(analysis.steps),
            userId: data.userId,
          },
        });
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(analysis),
          },
        });
      } else if (queueName === "generate-captions") {
        const post = await prisma.post.findUnique({ where: { id: data.postId } });
        let hooksData = null;
        if (post && post.caption) {
          try {
            const parsed = JSON.parse(post.caption);
            if (parsed && typeof parsed === "object" && Array.isArray(parsed.hooks)) {
              hooksData = parsed;
            }
          } catch (e) {}
        }
        const result = await OpenAIService.generateCaptions(data.title, data.mood, hooksData, data.userId);
        await prisma.post.update({
          where: { id: data.postId },
          data: { notes: JSON.stringify(result) },
        });
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(result),
          },
        });
      }
      console.log(
        `[Queue: ${queueName}] (Mock Mode) Job ID ${jobId} completed successfully.`
      );
    } catch (err: any) {
      console.error(`[Queue: ${queueName}] (Mock Mode) Job failed:`, err);
      try {
        await prisma.aIJob.update({
          where: { id: data.jobId },
          data: {
            status: "FAILED",
            resultJson: JSON.stringify({ error: err.message || "Failed" }),
          },
        });
      } catch (dbErr) {
        console.error("Failed to update failed job status in DB:", dbErr);
      }
    }
  }, 100);

  return { id: data.jobId } as any;
}
