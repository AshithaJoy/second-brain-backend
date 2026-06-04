const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const migs = await prisma.$queryRawUnsafe("SELECT * FROM _prisma_migrations ORDER BY finished_at DESC");
  console.log(JSON.stringify(migs, null, 2));
}
main().finally(() => prisma.$disconnect());
