const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_cxCjF32zolTI@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
  // 1. Verify repaired broll record
  const rows = await sql`SELECT id, title, "visualTags", "emotionTags" FROM "BRoll" WHERE id = '3af989f0-a182-4b8f-adb8-70aabd3bb4fc'`;
  console.log('=== Repaired BRoll Record ===');
  console.log(JSON.stringify(rows[0], null, 2));

  // 2. Check all brolls for any remaining malformed tags
  const allBrolls = await sql`SELECT id, title, "visualTags", "emotionTags" FROM "BRoll"`;
  const malformed = allBrolls.filter(r => {
    try { JSON.parse(r.visualTags); JSON.parse(r.emotionTags); return false; }
    catch { return true; }
  });
  console.log('\n=== Malformed Records Remaining ===', malformed.length);
  if (malformed.length > 0) malformed.forEach(r => console.log(r));

  // 3. Check stuck job status
  const jobs = await sql`SELECT id, status, attempts, "lastError", "postId", "publishAt" FROM "PublishingJob" WHERE id = '9e1a4e95-0b17-4941-80b3-2bbb51832287'`;
  console.log('\n=== Stuck Job ===');
  console.log(JSON.stringify(jobs[0], null, 2));

  // 4. Check post status for stuck job
  const posts = await sql`SELECT id, title, status, "publishAt", "scheduledAt" FROM "Post" WHERE id = '0e2fe95b-7d98-4d19-8f2e-a4b00f7fdcf9'`;
  console.log('\n=== Associated Post ===');
  console.log(JSON.stringify(posts[0], null, 2));
}

main().catch(console.error);
