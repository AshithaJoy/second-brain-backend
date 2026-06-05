const { PrismaClient } = require("@prisma/client");

async function verifyE2EWorker() {
  const baseURL = 'http://localhost:5000';
  let token;
  const prisma = new PrismaClient();

  console.log("--- Starting E2E Scheduling Worker Verification ---");

  // 1. Authenticate / Login
  const loginRes = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test_upload@example.com',
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

  // 2. Connect Instagram locally with mock credentials
  console.log("Connecting Instagram mock credentials...");
  await prisma.user.update({
    where: { email: 'test_upload@example.com' },
    data: {
      instagramUserId: "1234567890",
      instagramUsername: "test_instagram",
      instagramAccessToken: "mock_token",
      instagramTokenExpiresAt: new Date(Date.now() + 86400 * 1000)
    }
  });

  // 3. Create a B-Roll record
  console.log("Creating B-Roll...");
  const brollRes = await fetch(`${baseURL}/api/broll`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'E2E Worker Media',
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

  // 4. Create Post
  console.log("Creating Post...");
  const createRes = await fetch(`${baseURL}/api/planner/posts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: "E2E Worker Test Post",
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
  console.log(`Saving Post with publishAt: ${publishAt}...`);
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
  console.log("Scheduling Post...");
  await fetch(`${baseURL}/api/planner/posts/${post.id}/schedule`, {
    method: 'POST',
    headers: authHeaders
  });

  // 7. Verify PublishingJob created as PENDING
  const job = await prisma.publishingJob.findFirst({
    where: { postId: post.id }
  });
  console.log(`Initial job status in DB: ${job.status}`);
  if (job.status !== "PENDING") {
    throw new Error(`Expected PENDING, got ${job.status}`);
  }

  // 8. Wait for job to process.
  // The worker has attempts: 3, delay: 2 seconds. Let's wait 10 seconds.
  console.log("Waiting 10 seconds for worker to process job...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 9. Query DB and check status
  const finalJob = await prisma.publishingJob.findFirst({
    where: { postId: post.id }
  });
  const finalPost = await prisma.post.findUnique({
    where: { id: post.id }
  });

  console.log(`Final job status in DB: ${finalJob.status}`);
  console.log(`Final job lastError in DB: ${finalJob.lastError}`);
  console.log(`Final post status in DB: ${finalPost.status}`);

  if (finalJob.status === "FAILED" || finalJob.status === "PROCESSING" || finalJob.status === "COMPLETED") {
    console.log("✓ SUCCESS: Job was processed by the worker!");
  } else {
    throw new Error(`FAIL: Job is still PENDING! Status: ${finalJob.status}`);
  }

  await prisma.$disconnect();
}

verifyE2EWorker().catch(async err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
