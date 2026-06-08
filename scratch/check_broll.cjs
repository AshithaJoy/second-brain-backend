const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_cxCjF32zolTI@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
  const brolls = await sql`SELECT id, "clipType" FROM "BRoll" LIMIT 10`;
  console.log(brolls);
}

main().catch(console.error);
