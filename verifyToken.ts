import fetch from 'node-fetch';
import 'dotenv/config';

const TOKEN = process.env.TEST_INSTAGRAM_ACCESS_TOKEN;
const APP_ID = process.env.META_CLIENT_ID;
const APP_SECRET = process.env.META_CLIENT_SECRET;

async function main() {
  console.log("Token Prefix:", TOKEN!.substring(0, 10));

  // 1. GET /me (Instagram Graph/Basic Display)
  console.log("\n--- GET /me ---");
  const meUrl = `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${TOKEN}`;
  const meRes = await fetch(meUrl);
  console.log(await meRes.text());

  // 2. GET /debug_token (Facebook Graph)
  console.log("\n--- GET /debug_token ---");
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${TOKEN}&access_token=${APP_ID}|${APP_SECRET}`;
  const debugRes = await fetch(debugUrl);
  console.log(await debugRes.text());
}

main().catch(console.error);
