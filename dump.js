const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  const media = await prisma.instagramMedia.findMany();
  const analysis = await prisma.instagramAIAnalysis.findMany();
  const intel = await prisma.creatorIntelligence.findMany();
  const opps = await prisma.creatorOpportunity.findMany();
  const hooks = await prisma.hookLibrary.findMany();
  
  fs.writeFileSync('db_dump.json', JSON.stringify({
    users, media, analysis, intel, opps, hooks
  }, null, 2));
}
main()
  .catch(e => fs.writeFileSync('db_dump_err.txt', String(e)))
  .finally(() => prisma.$disconnect());
