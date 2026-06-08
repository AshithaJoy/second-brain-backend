const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_cxCjF32zolTI@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
async function run() {
  const res = await sql`SELECT id, "clipType" FROM "BRoll" LIMIT 5`;
  console.log(JSON.stringify(res, null, 2));
}
run().catch(console.error);
