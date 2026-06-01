import dotenv from "dotenv";
import path from "path";

// Load backend .env configuration
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function verifyPregate() {
  const token = process.env.TEST_INSTAGRAM_ACCESS_TOKEN;
  
  if (!token) {
    console.error("❌ ERROR: No TEST_INSTAGRAM_ACCESS_TOKEN found in environment variables or .env file.");
    process.exit(1);
  }

  console.log("====================================================");
  console.log("   Instagram API Pre-Implementation Gate Check      ");
  console.log("====================================================\n");

  const results = {
    step1: false,
    step2: false,
    step3: false,
    permissions: [] as string[],
    userId: "",
    username: ""
  };

  try {
    // 1. Verify GET /me?fields=id,username
    console.log("--- 1. Checking GET /me?fields=id,username ---");
    const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
    const meData: any = await meRes.json();
    
    if (meRes.ok && meData.id && meData.username) {
      console.log(`✅ Success: Connected account ID is ${meData.id}, Username is @${meData.username}`);
      results.step1 = true;
      results.userId = meData.id;
      results.username = meData.username;
    } else {
      console.error("❌ Fail: GET /me failed or returned invalid data:", meData);
    }

    if (results.step1 && results.userId) {
      // 2. Verify GET /{instagram-user-id}/media
      console.log(`\n--- 2. Checking GET /${results.userId}/media ---`);
      const mediaFields = "id,caption,media_type,media_url,permalink,timestamp";
      const mediaRes = await fetch(`https://graph.instagram.com/${results.userId}/media?fields=${mediaFields}&access_token=${token}`);
      const mediaData: any = await mediaRes.json();

      if (mediaRes.ok && Array.isArray(mediaData.data)) {
        console.log(`✅ Success: Returned ${mediaData.data.length} media items.`);
        if (mediaData.data.length > 0) {
          console.log("Sample Media Item Structure:", JSON.stringify(mediaData.data[0], null, 2));
        }
        results.step2 = true;
      } else {
        console.error(`❌ Fail: GET /${results.userId}/media failed:`, mediaData);
      }

      // 3. Verify Account Insights Permissions
      console.log(`\n--- 3. Checking Insights Availability for /${results.userId}/insights ---`);
      // Testing common Instagram insights metrics
      // Note: Insights require Business/Creator account and specific permissions (instagram_basic, instagram_manage_insights).
      const insightsRes = await fetch(`https://graph.instagram.com/${results.userId}/insights?metric=reach&period=day&access_token=${token}`);
      const insightsData: any = await insightsRes.json();

      if (insightsRes.ok) {
        console.log("✅ Success: Insights are available!");
        console.log(JSON.stringify(insightsData, null, 2));
        results.step3 = true;
      } else {
        console.log(`⚠️ Note/Fail: Insights request returned error or is unavailable:`);
        console.log(JSON.stringify(insightsData, null, 2));
        // We'll also try standard permissions check endpoint if applicable, or inspect the error code
        if (insightsData.error && insightsData.error.message) {
          results.permissions.push(`Insight access denied: ${insightsData.error.message}`);
        }
      }
    }

    console.log("\n====================================================");
    console.log("   Gate Verification Summary:                       ");
    console.log(`   1. GET /me: ${results.step1 ? "PASS" : "FAIL"}`);
    console.log(`   2. GET /{id}/media: ${results.step2 ? "PASS" : "FAIL"}`);
    console.log(`   3. GET /{id}/insights: ${results.step3 ? "PASS" : "FAIL"}`);
    console.log("====================================================");

    // If step1 or step2 failed, we must throw an error to trigger report creation
    if (!results.step1 || !results.step2) {
      throw new Error("Pregate verification failed on critical endpoints (profile or media).");
    }

    if (!results.step3) {
      console.warn("⚠️ Warning: Insights endpoint failed. We will document this in the readiness report.");
    }

  } catch (err: any) {
    console.error("\n❌ Pregate Exception:", err.message);
    process.exit(1);
  }
}

verifyPregate();
