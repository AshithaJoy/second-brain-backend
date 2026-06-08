const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_cxCjF32zolTI@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const JOB_ID = '1c82e93e-d332-4162-b6b9-d7060b0aa8d6';
const POST_ID = 'b5c1e552-4a97-453f-b42a-d1fc0f59ffc6';

async function main() {
  const jobs = await sql`SELECT id, status, attempts, "lastError", "instagramMediaId", "publishAt", "createdAt", "updatedAt" FROM "PublishingJob" WHERE id = ${JOB_ID}`;
  console.log('=== Publishing Job ===');
  console.log(JSON.stringify(jobs[0], null, 2));

  const posts = await sql`SELECT id, title, status, "publishAt" FROM "Post" WHERE id = ${POST_ID}`;
  console.log('\n=== Post Status ===');
  console.log(JSON.stringify(posts[0], null, 2));
}

main().catch(console.error);
