import { prisma } from "../config/db";

async function backfillCreatorProfiles() {
  const users = await prisma.user.findMany({
    where: { creatorProfile: null },
    select: { id: true, email: true },
  });
  let created = 0;
  let failures = 0;
  for (const user of users) {
    try {
      await prisma.creatorProfile.create({
        data: {
          userId: user.id,
          primaryNiche: "",
          secondaryNiches: JSON.stringify([]),
          primaryGoal: "",
          audienceSize: "",
          creatorStage: "",
          postingFrequency: "",
          preferredFormats: JSON.stringify([]),
          contentPillars: JSON.stringify([]),
          toneOfVoice: "",
          biggestChallenge: "",
          aiAssistanceLevel: "",
        },
      });
      created++;
    } catch (e) {
      console.error(`Failed to create profile for user ${user.id}:`, e);
      failures++;
    }
  }
  console.log(`Backfill complete. Users scanned: ${users.length}, profiles created: ${created}, failures: ${failures}`);
}

backfillCreatorProfiles()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill error", err);
    process.exit(1);
  });
