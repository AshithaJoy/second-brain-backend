import { PrismaClient } from "@prisma/client";

const API_URL = process.env.API_URL || "http://localhost:5000/api";
const prisma = new PrismaClient();

async function run() {
  console.log("====================================================");
  console.log("   InstaBrain Multi-User Isolation Test Suite       ");
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
  const userAEmail = `userA_${timestamp}@instabrain.co.in`;
  const userBEmail = `userB_${timestamp}@instabrain.co.in`;
  const password = "SecurePassword123!";

  let tokenA = "";
  let userAId = "";
  let tokenB = "";
  let userBId = "";

  console.log("--- Setup: Registering Test Accounts ---");
  try {
    // Register User A
    const regARes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userAEmail, password })
    });
    const regAData = await regARes.json();
    assert(regARes.status === 201, "Register User A");
    userAId = regAData.id;

    // Login User A
    const logARes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userAEmail, password })
    });
    const logAData = await logARes.json();
    tokenA = logAData.accessToken;

    // Register User B
    const regBRes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userBEmail, password })
    });
    const regBData = await regBRes.json();
    assert(regBRes.status === 201, "Register User B");
    userBId = regBData.id;

    // Login User B
    const logBRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userBEmail, password })
    });
    const logBData = await logBRes.json();
    tokenB = logBData.accessToken;
  } catch (err: any) {
    console.error("Test Setup failed:", err.message);
    process.exit(1);
  }

  // Create records for User A in Database
  console.log("\n--- Setup: Seeding User A Records ---");
  let postId = "";
  let shootId = "";
  let dumpId = "";
  let collabId = "";
  let journalId = "";
  let brollId = "";
  let reelId = "";
  let jobId = "";

  try {
    // 1. Post
    const post = await prisma.post.create({
      data: {
        title: "User A Private Post",
        date: "2026-05-29",
        mood: "chill",
        userId: userAId
      }
    });
    postId = post.id;

    // 2. Shoot
    const shoot = await prisma.shoot.create({
      data: {
        name: "User A Shoot",
        shootDate: "2026-05-29",
        slotsJson: "{}",
        userId: userAId
      }
    });
    shootId = shoot.id;

    // 3. Dump
    const dump = await prisma.dump.create({
      data: {
        title: "User A Idea",
        text: "Top secret brain dump",
        mood: "creative",
        ts: "now",
        userId: userAId
      }
    });
    dumpId = dump.id;

    // 4. Collab
    const collab = await prisma.collab.create({
      data: {
        brand: "User A Brand Deal",
        status: "DREAM_BRAND",
        userId: userAId
      }
    });
    collabId = collab.id;

    // 5. Journal Entry
    const journal = await prisma.journalEntry.create({
      data: {
        weekStart: "2026-05-29",
        mood: "happy",
        reflection: "Secret reflection",
        wins: "None",
        lessons: "None",
        userId: userAId
      }
    });
    journalId = journal.id;

    // 6. B-Roll
    const broll = await prisma.bRoll.create({
      data: {
        title: "User A B-Roll",
        description: "Broll details",
        mood: "soft",
        visualTags: "[]",
        emotionTags: "[]",
        userId: userAId
      }
    });
    brollId = broll.id;

    // 7. Reel Breakdown
    const reel = await prisma.reelBreakdown.create({
      data: {
        url: "https://instagram.com/reel/123",
        insightsJson: "[]",
        stepsJson: "[]",
        userId: userAId
      }
    });
    reelId = reel.id;

    // 8. AI Job
    const job = await prisma.aIJob.create({
      data: {
        queueName: "analyze-reel",
        status: "COMPLED",
        userId: userAId
      }
    });
    jobId = job.id;

    console.log("Seeding complete. User A records generated.");
  } catch (err: any) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  }

  // --- MULTI-USER ISOLATION TESTS ---
  console.log("\n--- Category: Tenant Isolation Violations (User B Attempts) ---");
  const headersB = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${tokenB}`
  };

  // 1. Test POST isolation
  try {
    const res = await fetch(`${API_URL}/planner/posts/${postId}`, { headers: headersB });
    assert(res.status === 404, "User B READ User A Post -> 404 Not Found");
  } catch (e) {
    assert(false, "Post Read request failed");
  }

  try {
    const res = await fetch(`${API_URL}/planner/posts/${postId}`, {
      method: "PUT",
      headers: headersB,
      body: JSON.stringify({ title: "Hacked Post", date: "2026-05-29", mood: "chill" })
    });
    assert(res.status === 404, "User B UPDATE User A Post -> 404 Not Found");
  } catch (e) {
    assert(false, "Post Update request failed");
  }

  try {
    const res = await fetch(`${API_URL}/planner/posts/${postId}`, {
      method: "DELETE",
      headers: headersB
    });
    assert(res.status === 404, "User B DELETE User A Post -> 404 Not Found");
  } catch (e) {
    assert(false, "Post Delete request failed");
  }

  // 2. Test SHOOT isolation
  try {
    const res = await fetch(`${API_URL}/planner/shoots/${shootId}`, {
      method: "PUT",
      headers: headersB,
      body: JSON.stringify({ name: "Hacked Shoot", shootDate: "2026-05-29", slotsJson: "{}" })
    });
    assert(res.status === 404, "User B UPDATE User A Shoot -> 404 Not Found");
  } catch (e) {
    assert(false, "Shoot Update request failed");
  }

  try {
    const res = await fetch(`${API_URL}/planner/shoots/${shootId}`, {
      method: "DELETE",
      headers: headersB
    });
    assert(res.status === 404, "User B DELETE User A Shoot -> 404 Not Found");
  } catch (e) {
    assert(false, "Shoot Delete request failed");
  }

  // 3. Test DUMP isolation
  try {
    const res = await fetch(`${API_URL}/brain/dumps/${dumpId}`, { headers: headersB });
    assert(res.status === 404, "User B READ User A Dump -> 404 Not Found");
  } catch (e) {
    assert(false, "Dump Read request failed");
  }

  try {
    const res = await fetch(`${API_URL}/brain/dumps/${dumpId}`, {
      method: "PUT",
      headers: headersB,
      body: JSON.stringify({ title: "Hacked Dump", text: "Some text", mood: "chill", ts: "now" })
    });
    assert(res.status === 404, "User B UPDATE User A Dump -> 404 Not Found");
  } catch (e) {
    assert(false, "Dump Update request failed");
  }

  try {
    const res = await fetch(`${API_URL}/brain/dumps/${dumpId}`, {
      method: "DELETE",
      headers: headersB
    });
    assert(res.status === 404, "User B DELETE User A Dump -> 404 Not Found");
  } catch (e) {
    assert(false, "Dump Delete request failed");
  }

  // 4. Test COLLAB isolation
  try {
    const res = await fetch(`${API_URL}/collabs/${collabId}`, { headers: headersB });
    assert(res.status === 404, "User B READ User A Collab -> 404 Not Found");
  } catch (e) {
    assert(false, "Collab Read request failed");
  }

  try {
    const res = await fetch(`${API_URL}/collabs/${collabId}`, {
      method: "PUT",
      headers: headersB,
      body: JSON.stringify({ brand: "Hacked Brand", status: "DREAM_BRAND" })
    });
    assert(res.status === 404, "User B UPDATE User A Collab -> 404 Not Found");
  } catch (e) {
    assert(false, "Collab Update request failed");
  }

  try {
    const res = await fetch(`${API_URL}/collabs/${collabId}`, {
      method: "DELETE",
      headers: headersB
    });
    assert(res.status === 404, "User B DELETE User A Collab -> 404 Not Found");
  } catch (e) {
    assert(false, "Collab Delete request failed");
  }

  // 5. Test JOURNAL isolation
  try {
    const res = await fetch(`${API_URL}/journal/${journalId}`, { headers: headersB });
    assert(res.status === 404, "User B READ User A Journal Entry -> 404 Not Found");
  } catch (e) {
    assert(false, "Journal Read request failed");
  }

  try {
    const res = await fetch(`${API_URL}/journal/${journalId}`, {
      method: "PUT",
      headers: headersB,
      body: JSON.stringify({ weekStart: "2026-05-29", mood: "sad", reflection: "reflection" })
    });
    assert(res.status === 404, "User B UPDATE User A Journal Entry -> 404 Not Found");
  } catch (e) {
    assert(false, "Journal Update request failed");
  }

  try {
    const res = await fetch(`${API_URL}/journal/${journalId}`, {
      method: "DELETE",
      headers: headersB
    });
    assert(res.status === 404, "User B DELETE User A Journal Entry -> 404 Not Found");
  } catch (e) {
    assert(false, "Journal Delete request failed");
  }

  // 6. Test B-ROLL isolation
  try {
    const res = await fetch(`${API_URL}/broll/${brollId}`, { headers: headersB });
    assert(res.status === 404, "User B READ User A B-Roll -> 404 Not Found");
  } catch (e) {
    assert(false, "B-Roll Read request failed");
  }

  try {
    const res = await fetch(`${API_URL}/broll/${brollId}`, {
      method: "PUT",
      headers: headersB,
      body: JSON.stringify({ title: "Hacked Broll", description: "Broll text", mood: "sad" })
    });
    assert(res.status === 404, "User B UPDATE User A B-Roll -> 404 Not Found");
  } catch (e) {
    assert(false, "B-Roll Update request failed");
  }

  try {
    const res = await fetch(`${API_URL}/broll/${brollId}`, {
      method: "DELETE",
      headers: headersB
    });
    assert(res.status === 404, "User B DELETE User A B-Roll -> 404 Not Found");
  } catch (e) {
    assert(false, "B-Roll Delete request failed");
  }

  // 7. Test REEL isolation (Delete only)
  try {
    const res = await fetch(`${API_URL}/reels/${reelId}`, {
      method: "DELETE",
      headers: headersB
    });
    assert(res.status === 404, "User B DELETE User A Reel Breakdown -> 404 Not Found");
  } catch (e) {
    assert(false, "Reel Breakdown Delete request failed");
  }

  // 8. Test AI Job isolation
  try {
    const res = await fetch(`${API_URL}/ai/job/${jobId}`, { headers: headersB });
    assert(res.status === 404, "User B READ User A AI Job -> 404 Not Found");
  } catch (e) {
    assert(false, "AI Job Read request failed");
  }

  // 9. Enumeration attacks
  try {
    const randomUuid = "abc12345-6789-abcd-ef01-23456789abcd";
    const resPost = await fetch(`${API_URL}/planner/posts/${randomUuid}`, { headers: headersB });
    const resDump = await fetch(`${API_URL}/brain/dumps/${randomUuid}`, { headers: headersB });
    const resCollab = await fetch(`${API_URL}/collabs/${randomUuid}`, { headers: headersB });
    assert(resPost.status === 404 && resDump.status === 404 && resCollab.status === 404, "Enumeration attacks with random UUIDs return 404");
  } catch (e) {
    assert(false, "Enumeration attack tests failed");
  }

  // --- CLEANUP ---
  console.log("\n--- Teardown: Deleting Test Accounts ---");
  try {
    await prisma.user.delete({ where: { email: userAEmail } });
    await prisma.user.delete({ where: { email: userBEmail } });
    console.log("Teardown completed cleanly.");
  } catch (err: any) {
    console.error("Teardown Failed:", err.message);
  }

  console.log("\n====================================================");
  console.log(`   Isolation Test Results: Passed ${results.passed}/${results.total} checks`);
  console.log("====================================================");

  if (results.failed > 0) {
    console.error(`\n❌ Isolation checks failed: ${results.failed} errors detected.`);
    process.exit(1);
  } else {
    console.log("\n✅ All multi-user isolation checks PASSED cleanly.");
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
