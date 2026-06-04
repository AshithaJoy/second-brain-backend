const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const cols = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'User'");
  console.log(JSON.stringify(cols.map(c => c.column_name)));
}
main().finally(() => prisma.$disconnect());
