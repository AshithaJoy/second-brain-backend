import { PrismaClient } from "@prisma/client";

const prodUrl = "postgresql://neondb_owner:npg_cxCjF32zolTI@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const prisma = new PrismaClient({
  datasources: {
    db: { url: prodUrl }
  }
});

async function main() {
  console.log("Fetching all BRoll records from production...");
  const brolls = await prisma.bRoll.findMany({
    select: {
      id: true,
      visualTags: true,
      emotionTags: true,
      userId: true,
      title: true,
    }
  });

  console.log(`Found ${brolls.length} BRoll records.`);

  const corrupted: any[] = [];

  for (const b of brolls) {
    let visualCorrupted = false;
    let emotionCorrupted = false;

    // Check visualTags
    if (b.visualTags) {
      try {
        const parsed = JSON.parse(b.visualTags);
        if (!Array.isArray(parsed)) {
          visualCorrupted = true;
        }
      } catch (err) {
        visualCorrupted = true;
      }
    }

    // Check emotionTags
    if (b.emotionTags) {
      try {
        const parsed = JSON.parse(b.emotionTags);
        if (!Array.isArray(parsed)) {
          emotionCorrupted = true;
        }
      } catch (err) {
        emotionCorrupted = true;
      }
    }

    if (visualCorrupted || emotionCorrupted) {
      corrupted.push({
        id: b.id,
        title: b.title,
        userId: b.userId,
        visualTags: b.visualTags,
        emotionTags: b.emotionTags,
        visualCorrupted,
        emotionCorrupted,
      });
    }
  }

  console.log(`\nFound ${corrupted.length} corrupted records:`);
  console.log(JSON.stringify(corrupted, null, 2));
}

main()
  .catch(err => {
    console.error("Error finding corrupted records:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
