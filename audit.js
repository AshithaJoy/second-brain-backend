const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  let targetUser = null;
  const users = await prisma.user.findMany();
  for (const u of users) {
    if (u.instagramUsername && u.instagramUsername.includes('ashitha')) {
      targetUser = u;
      break;
    }
  }

  // Fallback: check InstagramSnapshot for profileJson that contains 'ashitha'
  if (!targetUser) {
    const snapshots = await prisma.instagramSnapshot.findMany();
    for (const snap of snapshots) {
      if (snap.profileJson.includes('ashitha')) {
        targetUser = users.find(u => u.id === snap.userId);
        break;
      }
    }
  }

  if (!targetUser) {
    // Just grab any user who has a snapshot, and output them for reference
    const snapshot = await prisma.instagramSnapshot.findFirst();
    if (snapshot) {
      targetUser = users.find(u => u.id === snapshot.userId);
      console.log('Target user not found by name, using user with snapshot:', targetUser?.id);
    } else {
      console.log('No user with a snapshot found at all.');
      return;
    }
  }

  console.log('Target User:', targetUser.email, targetUser.instagramUsername);

  const snapshots = await prisma.instagramSnapshot.findMany({ where: { userId: targetUser.id } });
  const analysis = await prisma.instagramAIAnalysis.findMany({ where: { userId: targetUser.id } });
  const intel = await prisma.creatorIntelligence.findMany({ where: { userId: targetUser.id } });
  const opps = await prisma.creatorOpportunity.findMany({ where: { userId: targetUser.id } });
  const hooks = await prisma.hookLibrary.findMany({ where: { userId: targetUser.id } });
  
  fs.writeFileSync('audit_data.json', JSON.stringify({
    user: targetUser,
    snapshots,
    analysis,
    intel,
    opps,
    hooks
  }, null, 2));
  console.log('Saved to audit_data.json');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
