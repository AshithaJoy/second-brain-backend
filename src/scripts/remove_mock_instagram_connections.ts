import { prisma } from "../config/db";

async function main() {
  console.log("=== STARTING MOCK INSTAGRAM CONNECTION CLEANUP ===");

  // Find all users with mock-like Instagram credentials
  const usersToReset = await prisma.user.findMany({
    where: {
      OR: [
        {
          instagramUsername: {
            contains: "mock_creator_partner"
          }
        },
        {
          instagramAccessToken: {
            startsWith: "mock"
          }
        },
        {
          instagramUserId: {
            contains: "mock-ig-id"
          }
        }
      ]
    },
    select: {
      id: true,
      email: true,
      instagramUsername: true,
      instagramUserId: true
    }
  });

  console.log(`Found ${usersToReset.length} user(s) with mock Instagram connections.`);

  if (usersToReset.length === 0) {
    console.log("No mock connections found. Database is already clean!");
    return;
  }

  // Iterate and reset each user's Instagram connection attributes
  let resetCount = 0;
  for (const user of usersToReset) {
    console.log(`Resetting connection for user: ${user.email} (Username: ${user.instagramUsername}, ID: ${user.instagramUserId})`);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        instagramUserId: null,
        instagramUsername: null,
        instagramAccessToken: null,
        instagramConnectedAt: null
      }
    });
    
    resetCount++;
  }

  console.log(`Successfully reset ${resetCount} mock Instagram connection(s).`);
  console.log("=== CLEANUP FINISHED ===");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
