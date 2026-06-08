const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_cxCjF32zolTI@ep-flat-fire-aq36btx8-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
async function run() {
  const res = await sql`SELECT p.id, p.type, (SELECT json_agg(b.*) FROM "BRoll" b JOIN "_PostBRolls" pb ON b.id = pb."B" WHERE pb."A" = p.id) as brolls FROM "Post" p WHERE p.id IN (SELECT "A" FROM "_PostBRolls") LIMIT 5`;
  console.log(JSON.stringify(res, null, 2));
}
run().catch(console.error);
