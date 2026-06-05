const { PrismaClient } = require("@prisma/client");

async function verifyReadinessAndSafeguard() {
  const baseURL = 'http://localhost:5000';
  let token;
  const prisma = new PrismaClient();

  console.log("====================================================");
  console.log("   Readiness & Safeguard E2E Automated Verification ");
  console.log("====================================================\n");

  // 1. Authenticate / Login
  try {
    const regRes = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_safeguard@example.com',
        password: 'Password123!',
        name: 'Safeguard Tester'
      })
    });
    if (regRes.status === 201) {
      console.log("1. Account registered successfully.");
    }
  } catch (e) {
    // ignore
  }

  const loginRes = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test_safeguard@example.com',
      password: 'Password123!'
    })
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status}`);
  }
  const loginData = await loginRes.json();
  token = loginData.accessToken;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  console.log("2. Logged in successfully.");

  // 2. Connect Instagram mock credentials
  console.log("3. Connecting mock Instagram account...");
  await prisma.user.update({
    where: { email: 'test_safeguard@example.com' },
    data: {
      instagramUserId: "1234567890",
      instagramUsername: "mock_tester",
      instagramAccessToken: "mock_token",
      instagramTokenExpiresAt: new Date(Date.now() + 86400 * 1000)
    }
  });

  // 3. Create a B-Roll record
  console.log("4. Creating B-Roll record...");
  const brollRes = await fetch(`${baseURL}/api/broll`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Safeguard Video.mp4',
      description: 'Test media',
      mood: 'cinematic',
      visualTags: ['test'],
      emotionTags: ['happy'],
      clipType: 'video',
      energy: 'soft',
      fileUrl: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
      status: 'READY'
    })
  });
  const broll = await brollRes.json();
  console.log(`   ✓ B-Roll ID: ${broll.id}, clipType: ${broll.clipType}`);

  // 4. Create Post
  console.log("5. Creating Post...");
  const createRes = await fetch(`${baseURL}/api/planner/posts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: "Safeguarded Test Post",
      date: "2026-06-15",
      type: "REEL",
      status: "DRAFT",
      mood: "cinematic",
      caption: "Test caption",
      hashtags: "#test"
    })
  });
  const post = await createRes.json();

  // 5. Save/Update Post to APPROVED and set publishAt 2 seconds in the future
  const publishAt = new Date(Date.now() + 2 * 1000).toISOString();
  console.log(`6. Saving Post with publishAt: ${publishAt}...`);
  await fetch(`${baseURL}/api/planner/posts/${post.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: "APPROVED",
      brollIds: [broll.id],
      publishAt: publishAt,
      caption: "Test caption with video and publish date"
    })
  });

  // 6. Schedule Post
  console.log("7. Scheduling Post...");
  await fetch(`${baseURL}/api/planner/posts/${post.id}/schedule`, {
    method: 'POST',
    headers: authHeaders
  });

  // 7. Verify PublishingJob created as PENDING
  const job = await prisma.publishingJob.findFirst({
    where: { postId: post.id }
  });
  console.log(`   Initial job status in DB: ${job.status}`);

  // 8. Wait for job to process.
  console.log("8. Waiting 10 seconds for worker execution...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 9. Query DB and check status
  console.log("9. Querying final DB states...");
  const finalJob = await prisma.publishingJob.findFirst({
    where: { postId: post.id }
  });
  const finalPost = await prisma.post.findUnique({
    where: { id: post.id }
  });

  console.log(`   Final job status: ${finalJob.status}`);
  console.log(`   Instagram Media ID: ${finalJob.instagramMediaId}`);
  console.log(`   Final post status: ${finalPost.status}`);

  if (finalJob.status === "COMPLETED" && finalPost.status === "PUBLISHED" && finalJob.instagramMediaId.startsWith("mock_ig_media_")) {
    console.log("\n*** ✓ SUCCESS: SAFEGUARD ACTUALLY INTERCEPTED REAL PUBLISH AND COMPLETED SUCCESSFULLY! ***\n");
  } else {
    throw new Error(`FAIL: Job is in state ${finalJob.status}, post in ${finalPost.status}, media ID: ${finalJob.instagramMediaId}`);
  }

  await prisma.$disconnect();
}

verifyReadinessAndSafeguard().catch(async err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
