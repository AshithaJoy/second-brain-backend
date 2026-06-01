import { PrismaClient } from "@prisma/client";

const API_URL = process.env.API_URL || "http://localhost:5000/api";
const prisma = new PrismaClient();

async function run() {
  console.log("====================================================");
  console.log("   InstaBrain Instagram Integration Test Suite      ");
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
  const emailA = `userA_ig_${timestamp}@instabrain.co.in`;
  const emailB = `userB_ig_${timestamp}@instabrain.co.in`;
  const password = "IGSecurePassword123!";

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

  // --- CONNECT TESTING ---
  console.log("\n--- Category: Instagram Connection ---");
  try {
    const connRes = await fetch(`${API_URL}/instagram/connect`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({ accessToken: "mock-token-userA-12345" })
    });
    const connData = await connRes.json();
    assert(connRes.status === 200 && connData.success === true, "User A connects Instagram using mock-token");
  } catch (e) {
    assert(false, "User A connect failed");
  }

  // --- TENANT ISOLATION TESTING ---
  console.log("\n--- Category: Multi-Tenant Data Isolation ---");

  // 1. Verify User B cannot access User A's profile when User B is unconnected
  try {
    const res = await fetch(`${API_URL}/instagram/profile`, { headers: headersB });
    assert(res.status === 404, "User B gets 404 Profile (Unconnected) instead of User A profile");
  } catch (e) {
    assert(false, "User B unconnected profile check failed");
  }

  // 2. Verify User B cannot access User A's media when User B is unconnected
  try {
    const res = await fetch(`${API_URL}/instagram/media`, { headers: headersB });
    assert(res.status === 404, "User B gets 404 Media (Unconnected) instead of User A media");
  } catch (e) {
    assert(false, "User B unconnected media check failed");
  }

  // 3. Connect User B and check profiles are isolated
  try {
    await fetch(`${API_URL}/instagram/connect`, {
      method: "POST",
      headers: headersB,
      body: JSON.stringify({ accessToken: "mock-token-userB-98765" })
    });

    const resA = await fetch(`${API_URL}/instagram/profile`, { headers: headersA });
    const profileA = await resA.json();

    const resB = await fetch(`${API_URL}/instagram/profile`, { headers: headersB });
    const profileB = await resB.json();

    assert(profileA.username === "test_creator" && profileB.username === "test_creator", "Both profile lookups return their respective contexts");
    
    // Check in database that User A and User B have separate access tokens stored
    const dbUserA = await prisma.user.findUnique({ where: { id: userAId } });
    const dbUserB = await prisma.user.findUnique({ where: { id: userBId } });
    assert(
      dbUserA?.instagramAccessToken === "mock-token-userA-12345" &&
      dbUserB?.instagramAccessToken === "mock-token-userB-98765",
      "Correct token isolation verified directly in database"
    );
  } catch (e: any) {
    assert(false, `Isolation verify failed: ${e.message}`);
  }

  // --- RETRIEVAL LOGIC TESTING ---
  console.log("\n--- Category: Profile & Media Retrieval ---");
  try {
    const resProfile = await fetch(`${API_URL}/instagram/profile`, { headers: headersA });
    const profile = await resProfile.json();
    assert(resProfile.status === 200 && profile.id === "17841405309208365", "Successfully fetch connected profile details");

    const resMedia = await fetch(`${API_URL}/instagram/media`, { headers: headersA });
    const media = await resMedia.json();
    assert(resMedia.status === 200 && Array.isArray(media.data) && media.data.length > 0, "Successfully fetch connected media items");
  } catch (e) {
    assert(false, "Profile/Media retrieval tests failed");
  }

  // --- DISCONNECT TESTING ---
  console.log("\n--- Category: Disconnection ---");
  try {
    const discRes = await fetch(`${API_URL}/instagram/disconnect`, {
      method: "DELETE",
      headers: headersA
    });
    assert(discRes.status === 200, "User A disconnect executes successfully");

    const checkRes = await fetch(`${API_URL}/instagram/profile`, { headers: headersA });
    assert(checkRes.status === 404, "User A fetching profile post-disconnect returns 404");
  } catch (e) {
    assert(false, "Disconnection check failed");
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
  console.log(`   Instagram Integration Tests: Passed ${results.passed}/${results.total} checks`);
  console.log("====================================================");

  if (results.failed > 0) {
    console.error(`\n❌ Integration failures detected: ${results.failed} failures.`);
    process.exit(1);
  } else {
    console.log("\n✅ All Meta/Instagram Integration tests PASSED cleanly.");
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
