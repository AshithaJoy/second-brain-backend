import { PrismaClient } from '@prisma/client';
import { PlannerService } from './src/modules/planner/planner.service';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found");

  // ensure instagram connection is mocked
  await prisma.user.update({
    where: { id: user.id },
    data: {
      instagramUserId: "test_ig_user_id",
      instagramUsername: "test_ig_user",
      instagramAccessToken: "test_mock_token",
      instagramConnectedAt: new Date(),
      instagramTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    }
  });

  // create broll
  const broll = await prisma.bRoll.create({
    data: {
      userId: user.id,
      title: "Test BRoll",
      description: "Desc",
      mood: "cinematic",
      visualTags: "[]",
      emotionTags: "[]",
      clipType: "video"
    }
  });

  // create post
  const post = await prisma.post.create({
    data: {
      userId: user.id,
      title: "My Production Verified Post",
      type: "REEL",
      status: "APPROVED",
      mood: "cinematic",
      date: new Date().toISOString().split('T')[0],
      publishAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // future
      brolls: { connect: [{ id: broll.id }] }
    }
  });

  console.log("Before Scheduling:", await prisma.post.findUnique({ where: { id: post.id } }));

  // Call the service method as the controller would
  const scheduledPost = await PlannerService.schedulePost(post.id, user.id);
  
  console.log("\n--- POST /api/planner/posts/:id/schedule RESPONSE ---");
  console.log(JSON.stringify(scheduledPost, null, 2));

  console.log("\n--- Example Scheduled Post Record in DB ---");
  const dbRecord = await prisma.post.findUnique({ where: { id: post.id } });
  console.log(JSON.stringify(dbRecord, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
