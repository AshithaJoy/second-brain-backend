const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_cxCjF32zolTI@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const STUCK_JOB_ID = '9e1a4e95-0b17-4941-80b3-2bbb51832287';
const POST_ID = '0e2fe95b-7d98-4d19-8f2e-a4b00f7fdcf9';

async function main() {
  console.log('=== Resolving Stuck Job ===\n');
  
  // The stuck job's publishAt (2026-06-06T03:06:00Z) is in the past.
  // The lastError is "ERR max requests limit exceeded" from Upstash (pre-Railway-Redis).
  // The standard retry endpoint would reject it because publishAt is past.
  // Correct resolution: mark the job FAILED so health clears, post stays APPROVED 
  // so the user can re-schedule with a future time.

  const result = await sql`
    UPDATE "PublishingJob"
    SET 
      status = 'FAILED',
      "lastError" = 'Marked FAILED: original publishAt (2026-06-06T03:06:00Z) has passed. Root cause was Upstash ERR max requests limit exceeded (pre-Railway-Redis migration). Please re-schedule the post with a future publishAt.',
      "updatedAt" = NOW()
    WHERE id = ${STUCK_JOB_ID}
    RETURNING id, status, "lastError"
  `;
  console.log('Updated job:', JSON.stringify(result[0], null, 2));

  // Verify post is still APPROVED
  const post = await sql`SELECT id, title, status, "publishAt" FROM "Post" WHERE id = ${POST_ID}`;
  console.log('\nPost status:', JSON.stringify(post[0], null, 2));

  // Final verification: stuck count
  const stuck = await sql`SELECT COUNT(*) as count FROM "PublishingJob" WHERE status = 'STUCK'`;
  console.log('\nRemaining stuck jobs:', stuck[0].count);

  const failed = await sql`SELECT COUNT(*) as count FROM "PublishingJob" WHERE status = 'FAILED'`;
  console.log('Total failed jobs:', failed[0].count);
}

main().catch(console.error);
