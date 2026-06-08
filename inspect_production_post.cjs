const { PrismaClient } = require('@prisma/client');

const prodUrl = 'postgresql://neondb_owner:FqL6z2cKkSWe@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({
  datasources: {
    db: { url: prodUrl }
  }
});

async function run() {
  const post = await prisma.post.findUnique({
    where: { id: '2ecf5768-8788-48e8-9566-2416d8d24061' },
    include: { brolls: true }
  });

  const job = await prisma.publishingJob.findFirst({
    where: { postId: '2ecf5768-8788-48e8-9566-2416d8d24061' }
  });

  console.log("Post in Production DB:", post);
  console.log("PublishingJob in Production DB:", job);
  
  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
