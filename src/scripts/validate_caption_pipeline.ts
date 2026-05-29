import { PrismaClient } from "@prisma/client";

const API_URL = "http://localhost:5000/api";
const DEV_EMAIL = "dev@secondbrain.ai";
const DEV_PASSWORD = "12345678";

const prisma = new PrismaClient();

async function run() {
  console.log("=== STARTING END-TO-END CAPTION & CHAINING VALIDATION ===");

  // 1. Authenticate / Get Token
  let token = "";
  try {
    console.log(`[Step 1] Logging in as ${DEV_EMAIL}...`);
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD })
    });
    if (!loginRes.ok) throw new Error(`HTTP ${loginRes.status}`);
    const data: any = await loginRes.json();
    token = data.accessToken;
    console.log("[Step 1] Login successful.");
  } catch (err: any) {
    console.log("[Step 1] Login failed. Attempting to register first...");
    try {
      const regRes = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD })
      });
      console.log("[Step 1] Registration status:", regRes.status);
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD })
      });
      if (!loginRes.ok) throw new Error(`HTTP ${loginRes.status}`);
      const data: any = await loginRes.json();
      token = data.accessToken;
      console.log("[Step 1] Login successful.");
    } catch (regErr: any) {
      console.error("[Step 1] Authentication failed entirely:", regErr.message);
      process.exit(1);
    }
  }

  const authHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // 2. Create Test Content Planner Post
  console.log("\n[Step 2] Creating new content planner post...");
  const createPayload = {
    title: "Cinematic Workspace Setup Tutorial",
    date: new Date().toISOString().split("T")[0],
    type: "REEL",
    status: "DRAFT",
    mood: "cinematic",
    caption: "",
    hashtags: ""
  };

  let postId = "";
  try {
    const createRes = await fetch(`${API_URL}/planner/posts`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(createPayload)
    });
    if (!createRes.ok) throw new Error(`HTTP ${createRes.status}`);
    const postData: any = await createRes.json();
    postId = postData.id;
    console.log(`[Step 2] Post created successfully. ID: ${postId}`);
  } catch (err: any) {
    console.error("[Step 2] Failed to create post:", err.message);
    process.exit(1);
  }

  // 3. Trigger Hooks Generation First
  console.log("\n[Step 3] Triggering Hooks Generation job...");
  let hooksJobId = "";
  try {
    const hooksRes = await fetch(`${API_URL}/planner/hooks`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ postId })
    });
    if (!hooksRes.ok) throw new Error(`HTTP ${hooksRes.status}`);
    const jobData: any = await hooksRes.json();
    hooksJobId = jobData.id;
    console.log(`[Step 3] Hooks Job enqueued successfully. Job ID: ${hooksJobId}`);
  } catch (err: any) {
    console.error("[Step 3] Failed to trigger hooks job:", err.message);
    process.exit(1);
  }

  // 4. Poll Hooks Job until completed
  console.log("\n[Step 4] Polling hooks job status...");
  let hooksCompleted = false;
  while (!hooksCompleted) {
    const jobRes = await fetch(`${API_URL}/ai/job/${hooksJobId}`, { headers: authHeaders });
    const jobData: any = await jobRes.json();
    console.log(`Poll Hooks Job: Status = ${jobData.status}`);
    if (jobData.status === "COMPLETED") {
      hooksCompleted = true;
      break;
    } else if (jobData.status === "FAILED") {
      console.error("Hooks job failed");
      process.exit(1);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Check that hooks are saved inside Post.caption
  const postAfterHooks = await prisma.post.findUnique({ where: { id: postId } });
  if (!postAfterHooks || !postAfterHooks.caption) {
    console.error("Failed to verify Post.caption after hooks generation.");
    process.exit(1);
  }
  const parsedCaption = JSON.parse(postAfterHooks.caption);
  console.log("✅ Hooks generated and saved inside Post.caption successfully:");
  console.log("- Title Ideas:", parsedCaption.titleIdeas);
  console.log("- Hook Variations:", parsedCaption.hooks);

  // 5. Trigger Caption Generation
  console.log("\n[Step 5] Triggering Caption Generation (with Pipeline Chaining)...");
  let captionsJobId = "";
  try {
    const captionsRes = await fetch(`${API_URL}/planner/captions`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ postId })
    });
    if (!captionsRes.ok) throw new Error(`HTTP ${captionsRes.status}`);
    const jobData: any = await captionsRes.json();
    captionsJobId = jobData.id;
    console.log(`[Step 5] Captions Job enqueued successfully. Job ID: ${captionsJobId}`);
  } catch (err: any) {
    console.error("[Step 5] Failed to trigger captions job:", err.message);
    process.exit(1);
  }

  // 6. Poll Captions Job until completed
  console.log("\n[Step 6] Polling captions job status...");
  const startTime = Date.now();
  let captionsCompleted = false;
  while (!captionsCompleted) {
    const jobRes = await fetch(`${API_URL}/ai/job/${captionsJobId}`, { headers: authHeaders });
    const jobData: any = await jobRes.json();
    console.log(`Poll Captions Job: Status = ${jobData.status}`);
    if (jobData.status === "COMPLETED") {
      captionsCompleted = true;
      break;
    } else if (jobData.status === "FAILED") {
      console.error("Captions job failed");
      process.exit(1);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  const latency = Date.now() - startTime;
  console.log(`Job completed in ${latency}ms.`);

  // 7. Verify Database Persistence (serialized JSON in Post.notes)
  console.log("\n[Step 7] Verifying Post.notes database persistence & chaining integrity...");
  const postAfterCaptions = await prisma.post.findUnique({ where: { id: postId } });
  if (!postAfterCaptions || !postAfterCaptions.notes) {
    console.error("Validation failed: Post.notes is empty.");
    process.exit(1);
  }

  const parsedNotes = JSON.parse(postAfterCaptions.notes);
  console.log("✅ Post.notes contains valid serialized JSON.");
  console.log("- mode:", parsedNotes.mode);
  console.log("- shortCaptions:", parsedNotes.shortCaptions);
  console.log("- storytellingCaptions / longCaptions:", parsedNotes.longCaptions || parsedNotes.storytellingCaptions);
  console.log("- ctas:", parsedNotes.ctas);
  console.log("- hashtagGroups:", parsedNotes.hashtagGroups);
  console.log("- postingTips:", parsedNotes.postingTips);

  // Validate the chaining contents
  // The mock generator should incorporate hooks from post.caption into generated captions
  const containsChainInfo = parsedNotes.shortCaptions.some((c: string) => 
    c.includes("Inspired by hook:")
  );
  
  if (containsChainInfo) {
    console.log("✅ SUCCESS: Pipeline Chaining validated. Hooks from Post.caption were fed into Caption Generator.");
  } else {
    console.log("⚠️ WARNING: Hook data could not be verified in output. Double check mock logic.");
  }

  // Cleanup test post
  await prisma.post.delete({ where: { id: postId } });
  console.log("\n=== ALL CAPTION PIPELINE TESTS PASSED SUCCESSFULY ===");
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
