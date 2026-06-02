import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function run() {
  const token = process.env.TEST_INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.error("Missing token.");
    process.exit(1);
  }

  // Check /me/permissions endpoint
  const url = `https://graph.instagram.com/me/permissions?access_token=${token}`;
  console.log(`Checking permissions at: ${url.substring(0, 45)}...`);
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("=== Permissions Response ===");
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Failed to query permissions:", err.message);
  }
}

run();
