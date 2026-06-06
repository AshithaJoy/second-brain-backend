/**
 * One-off recovery script for the incident job.
 * Run with: npx ts-node recover_affected_job.ts
 */
import { instagramPublishQueue } from "./src/config/queues";
import { prisma } from "./src/config/db";

const PUBLISHING_JOB_ID = "bcb71a00-8f37-4878-be4b-c35f6b7ade46";
const POST_ID = "f700caf9-6c81-4526-aa8a-a314c6264a4b";

async function main() {
  if (!instagramPublishQueue) {
    console.error("instagramPublishQueue is not initialised (Redis disabled or connection failed). Aborting.");
    process.exit(1);
  }

  // Verify current state
  const job = await prisma.publishingJob.findUnique({
    where: { id: PUBLISHING_JOB_ID },
    include: { post: true }
  });

  if (!job) {
    console.error(`PublishingJob ${PUBLISHING_JOB_ID} not found in DB.`);
    process.exit(1);
  }

  console.log("Current state:");
  console.log(`  PublishingJob status : ${job.status}`);
  console.log(`  PublishingJob attempts: ${job.attempts}`);
  console.log(`  PublishingJob lastError: ${job.lastError}`);
  console.log(`  Post status          : ${job.post.status}`);
  console.log(`  Post publishAt       : ${job.publishAt}`);

  if (job.status === "COMPLETED") {
    console.log("Job is already COMPLETED. Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  // Reset DB state
  await prisma.$transaction([
    prisma.publishingJob.update({
      where: { id: PUBLISHING_JOB_ID },
      data: { status: "PENDING", attempts: 0, lastError: null }
    }),
    prisma.post.update({
      where: { id: POST_ID },
      data: { status: "SCHEDULED" }
    })
  ]);
  console.log("DB reset to PENDING / SCHEDULED.");

  // Re-enqueue immediately
  await instagramPublishQueue.add(
    "publish-job",
    { jobId: PUBLISHING_JOB_ID, postId: POST_ID },
    { delay: 0, attempts: 3, backoff: { type: "exponential", delay: 60000 } }
  );
  console.log(`Job ${PUBLISHING_JOB_ID} re-enqueued successfully. Worker will process it shortly.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
