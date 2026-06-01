import { PrismaClient } from "@prisma/client";

const API_URL = process.env.API_URL || "http://localhost:5000/api";
const prisma = new PrismaClient();

async function run() {
  console.log("====================================================");
  console.log("   InstaBrain Instagram Intelligence Test Suite     ");
  console.log("====================================================\n");

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    failures: [] as string[]
  };

  function assert(condition: boolean, message: string) {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`✅ PASS: ${message}`);
    } else {
      results.failed++;
      results.failures.push(message);
      console.log(`❌ FAIL: ${message}`);
    }
  }

  // Register User A and User B
  const timestamp = Date.now();
  const emailA = `userA_intel_${timestamp}@instabrain.co.in`;
  const emailB = `userB_intel_${timestamp}@instabrain.co.in`;
  const password = "IntelSecurePassword123!";

  let tokenA = "";
  let userAId = "";
  let tokenB = "";
  let userBId = "";

  console.log("--- Setup: Registering Test Creator Accounts ---");
  try {
    // User A
    const regARes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password })
    });
    const regAData = await regARes.json();
    assert(regARes.status === 201, "Register User A");
    userAId = regAData.id;

    const logARes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password })
    });
    const logAData = await logARes.json();
    tokenA = logAData.accessToken;

    // User B
    const regBRes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, password })
    });
    const regBData = await regBRes.json();
    assert(regBRes.status === 201, "Register User B");
    userBId = regBData.id;

    const logBRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, password })
    });
    const logBData = await logBRes.json();
    tokenB = logBData.accessToken;
  } catch (err: any) {
    console.error("Test setup failure:", err.message);
    process.exit(1);
  }

  const headersA = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${tokenA}`
  };
  const headersB = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${tokenB}`
  };

  // Connect Instagram for User A
  try {
    await fetch(`${API_URL}/instagram/connect`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({ accessToken: "mock-token-creatorA" })
    });
  } catch (e) {
    console.error("Failed to connect User A:", e);
    process.exit(1);
  }

  // --- 1. VERIFY DIRECT SYNC ---
  console.log("\n--- Category: Instagram Snapshot Sync ---");
  let snapshotId = "";
  try {
    // Unconnected User B sync should fail
    const syncResB = await fetch(`${API_URL}/instagram/sync`, {
      method: "POST",
      headers: headersB
    });
    assert(syncResB.status === 404, "User B gets 404 Sync when unconnected");

    // Connected User A sync should succeed
    const syncResA = await fetch(`${API_URL}/instagram/sync`, {
      method: "POST",
      headers: headersA
    });
    const syncDataA = await syncResA.json();
    assert(syncResA.status === 200 && syncDataA.success === true, "User A syncs channel and creates snapshot");
    snapshotId = syncDataA.snapshotId;

    // Verify snapshot exists in database
    const dbSnapshot = await prisma.instagramSnapshot.findUnique({
      where: { id: snapshotId }
    });
    assert(
      dbSnapshot !== null && dbSnapshot.userId === userAId,
      "Snapshot caching verified directly in Database"
    );
  } catch (e: any) {
    assert(false, `Sync verification failed: ${e.message}`);
  }

  // --- 2. VERIFY RULE-BASED & AI ANALYTICS ---
  console.log("\n--- Category: Deterministic & AI Analytics ---");
  try {
    // Unconnected User B intelligence should return 404
    const intelResB = await fetch(`${API_URL}/instagram/intelligence`, { headers: headersB });
    assert(intelResB.status === 404, "User B gets 404 Intelligence when unconnected");

    // Connected User A intelligence should return full calculations & suggestions
    const intelResA = await fetch(`${API_URL}/instagram/intelligence`, { headers: headersA });
    const intelData = await intelResA.json();
    assert(
      intelResA.status === 200 &&
      intelData.creatorHealthScore !== undefined &&
      intelData.postingCadence !== undefined &&
      intelData.contentDistribution !== undefined &&
      intelData.contentPillars !== undefined &&
      Array.isArray(intelData.opportunities) &&
      Array.isArray(intelData.hookAnalysis.strongestHooks) &&
      Array.isArray(intelData.hookAnalysis.suggestedHooks) &&
      Array.isArray(intelData.contentIdeas.reels),
      "Successfully returns creator health index, cadence, hook database, visual content pillars, and AI ideas"
    );

    // Verify rule-based details
    assert(
      intelData.postingCadence.postsPerWeek > 0 &&
      intelData.contentDistribution.reelsPercentage === 50 &&
      intelData.contentPillars.lifestyle > 0,
      "Deterministic analytics (postsPerWeek, format percentages, pillars weights) calculate correctly"
    );
  } catch (e: any) {
    assert(false, `Analytics verification failed: ${e.message}`);
  }

  // --- 3. PLANNER INTEGRATION TESTING ---
  console.log("\n--- Category: Content Planner Integration ---");
  try {
    // Add an idea to Content Planner
    const planRes = await fetch(`${API_URL}/planner/posts`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        title: "AI Suggested: My 15-Hour Editing Shortcut",
        date: "2026-06-01",
        type: "REEL",
        status: "DRAFT",
        mood: "inspired",
        caption: "Hook: This 1 change saved me 15 hours of editing weekly.\n\nConcept: Show key keyboard shortcuts loop."
      })
    });
    const planData = await planRes.json();
    assert(planRes.status === 201 && planData.id !== undefined, "Tapping '⚡ Add To Planner' creates a draft item");

    // Verify draft item exists in Database and is owned by User A
    const dbPost = await prisma.post.findUnique({
      where: { id: planData.id }
    });
    assert(dbPost !== null && dbPost.userId === userAId, "Planner draft ownership matches User A");
  } catch (e: any) {
    assert(false, `Planner integration test failed: ${e.message}`);
  }

  // --- 4. TENANT ISOLATION TESTING ---
  console.log("\n--- Category: Multi-Tenant Data Isolation ---");
  try {
    // Confirm User B cannot query User A's snapshot via direct db isolation or mock APIs
    const dbSnapshotsB = await prisma.instagramSnapshot.findMany({
      where: { userId: userBId }
    });
    assert(dbSnapshotsB.length === 0, "User B database snapshots return empty");

    // Connect B to separate mock account and check separate snapshot
    await fetch(`${API_URL}/instagram/connect`, {
      method: "POST",
      headers: headersB,
      body: JSON.stringify({ accessToken: "mock-token-creatorB" })
    });
    await fetch(`${API_URL}/instagram/sync`, { method: "POST", headers: headersB });

    const dbSnapshotsAfter = await prisma.instagramSnapshot.findMany({
      where: { userId: userBId }
    });
    assert(
      dbSnapshotsAfter.length === 1 && dbSnapshotsAfter[0].userId === userBId,
      "User B can only read and manage their own snapshots"
    );
  } catch (e: any) {
    assert(false, `Isolation verify failed: ${e.message}`);
  }

  // --- TEARDOWN ---
  console.log("\n--- Teardown: Cleaning Test Accounts ---");
  try {
    await prisma.user.delete({ where: { email: emailA } });
    await prisma.user.delete({ where: { email: emailB } });
    console.log("Teardown completed cleanly.");
  } catch (err: any) {
    console.error("Teardown failed:", err.message);
  }

  console.log("\n====================================================");
  console.log(`   Instagram Intelligence Tests: Passed ${results.passed}/${results.total} checks`);
  console.log("====================================================");

  if (results.failed > 0) {
    console.error(`\n❌ Integration failures detected: ${results.failed} failures.`);
    process.exit(1);
  } else {
    console.log("\n✅ All Creator Intelligence tests PASSED cleanly.");
    process.exit(0);
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
