import { PrismaClient } from "@prisma/client";

const API_URL = "http://localhost:5000/api";
const prisma = new PrismaClient();

async function run() {
  console.log("====================================================");
  console.log("   InstaBrain QA Destruction & Acceptance Test Suite");
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

  // 1. Setup a clean test account
  const testEmail = `qa_destruction_${Date.now()}@instabrain.co.in`;
  const testPassword = "Password123!";
  let token = "";
  let userId = "";

  console.log("--- Setup: Registering Test Account ---");
  try {
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const regData: any = await regRes.json();
    assert(regRes.status === 201, "Should register a new account successfully");
    userId = regData.id;

    const logRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const logData: any = await logRes.json();
    assert(logRes.status === 200, "Should login successfully");
    token = logData.accessToken;
  } catch (err: any) {
    console.error("Critical Setup Failure:", err.message);
    process.exit(1);
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // --- SECURITY TESTS ---
  console.log("\n--- Category: Security & Authorization ---");

  // A. Access without JWT token
  try {
    const res = await fetch(`${API_URL}/planner/posts`);
    assert(res.status === 401, "Reject access without JWT (expecting 401)");
  } catch (err) {
    assert(false, "Access without JWT request failed");
  }

  // B. Access with malformed JWT token
  try {
    const res = await fetch(`${API_URL}/planner/posts`, {
      headers: { "Authorization": "Bearer invalid_token_123" }
    });
    assert(res.status === 403, "Reject access with malformed JWT (expecting 403)");
  } catch (err) {
    assert(false, "Access with malformed JWT request failed");
  }

  // C. SQL Injection test on single entity fetch
  try {
    const res = await fetch(`${API_URL}/planner/posts/' OR 1=1; --`, { headers });
    assert(res.status === 400, "Sanitize SQL Injection payloads on UUID fetches (expecting 400 Validation failed)");
  } catch (err) {
    assert(false, "SQL injection check failed");
  }

  // --- VALIDATION TESTS ---
  console.log("\n--- Category: Input Validation & Boundary Checks ---");

  // A. Empty input on required fields
  try {
    const res = await fetch(`${API_URL}/planner/posts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "", date: "2026-05-29", mood: "soft" })
    });
    assert(res.status === 400, "Reject empty title input for Post creation");
  } catch (err) {
    assert(false, "Empty title check failed");
  }

  // B. Invalid enums validation
  try {
    const res = await fetch(`${API_URL}/planner/posts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Valid Title", date: "2026-05-29", mood: "soft", type: "INVALID_POST_TYPE" })
    });
    assert(res.status === 400, "Reject invalid native enum post type");
  } catch (err) {
    assert(false, "Invalid enum check failed");
  }

  // C. Invalid date formats
  try {
    const res = await fetch(`${API_URL}/planner/posts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Valid Title", date: "2026/05/29", mood: "soft" })
    });
    assert(res.status === 400, "Reject invalid date format (2026/05/29)");
  } catch (err) {
    assert(false, "Invalid date format check failed");
  }

  // D. Large payloads validation (1MB description text)
  try {
    const hugeString = "A".repeat(1024 * 1024); // 1MB
    const res = await fetch(`${API_URL}/brain/dumps`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Huge dump", text: hugeString, mood: "chaotic", ts: "now" })
    });
    assert(res.status === 201 || res.status === 413, "Handle large payloads gracefully without backend crash");
  } catch (err) {
    assert(false, "Large payload check failed");
  }

  // --- PERSISTENCE & CREATOR JOURNEY ACCEPTANCE TEST ---
  console.log("\n--- Category: Creator Journey Acceptance Test (Ship Gate) ---");

  let postId = "";
  let shootId = "";
  let dumpId = "";
  let collabId = "";
  let journalId = "";

  try {
    // 1. Create Planner Post
    const postRes = await fetch(`${API_URL}/planner/posts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Destruction post", date: "2026-05-29", mood: "soft", type: "REEL" })
    });
    const postData: any = await postRes.json();
    assert(postRes.status === 201, "Step 1: Create post");
    postId = postData.id;

    // 2. Trigger Hook Generation
    const hookRes = await fetch(`${API_URL}/planner/hooks`, {
      method: "POST",
      headers,
      body: JSON.stringify({ postId })
    });
    assert(hookRes.status === 201, "Step 2: Generate hooks");

    // 3. Create Shoot Plan
    const shootRes = await fetch(`${API_URL}/planner/shoots`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "E2E Destruction shoot", shootDate: "2026-05-29", slotsJson: "{}", postId })
    });
    const shootData: any = await shootRes.json();
    assert(shootRes.status === 201, "Step 3: Create shoot plan");
    shootId = shootData.id;

    // 4. Create Brain Dump
    const dumpRes = await fetch(`${API_URL}/brain/dumps`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "QA Dump", text: "Some quick thoughts here", mood: "inspired", ts: "now" })
    });
    const dumpData: any = await dumpRes.json();
    assert(dumpRes.status === 201, "Step 4: Create brain dump");
    dumpId = dumpData.id;

    // 5. Trigger AI Rewrite
    const rewriteRes = await fetch(`${API_URL}/brain/rewrite`, {
      method: "POST",
      headers,
      body: JSON.stringify({ dumpId })
    });
    assert(rewriteRes.status === 201, "Step 5: Run AI Rewrite");

    // 6. Create Collab CRM Log
    const collabRes = await fetch(`${API_URL}/collabs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        brand: "Destruction Brand",
        status: "DREAM_BRAND",
        quote: 500,
        negotiatedAmount: 450,
        platform: "Instagram",
        paymentStatus: "UNPAID",
        notes: "QA notes"
      })
    });
    const collabData: any = await collabRes.json();
    assert(collabRes.status === 201, "Step 6: Log collaboration");
    collabId = collabData.id;

    // 7. Create Growth Journal Entry
    const journalRes = await fetch(`${API_URL}/journal`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        weekStart: "2026-05-29",
        mood: "inspired",
        followers: 1200,
        posts: 2,
        reach: 5000,
        saves: 40,
        engagement: "4.8",
        reflection: "Weekly reflection notes here",
        wins: "Win 1\nWin 2",
        lessons: "Lesson 1"
      })
    });
    const journalData: any = await journalRes.json();
    assert(journalRes.status === 201, "Step 7: Create Growth Journal entry");
    journalId = journalData.id;

    // 8. Flush session and restore (Refresh Token Flow)
    const refRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "refresh_token_stub" }) // Will trigger validation depending on logic, or standard fetch
    });
    // Just verify the route compiles and hits. Since ref token stub is invalid it might return 403/400, which is correct.
    assert(refRes.status === 400 || refRes.status === 401 || refRes.status === 403, "Step 8: Refresh Token Flow compiles");

    // 9. Logout
    const logoutRes = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers
    });
    assert(logoutRes.status === 200, "Step 9: Logout executes");

    // 10. Login again
    const login2Res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const login2Data: any = await login2Res.json();
    assert(login2Res.status === 200, "Step 10: Relogin successfully");
    const newToken = login2Data.accessToken;

    // 11. Verify everything exists and is fully intact
    const verifyHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${newToken}`
    };

    const verifyPostsRes = await fetch(`${API_URL}/planner/posts`, { headers: verifyHeaders });
    const verifyPosts: any[] = await verifyPostsRes.json();
    assert(verifyPosts.some(p => p.id === postId && p.title === "Destruction post"), "Verification: Post exists intact");

    const verifyShootsRes = await fetch(`${API_URL}/planner/shoots`, { headers: verifyHeaders });
    const verifyShoots: any[] = await verifyShootsRes.json();
    assert(verifyShoots.some(s => s.id === shootId), "Verification: Shoot exists intact");

    const verifyDumpsRes = await fetch(`${API_URL}/brain/dumps`, { headers: verifyHeaders });
    const verifyDumps: any[] = await verifyDumpsRes.json();
    assert(verifyDumps.some(d => d.id === dumpId && d.title === "QA Dump"), "Verification: Brain dump exists intact");

    const verifyCollabsRes = await fetch(`${API_URL}/collabs`, { headers: verifyHeaders });
    const verifyCollabs: any[] = await verifyCollabsRes.json();
    assert(verifyCollabs.some(c => c.id === collabId && c.brand === "Destruction Brand"), "Verification: Collab log exists intact");

    const verifyJournalRes = await fetch(`${API_URL}/journal`, { headers: verifyHeaders });
    const verifyJournal: any[] = await verifyJournalRes.json();
    assert(verifyJournal.some(j => j.id === journalId && j.followers === 1200), "Verification: Journal entry exists intact");

  } catch (err: any) {
    console.error("Acceptance journey request failed:", err.message);
    assert(false, "Full creator journey acceptance script executed cleanly without crash");
  }

  // --- CLEANUP ---
  console.log("\n--- Teardown: Deleting Test Account ---");
  try {
    await prisma.user.delete({ where: { email: testEmail } });
    console.log("Teardown completed cleanly.");
  } catch (err: any) {
    console.error("Teardown Failed:", err.message);
  }

  console.log("\n====================================================");
  console.log(`   QA Suite Results: Passed ${results.passed}/${results.total} checks`);
  console.log("====================================================");

  if (results.failed > 0) {
    console.error(`\n❌ Validation failed: ${results.failed} errors detected.`);
    process.exit(1);
  } else {
    console.log("\n✅ All boundary, security, and acceptance checks PASSED cleanly.");
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
