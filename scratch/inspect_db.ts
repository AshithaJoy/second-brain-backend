import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching all publishing jobs from DB...");
  const jobs = await prisma.publishingJob.findMany({
    include: { post: true }
  });

  console.log(`Found ${jobs.length} jobs.`);
  for (const job of jobs) {
    console.log(`Job ID: ${job.id}`);
    console.log(`  Post Title: "${job.post.title}" (ID: ${job.postId})`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Attempts: ${job.attempts}`);
    console.log(`  LastError: ${job.lastError}`);
    console.log(`  PublishAt: ${job.publishAt}`);
    console.log(`  CreatedAt: ${job.createdAt}`);
    console.log(`  UpdatedAt: ${job.updatedAt}`);
    console.log("---------------------------------------");
  }
}

main()
  .catch(err => {
    console.error("Error inspecting DB:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
