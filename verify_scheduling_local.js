const { PrismaClient } = require("@prisma/client");

async function testSchedulingFlow() {
  const baseURL = 'http://localhost:5000';
  let token;
  const prisma = new PrismaClient();

  console.log("--- Starting Local Scheduling Flow Verification ---");

  // 1. Authenticate
  try {
    const regRes = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_upload@example.com',
        password: 'Password123!',
        name: 'Upload Tester'
      })
    });
    if (regRes.status === 201) {
      console.log("1. Account registered successfully.");
    }
  } catch (e) {
    // ignore if already exists
  }

  const loginRes = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test_upload@example.com',
      password: 'Password123!'
    })
  });
  if (!loginRes.ok) {
    const errorText = await loginRes.text();
    throw new Error(`Login failed: ${loginRes.status} ${errorText}`);
  }
  const loginData = await loginRes.json();
  token = loginData.accessToken;
  console.log("2. Logged in successfully. Token received.");

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Connect Instagram locally (needed to pass schedule validation)
  console.log("3. Connecting Instagram locally...");
  await prisma.user.update({
    where: { email: 'test_upload@example.com' },
    data: {
      instagramUserId: "1234567890",
      instagramUsername: "test_instagram",
      instagramAccessToken: "mock_token",
      instagramTokenExpiresAt: new Date(Date.now() + 86400 * 1000) // 1 day future
    }
  });
  console.log("   ✓ Instagram connected mock data injected.");

  // 3. Create a B-Roll record
  console.log("4. Creating B-Roll record...");
  const brollRes = await fetch(`${baseURL}/api/broll`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Verify Scheduling Media',
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
  if (!brollRes.ok) {
    const errorText = await brollRes.text();
    throw new Error(`Failed to create B-Roll: ${brollRes.status} ${errorText}`);
  }
  const broll = await brollRes.json();
  console.log(`   ✓ B-Roll created. ID: ${broll.id}`);

  // 4. Create Post
  console.log("5. Creating Post in DRAFT...");
  const createRes = await fetch(`${baseURL}/api/planner/posts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: "Scheduling Test Post",
      date: "2026-06-15",
      type: "REEL",
      status: "DRAFT",
      mood: "cinematic",
      caption: "Test caption",
      hashtags: "#test"
    })
  });
  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Create post failed: ${createRes.status} ${errorText}`);
  }
  const post = await createRes.json();
  console.log(`   ✓ Post created. ID: ${post.id}`);

  // 5. Update Post (Approved, attach B-Roll, set publishAt)
  const publishAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes in future
  console.log(`6. Saving Post: status=APPROVED, brollIds=[${broll.id}], publishAt=${publishAt}...`);
  const updateRes = await fetch(`${baseURL}/api/planner/posts/${post.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: "APPROVED",
      brollIds: [broll.id],
      publishAt: publishAt,
      caption: "Test caption with video and publish date"
    })
  });
  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    throw new Error(`Update post failed: ${updateRes.status} ${errorText}`);
  }
  const updatedPost = await updateRes.json();
  console.log("   ✓ Post saved on server.");

  // 6. Query DB directly to verify persistence
  console.log("7. Querying DB directly to check if publishAt is persisted...");
  const dbPost = await prisma.post.findUnique({
    where: { id: post.id }
  });
  console.log("   DB publishAt:", dbPost.publishAt);
  if (!dbPost.publishAt) {
    throw new Error("FAIL: publishAt is NULL in database!");
  }
  console.log("   ✓ SUCCESS: publishAt is persisted in database!");

  // 7. Schedule Post
  console.log("8. Calling schedule endpoint /posts/:id/schedule...");
  const scheduleRes = await fetch(`${baseURL}/api/planner/posts/${post.id}/schedule`, {
    method: 'POST',
    headers: authHeaders
  });
  console.log(`   Response Status: ${scheduleRes.status}`);
  if (!scheduleRes.ok) {
    const errorText = await scheduleRes.text();
    throw new Error(`Schedule post failed: ${scheduleRes.status} ${errorText}`);
  }
  const scheduledPost = await scheduleRes.json();
  console.log("   ✓ Post scheduled successfully. DB Status:", scheduledPost.status);

  // 8. Verify PublishingJob created
  console.log("9. Checking if PublishingJob is created in DB...");
  const job = await prisma.publishingJob.findFirst({
    where: { postId: post.id }
  });
  if (!job) {
    throw new Error("FAIL: PublishingJob not found in database!");
  }
  console.log(`   ✓ Found PublishingJob! ID: ${job.id}, status: ${job.status}, publishAt: ${job.publishAt}`);

  console.log("\n*** ALL LOCAL SCHEDULING TESTS PASSED SUCCESSFULLY! ***\n");
  await prisma.$disconnect();
}

testSchedulingFlow().catch(async err => {
  console.error("Test failed:", err);
  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  await p.$disconnect();
  process.exit(1);
});
