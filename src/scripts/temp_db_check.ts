import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      instagramUserId: true,
      instagramUsername: true,
      instagramConnectedAt: true,
      instagramAccessToken: true,
    }
  });

  console.log("=== DB Users ===");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
  });
