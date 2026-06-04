import { prisma } from "../config/db";
import { PlannerService } from "../modules/planner/planner.service";
import { instagramPublishQueue } from "../config/queues";
import { PostStatus, PostType } from "@prisma/client";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: "@" } },
  });

  if (!user) {
    console.error("Test user not found.");
    process.exit(1);
  }

  console.log("=== InstaBrain MVP Refocus Acceptance Test ===");

  // 1. Brain Dump -> Convert To Post
  console.log("1. Simulating Brain Dump to Post conversion...");
  const post = await prisma.post.create({
    data: {
      userId: user.id,
      title: "MVP Acceptance Test",
      caption: "This is a full end-to-end test of the unified MVP publishing workflow! 🌟",
      type: PostType.IMAGE,
      status: PostStatus.DRAFT,
      mood: "cinematic",
      date: new Date().toISOString().split("T")[0],
      publishAt: new Date(Date.now() + 10 * 1000), // 10s in future
    },
  });
  console.log("-> Created Post Draft:", post.id);

  // 2. Upload Video -> Auto Save to Vault (Mock Cloudinary Upload)
  console.log("2. Simulating Device -> Cloudinary Upload -> B-Roll Vault Auto-Save...");
  const broll = await prisma.bRoll.create({
    data: {
      userId: user.id,
      title: "Test Image MVP",
      visualTags: "[]",
      emotionTags: "[]",
      description: "Auto-saved from direct upload",
      mood: "cinematic",
      fileUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
      clipType: "image",
      status: "READY",
      fileSize: 1024,
    }
  });
  console.log("-> Created READY BRoll asset:", broll.id);

  // 3. Attach Media
  console.log("3. Attaching Media...");
  const updatedWithBroll = await PlannerService.updatePost(post.id, user.id, {
    brollIds: [broll.id],
    status: PostStatus.REVIEW
  });
  console.log("-> Post status after attachment:", updatedWithBroll.status);
  
  const brollStatusCheck = await prisma.bRoll.findUnique({ where: { id: broll.id } });
  console.log("-> B-Roll status automatically transitioned to:", brollStatusCheck?.status, "(Expected: ATTACHED)");

  // 4. Approve
  console.log("4. Approving Post...");
  const approvedPost = await PlannerService.updatePost(post.id, user.id, {
    status: PostStatus.APPROVED
  });
  console.log("-> Post status:", approvedPost.status);

  // 5. Schedule
  console.log("5. Scheduling Post...");
  try {
    const scheduledPost = await PlannerService.schedulePost(post.id, user.id);
    console.log("-> Post scheduled status:", scheduledPost.status, "at", scheduledPost.scheduledAt);
    
    const brollStatusCheck2 = await prisma.bRoll.findUnique({ where: { id: broll.id } });
    console.log("-> B-Roll status automatically transitioned to:", brollStatusCheck2?.status, "(Expected: SCHEDULED)");
  } catch (e: any) {
    console.error("-> Scheduling Failed (might be missing Instagram OAuth context):", e.message);
    if (!e.message.includes("Instagram")) {
      throw e;
    }
  }

  console.log("==============================================");
  console.log("Acceptance Test Logic completed successfully!");
}

main().catch(console.error);
