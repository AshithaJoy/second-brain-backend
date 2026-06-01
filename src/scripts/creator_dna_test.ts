import { PrismaClient } from "@prisma/client";
import { OpenAIService } from "../services/openai/openai.service";

const API_URL = "http://localhost:5000/api";
const prisma = new PrismaClient();

const USER_A_EMAIL = `creator_a_${Date.now()}@secondbrain.ai`;
const USER_B_EMAIL = `creator_b_${Date.now()}@secondbrain.ai`;
const TEST_PASSWORD = "password123";

async function registerAndLogin(email: string): Promise<string> {
  // Register
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD })
  });
  if (regRes.status !== 201) {
    throw new Error(`Failed to register ${email}: status ${regRes.status}`);
  }

  // Login
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD })
  });
  if (loginRes.status !== 200) {
    throw new Error(`Failed to login ${email}: status ${loginRes.status}`);
  }
  const data: any = await loginRes.json();
  return data.accessToken;
}

async function run() {
  console.log("=== STARTING CREATOR DNA ENGINE VALIDATION ===");

  let tokenA = "";
  let tokenB = "";
  let userAId = "";
  let userBId = "";

  try {
    // 1. Authenticate users
    console.log("\n[Step 1] Registering and authenticating Test Creator A and Creator B...");
    tokenA = await registerAndLogin(USER_A_EMAIL);
    tokenB = await registerAndLogin(USER_B_EMAIL);
    
    const meARes = await fetch(`${API_URL}/auth/me`, { headers: { "Authorization": `Bearer ${tokenA}` } });
    const meA: any = await meARes.json();
    userAId = meA.id;

    const meBRes = await fetch(`${API_URL}/auth/me`, { headers: { "Authorization": `Bearer ${tokenB}` } });
    const meB: any = await meBRes.json();
    userBId = meB.id;

    console.log(`Creator A ID: ${userAId}, Creator B ID: ${userBId}`);
    console.log("✅ Users authenticated.");

    // 2. Fetch non-existent profile (Expecting 404)
    console.log("\n[Step 2] Fetching initial profile for Creator A (Expecting 404)...");
    const getRes = await fetch(`${API_URL}/profile`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    console.log(`Get Profile Status: ${getRes.status}`);
    if (getRes.status !== 404) {
      throw new Error(`Expected status 404, but got ${getRes.status}`);
    }
    console.log("✅ Profile correctly not found.");

    // 3. Fetch initial completion status (Expecting score 0, complete false)
    console.log("\n[Step 3] Fetching completion status for Creator A...");
    const statusRes = await fetch(`${API_URL}/profile/completion-status`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const statusBody: any = await statusRes.json();
    console.log("Completion status:", statusBody);
    if (statusBody.complete !== false || statusBody.score !== 0) {
      throw new Error(`Expected complete=false, score=0. Got complete=${statusBody.complete}, score=${statusBody.score}`);
    }
    console.log("✅ Verified initial completion scorecard is 0.");

    // 4. Save profile (Creator DNA Onboarding)
    console.log("\n[Step 4] Creating profile for Creator A (Saving DNA)...");
    const profilePayload = {
      primaryNiche: "Finance",
      secondaryNiches: ["Tech", "Creator Economy"],
      primaryGoal: "Get Brand Deals",
      audienceSize: "10k–50k",
      creatorStage: "Established Creator",
      postingFrequency: "3x Weekly",
      preferredFormats: ["Reels", "Carousels"],
      contentPillars: ["Education", "Case Studies"],
      toneOfVoice: "Bold",
      biggestChallenge: "Consistency",
      aiAssistanceLevel: "Balanced"
    };

    const saveRes = await fetch(`${API_URL}/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify(profilePayload)
    });
    console.log(`Save status: ${saveRes.status}`);
    const profileData: any = await saveRes.json();
    console.log("Saved Profile:", profileData);
    if (saveRes.status !== 201) {
      throw new Error(`Expected status 201, but got ${saveRes.status}`);
    }
    console.log("✅ Profile created successfully.");

    // 5. Fetch updated completion status (Expecting score 100, complete true)
    console.log("\n[Step 5] Re-checking completion status for Creator A...");
    const statusRes2 = await fetch(`${API_URL}/profile/completion-status`, {
      headers: { "Authorization": `Bearer ${tokenA}` }
    });
    const statusBody2: any = await statusRes2.json();
    console.log("Updated status:", statusBody2);
    if (statusBody2.complete !== true || statusBody2.score !== 100) {
      throw new Error(`Expected complete=true, score=100. Got complete=${statusBody2.complete}, score=${statusBody2.score}`);
    }
    console.log("✅ Verified scorecard checks out to 100%.");

    // 6. Tenant Isolation Check
    console.log("\n[Step 6] Testing tenant isolation (Creator B accessing Creator A profile)...");
    const isoRes = await fetch(`${API_URL}/profile`, {
      headers: { "Authorization": `Bearer ${tokenB}` }
    });
    console.log(`Creator B fetch status: ${isoRes.status}`);
    if (isoRes.status !== 404) {
      throw new Error(`Expected Creator B to get 404 for Profile, but got ${isoRes.status}`);
    }
    console.log("✅ Tenant isolation verified. Creator B cannot view Creator A's profile.");

    // 7. Update profile parameters
    console.log("\n[Step 7] Updating profile parameters for Creator A...");
    const updateRes = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenA}`
      },
      body: JSON.stringify({ toneOfVoice: "Luxury" })
    });
    console.log(`Update status: ${updateRes.status}`);
    const updatedBody: any = await updateRes.json();
    console.log("Updated Profile:", updatedBody);
    if (updateRes.status !== 200 || updatedBody.toneOfVoice !== "Luxury") {
      throw new Error("Update check failed.");
    }
    console.log("✅ Profile updated successfully.");

    // 8. Test AI Prompt Personalization
    console.log("\n[Step 8] Verifying AI prompt personalization context injection...");
    const dnaContext = await OpenAIService.getCreatorProfileContext(userAId);
    console.log("Creator DNA Context string:\n", dnaContext);
    
    if (!dnaContext.includes("Primary Niche: Finance") || !dnaContext.includes("Tone of Voice: Luxury") || !dnaContext.includes("AI Assistance Level: Balanced")) {
      throw new Error("DNA prompt injection context mismatch!");
    }
    console.log("✅ Prompt personalization context injected correctly.");

    // 9. Test personalized mock hooks output
    console.log("\n[Step 9] Verifying AI personalization output in mock mode...");
    const hooksResult = await OpenAIService.generateHooks("3 Money Mistakes", "reflective", userAId);
    console.log("Generated personalized hooks:", hooksResult.hooks);
    
    const containsNiche = hooksResult.hooks.some((h: string) => h.toLowerCase().includes("finance"));
    const containsGoal = hooksResult.hooks.some((h: string) => h.toLowerCase().includes("brand deals"));
    const containsTone = hooksResult.hooks.some((h: string) => h.toLowerCase().includes("luxury"));
    
    if (!containsNiche || !containsGoal || !containsTone) {
      throw new Error("Mock hooks did not personalize content with Niche/Goal/Tone parameters!");
    }
    console.log("✅ Personalization verified. Generated content dynamically customized.");

  } catch (err: any) {
    console.error("❌ TEST RUN ENCOUNTERED ERROR:", err.message);
    await cleanup();
    process.exit(1);
  }

  // Cleanup
  await cleanup();
  console.log("\n=== ALL CREATOR DNA TEST CASES PASSED SUCCESSFULLY ===");
}

async function cleanup() {
  console.log("\n[Cleanup] Cleaning up test data from database...");
  try {
    await prisma.user.deleteMany({
      where: { email: { in: [USER_A_EMAIL, USER_B_EMAIL] } }
    });
    console.log("✅ Database cleanup successful.");
  } catch (err: any) {
    console.error("❌ Database cleanup failed:", err.message);
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
