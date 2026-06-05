const fs = require('fs');
const { PrismaClient } = require("@prisma/client");

const REAL_IG_USER_ID = "27118102357830587";
const REAL_IG_ACCESS_TOKEN = "IGAAOcpF4bRSdBZAFpXUmhScjQwbkVlQjMzNV9uTmd2LWJNRUlPVEZAVWHBfR3NQYjM3ZAGI4MkZATVlFBYUc2OU1oVXNYNGVkdkFUQmJpdGhVMzFDWWFUdzlRaTY1c1RSYWl3VGp2eDRScDBpU3JBSkE5dndGZAW54bnFlTzBKd2FXYwZDZD";

async function runRealIGPublishTest() {
  const baseURL = 'http://localhost:5000';
  let token;
  const prisma = new PrismaClient();

  console.log("====================================================");
  console.log("   InstaBrain MVP E2E Real Instagram Publish Test   ");
  console.log("====================================================\n");

  // 1. Authenticate (Register/Login)
  const email = `real_ig_tester_${Date.now()}@instabrain.co.in`;
  try {
    const regRes = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
        name: 'Real IG Tester'
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
      email,
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

  // 2. Inject Real Instagram Credentials
  console.log("3. Connecting real Instagram credentials in database...");
  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      instagramUserId: REAL_IG_USER_ID,
      instagramUsername: "ashitha_mariya",
      instagramAccessToken: REAL_IG_ACCESS_TOKEN,
      instagramConnectedAt: new Date(),
      instagramTokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000) // 60 days
    }
  });
  console.log(`   ✓ Connected to Instagram: @${updatedUser.instagramUsername} (ID: ${updatedUser.instagramUserId})`);

  // 3. Request Cloudinary Upload Signature
  console.log("4. Fetching Cloudinary upload signature from backend...");
  const sigRes = await fetch(`${baseURL}/api/broll/upload-signature`, {
    method: 'POST',
    headers: authHeaders
  });
  if (!sigRes.ok) {
    throw new Error(`Signature request failed: ${sigRes.status}`);
  }
  const sigData = await sigRes.json();
  const { signature, timestamp, cloudName, apiKey } = sigData;

  // 4. Read real local image and upload to Cloudinary
  console.log("5. Uploading real image asset to Cloudinary...");
  const imagePath = 'C:/Users/HI10148/.gemini/antigravity/scratch/second-brain/startup_5s.png';
  const fileBuffer = fs.readFileSync(imagePath);
  const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
  
  const formData = new FormData();
  formData.append("file", fileBlob, "startup_5s.png");
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", "broll-vault");

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Cloudinary upload failed: ${uploadRes.status} ${errorText}`);
  }
  const uploadData = await uploadRes.json();
  const secureUrl = uploadData.secure_url;
  console.log(`   ✓ Asset uploaded to Cloudinary. URL: ${secureUrl}`);

  // 5. Create B-Roll record as READY
  console.log("6. Creating B-Roll record in database...");
  const brollRes = await fetch(`${baseURL}/api/broll`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Verify Startup Image.png',
      description: "End-to-end real IG publish validation",
      mood: "cinematic",
      visualTags: ["automated", "real-ig"],
      emotionTags: ["happy"],
      clipType: 'image',
      energy: "soft",
      fileUrl: secureUrl,
      thumbnailUrl: secureUrl,
      status: "READY"
    })
  });
  if (!brollRes.ok) {
    throw new Error(`B-Roll creation failed: ${brollRes.status}`);
  }
  const broll = await brollRes.json();
  console.log(`   ✓ B-Roll record created. ID: ${broll.id}, status: ${broll.status}`);

  // Verify DB state
  const dbBRoll = await prisma.bRoll.findUnique({ where: { id: broll.id } });
  console.log(`   Database verification - BRoll Status: ${dbBRoll.status}`);

  // 6. Create Content Planner Post
  console.log("7. Creating Content Planner Post in DRAFT...");
  const createPostRes = await fetch(`${baseURL}/api/planner/posts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: "Real IG Publish MVP Acceptance Test",
      date: new Date().toISOString().split("T")[0],
      type: "IMAGE",
      status: "DRAFT",
      mood: "cinematic",
      caption: "InstaBrain MVP Acceptance Test: Real Instagram Auto-Publish Success! 🚀\n\nNo manual intervention required.",
      hashtags: "#mvp #instabrain #autopublish #indiehackers"
    })
  });
  if (!createPostRes.ok) {
    throw new Error(`Post creation failed: ${createPostRes.status}`);
  }
  const post = await createPostRes.json();
  console.log(`   ✓ Post created. ID: ${post.id}`);

  // 7. Attach Asset and Set to APPROVED with publishAt +12 seconds
  const publishAt = new Date(Date.now() + 12 * 1000).toISOString();
  console.log(`8. Saving Post changes (attaching B-Roll, setting APPROVED, publishAt: ${publishAt})...`);
  const updatePostRes = await fetch(`${baseURL}/api/planner/posts/${post.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: "APPROVED",
      brollIds: [broll.id],
      publishAt: publishAt
    })
  });
  if (!updatePostRes.ok) {
    throw new Error(`Post update failed: ${updatePostRes.status}`);
  }
  const updatedPost = await updatePostRes.json();
  console.log(`   ✓ Post updated on server. status: ${updatedPost.status}, publishAt: ${updatedPost.publishAt}`);

  // Verify DB post status
  const dbPost = await prisma.post.findUnique({
    where: { id: post.id },
    include: { brolls: true }
  });
  console.log(`   Database post status: ${dbPost.status}`);
  console.log(`   Attached B-Roll count: ${dbPost.brolls.length}`);
  console.log(`   Attached B-Roll status: ${dbPost.brolls[0]?.status}`); // should be ATTACHED / READY? Wait, service updates it to SCHEDULED on schedule.

  // 8. Schedule Post
  console.log("9. Scheduling Post via API...");
  const scheduleRes = await fetch(`${baseURL}/api/planner/posts/${post.id}/schedule`, {
    method: 'POST',
    headers: authHeaders
  });
  if (!scheduleRes.ok) {
    const errorText = await scheduleRes.text();
    throw new Error(`Schedule failed: ${scheduleRes.status} ${errorText}`);
  }
  const scheduledPost = await scheduleRes.json();
  console.log(`   ✓ Post scheduled successfully. status: ${scheduledPost.status}`);

  // 9. Verify PublishingJob created in database as PENDING
  console.log("10. Checking database for PublishingJob...");
  const job = await prisma.publishingJob.findFirst({
    where: { postId: post.id }
  });
  if (!job) {
    throw new Error("PublishingJob record was not created in database!");
  }
  console.log(`    ✓ PublishingJob found! ID: ${job.id}`);
  console.log(`    Status: ${job.status}`);
  console.log(`    publishAt: ${job.publishAt}`);

  // 10. Wait for BullMQ worker to process and publish
  console.log("\n11. Waiting 25 seconds for BullMQ worker execution...");
  await new Promise(resolve => setTimeout(resolve, 25000));

  // 11. Fetch final DB state of Post and PublishingJob
  console.log("12. Retrieving final DB state...");
  const finalJob = await prisma.publishingJob.findFirst({
    where: { postId: post.id }
  });
  const finalPost = await prisma.post.findUnique({
    where: { id: post.id }
  });

  console.log(`    Final PublishingJob Status: ${finalJob.status}`);
  console.log(`    Instagram Media ID: ${finalJob.instagramMediaId}`);
  console.log(`    Final Post Status: ${finalPost.status}`);
  if (finalJob.lastError) {
    console.log(`    Job Error (if any): ${finalJob.lastError}`);
  }

  if (finalJob.status === "COMPLETED" && finalPost.status === "PUBLISHED" && finalJob.instagramMediaId) {
    console.log("\n*** 🎉 MVP ACCEPTANCE TEST PASSED SUCCESSFULLY! Real Instagram Publish completed without manual intervention. ***\n");
  } else {
    throw new Error(`Acceptance test failed. Job Status: ${finalJob.status}, Post Status: ${finalPost.status}`);
  }

  await prisma.$disconnect();
}

runRealIGPublishTest().catch(async err => {
  console.error("Verification failed:", err);
  const p = new PrismaClient();
  await p.$disconnect();
  process.exit(1);
});
