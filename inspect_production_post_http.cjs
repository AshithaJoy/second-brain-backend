const { neon } = require('@neondatabase/serverless');

const prodUrl = 'postgresql://neondb_owner:FqL6z2cKkSWe@ep-flat-fire-aq36btx8.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(prodUrl);

async function run() {
  console.log("Querying Post via HTTP SQL API (direct)...");
  const posts = await sql`SELECT id, status, "publishAt" FROM "Post" WHERE id = ${'2ecf5768-8788-48e8-9566-2416d8d24061'}`;
  console.log("Post row:", posts);

  const jobs = await sql`SELECT status, attempts, "lastError", "instagramMediaId" FROM "PublishingJob" WHERE "postId" = ${'2ecf5768-8788-48e8-9566-2416d8d24061'}`;
  console.log("Jobs rows:", jobs);
}

run().catch(err => {
  console.error("HTTP Query failed:", err);
  process.exit(1);
});
