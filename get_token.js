const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:FqL6z2cKkSWe@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const users = await sql`SELECT "id", "email", "instagramAccessToken", "instagramUserId", "instagramUsername" FROM "User" WHERE "email" = 'ashithamariya1998@gmail.com'`;
  console.log(JSON.stringify(users[0], null, 2));
}

main().catch(console.error);
