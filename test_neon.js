const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:FqL6z2cKkSWe@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  const cols = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY column_name");
  console.log(JSON.stringify(cols.map(c => c.column_name), null, 2));
}

main().finally(() => prisma.$disconnect());
