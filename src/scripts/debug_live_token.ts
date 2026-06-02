import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function run() {
  const token = process.env.TEST_INSTAGRAM_ACCESS_TOKEN;
  const appId = process.env.META_CLIENT_ID;
  const appSecret = process.env.META_CLIENT_SECRET;

  if (!token || !appId || !appSecret) {
    console.error("Missing env vars.");
    process.exit(1);
  }

  const url = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`;
  console.log("Calling debug_token URL...");
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("=== Debug Token Response ===");
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Failed to debug token:", err.message);
  }
}

run();
