import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://neondb_owner:FqL6z2cKkSWe@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' }
  }
});

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'ashithamariya1998@gmail.com' },
    select: {
      id: true,
      instagramUserId: true,
      instagramUsername: true,
      instagramConnectedAt: true,
      instagramSnapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      instagramAiAnalyses: {
        orderBy: { analyzedAt: 'desc' },
        take: 3
      },
      creatorIntelligences: true,
      creatorOpportunities: { orderBy: { createdAt: 'desc' }, take: 10 },
      hookLibraries: { take: 5 }
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
