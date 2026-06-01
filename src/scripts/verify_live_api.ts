import dotenv from "dotenv";
import path from "path";

// Load backend .env configuration
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function verify() {
  const token = process.env.TEST_INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  
  if (!token) {
    console.error("❌ ERROR: No TEST_INSTAGRAM_ACCESS_TOKEN found in environment variables or .env file.");
    console.log("Please define TEST_INSTAGRAM_ACCESS_TOKEN=your_token inside 'second-brain-backend/.env'");
    process.exit(1);
  }

  console.log("====================================================");
  console.log("Checking Instagram Graph API connectivity...");
  console.log(`Token prefix: ${token.substring(0, 10)}...`);
  console.log("====================================================\n");

  try {
    // 1. Fetch Profile
    const profileUrl = `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${token}`;
    console.log(`Fetching profile: ${profileUrl.replace(token, "[MASKED]")}`);
    
    const profileRes = await fetch(profileUrl);
    const profileData: any = await profileRes.json();

    if (!profileRes.ok) {
      console.error("❌ Failed to fetch profile from Instagram API:", profileData);
      process.exit(1);
    }

    console.log("✅ Success: Fetch Profile Response:");
    console.log(JSON.stringify(profileData, null, 2));

    // 2. Fetch Media
    const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${token}`;
    console.log(`\nFetching media: ${mediaUrl.replace(token, "[MASKED]")}`);

    const mediaRes = await fetch(mediaUrl);
    const mediaData: any = await mediaRes.json();

    if (!mediaRes.ok) {
      console.error("❌ Failed to fetch media from Instagram API:", mediaData);
      process.exit(1);
    }

    console.log("✅ Success: Fetch Media Response:");
    console.log(JSON.stringify(mediaData, null, 2));
    
    console.log("\n🎉 API Verification Succeeded! The token is fully functional.");
    process.exit(0);

  } catch (err: any) {
    console.error("❌ API Request Exception:", err.message);
    process.exit(1);
  }
}

verify();
