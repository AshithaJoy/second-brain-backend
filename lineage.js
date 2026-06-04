const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const result = {};

  // 1. User Verification
  const user = await prisma.user.findFirst({
    where: { email: 'ashithamariya1998@gmail.com' }
  });
  
  if (!user) {
    console.log("User not found.");
    return;
  }
  
  result.A = {
    userId: user.id,
    instagramUserId: user.instagramUserId,
    instagramUsername: user.instagramUsername,
    instagramConnectedAt: user.instagramConnectedAt
  };

  // 2. Snapshot Verification
  const snapshots = await prisma.instagramSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });
  
  result.B = {
    snapshotCount: snapshots.length,
    latestSnapshotTimestamp: snapshots.length > 0 ? snapshots[0].createdAt : null,
    mediaCountInsideLatestSnapshot: snapshots.length > 0 ? JSON.parse(snapshots[0].mediaJson || '[]').length : 0
  };

  // 3. Media Verification
  // Note: There is no 'InstagramMedia' table in the Prisma schema. It's stored in InstagramSnapshot.
  result.C = {
    totalSyncedMedia: 'N/A (Stored in Snapshot)',
    latestMediaItem: 'N/A',
    oldestMediaItem: 'N/A'
  };
  
  if (snapshots.length > 0) {
    try {
      const media = JSON.parse(snapshots[0].mediaJson || '[]');
      if (media.length > 0) {
        const sortedMedia = media.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        result.C = {
          totalSyncedMedia: media.length,
          latestMediaItem: sortedMedia[0].timestamp,
          oldestMediaItem: sortedMedia[sortedMedia.length - 1].timestamp
        };
      }
    } catch (e) {}
  }

  // 4. Analysis Verification
  const analysis = await prisma.instagramAIAnalysis.findMany({
    where: { userId: user.id },
    orderBy: { analyzedAt: 'desc' }
  });
  
  result.D = {
    analysisRecordCount: analysis.length,
    analyzedPostCount: new Set(analysis.map(a => a.mediaId)).size,
    analysisVersion: analysis.length > 0 ? analysis[0].aiVersion : null
  };

  // 5. Intelligence Verification
  const intel = await prisma.creatorIntelligence.findFirst({
    where: { userId: user.id }
  });
  
  result.E = {
    exists: !!intel,
    generatedAt: intel?.generatedAt || null,
    confidenceScore: intel?.confidenceScore || null,
    primaryNiche: intel?.primaryNiche || null
  };

  // 6. Opportunity Verification
  const opps = await prisma.creatorOpportunity.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });
  
  result.F = {
    opportunityCount: opps.length,
    latestGeneratedTimestamp: opps.length > 0 ? opps[0].createdAt : null
  };

  // 7. Hook Verification
  const hooks = await prisma.hookLibrary.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  
  result.G = {
    hookCount: await prisma.hookLibrary.count({ where: { userId: user.id } }),
    sampleHookEntries: hooks.map(h => ({ hookText: h.hookText, category: h.hookCategory }))
  };

  fs.writeFileSync('lineage_audit.json', JSON.stringify(result, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
