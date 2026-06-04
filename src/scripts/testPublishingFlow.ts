import { prisma } from "../config/db";
import { PlannerService } from "../modules/planner/planner.service";
import { instagramPublishQueue } from "../config/queues";
import { PostStatus, PostType } from "@prisma/client";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "ashithamariya1998@gmail.com" },
  });

  if (!user) {
    console.error("Test user not found.");
    process.exit(1);
  }

  // 1. Create a test post in APPROVED status
  console.log("Creating test post...");
  const post = await prisma.post.create({
    data: {
      userId: user.id,
      title: "Test Automated Publish via BullMQ",
      caption: "This is an automated test of the BullMQ publishing infrastructure. 🚀",
      type: PostType.IMAGE,
      status: PostStatus.APPROVED,
      mood: "cinematic",
      date: new Date().toISOString().split("T")[0],
      publishAt: new Date(Date.now() + 30 * 1000), // Schedule 30s in the future
    },
  });

  // Attach a mock media asset (image) to satisfy the scheduling validation
  await prisma.bRoll.create({
    data: {
      userId: user.id,
      posts: { connect: { id: post.id } },
      title: "Test Image Asset",
      description: "Test description",
      mood: "cinematic",
      visualTags: "test",
      emotionTags: "test",
      fileUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
      clipType: "image",
    }
  });

  // 2. Schedule the post
  console.log("Scheduling post via PlannerService...");
  const updatedPost = await PlannerService.schedulePost(post.id, user.id);
  console.log("Post scheduled:", updatedPost.status, "at", updatedPost.scheduledAt);

  // 3. Verify Queue Status
  if (instagramPublishQueue) {
    const delayedCount = await instagramPublishQueue.getDelayedCount();
    console.log(`BullMQ Delayed Queue Count: ${delayedCount}`);
  }

  console.log("Test script finished. The worker should pick it up in ~30 seconds.");
}

main().catch(console.error);
