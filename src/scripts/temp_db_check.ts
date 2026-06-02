import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      NOT: {
        instagramOAuthState: null
      }
    },
    select: {
      id: true,
      email: true,
      instagramOAuthState: true,
      instagramUserId: true,
      instagramUsername: true,
    }
  });

  console.log("=== Users with OAuth State ===");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
  });
