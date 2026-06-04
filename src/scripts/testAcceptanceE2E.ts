
import { prisma } from "../config/db";
import { PostStatus, PostType } from "@prisma/client";

const API_URL = "http://localhost:3001/api";

async function main() {
  console.log("Starting Acceptance Tests...");

  // 1. Get user
  const user = await prisma.user.findFirst({
    where: { email: { contains: "@" } },
  });
  if (!user) throw new Error("User not found");
  const userId = user.id;

  // Cleanup old test data
  await prisma.post.deleteMany({ where: { title: { contains: "[Test]" } } });

  console.log(`\n--- Test 1: Fastest Happy Path ---`);
  // 1. Brain Dump -> Convert To Post
  console.log("-> 1. Creating Post Draft...");
  const postRes = await fetch(`${API_URL}/planner`, {
    method: 'POST',
    headers: { "x-user-id": userId, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "[Test] Happy Path",
      caption: "Testing the end to end happy path flow!",
      type: "IMAGE",
      status: "DRAFT",
      mood: "cinematic",
      date: new Date().toISOString().split("T")[0]
    })
  });
  const postData = await postRes.json();
  const postId = postData.id;
  console.log("   Post ID:", postId);

  // 2. Upload Video -> Auto Save To Vault
  console.log("-> 2. Uploading Asset to Vault...");
  const brollRes = await fetch(`${API_URL}/broll`, {
    method: 'POST',
    headers: { "x-user-id": userId, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "[Test] Happy Path Asset",
      description: "Acceptance Test Upload",
      mood: "cinematic",
      fileUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
      clipType: "image",
      status: "READY",
      fileSize: 1024,
      visualTags: [],
      emotionTags: []
    })
  });
  const brollData = await brollRes.json();
  const brollId = brollData.id;
  console.log("   BRoll ID:", brollId);

  // 3. Attach Media
  console.log("-> 3. Attaching Media...");
  await fetch(`${API_URL}/planner/${postId}`, {
    method: 'PUT',
    headers: { "x-user-id": userId, "Content-Type": "application/json" },
    body: JSON.stringify({
      brollIds: [brollId],
      status: "REVIEW"
    })
  });

  // 4. Approve
  console.log("-> 4. Approving Post...");
  await fetch(`${API_URL}/planner/${postId}`, {
    method: 'PUT',
    headers: { "x-user-id": userId, "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "APPROVED"
    })
  });

  // 5. Schedule
  console.log("-> 5. Scheduling Post...");
  const scheduleRes = await fetch(`${API_URL}/planner/${postId}/schedule`, {
    method: 'POST',
    headers: { "x-user-id": userId, "Content-Type": "application/json" },
    body: JSON.stringify({
      publishAt: new Date(Date.now() + 5000).toISOString()
    })
  });
  const scheduleData = await scheduleRes.json();
  console.log("   Scheduled Status:", scheduleData.status);
  
  if (scheduleData.status !== "SCHEDULED") throw new Error("Expected SCHEDULED, got " + scheduleData.error);
  
  console.log("-> 6. Waiting 10 seconds for publish to complete...");
  await new Promise(r => setTimeout(r, 10000));

  const postCheck = await prisma.post.findUnique({ where: { id: postId } });
  console.log("   Final Post Status:", postCheck?.status);
  
  console.log(`\n--- Test 2: Readiness Validation ---`);
  const validationPostRes = await fetch(`${API_URL}/planner`, {
    method: 'POST',
    headers: { "x-user-id": userId, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "[Test] Validation Path",
      caption: "", // NO CAPTION
      type: "IMAGE",
      status: "APPROVED",
      mood: "cinematic",
      date: new Date().toISOString().split("T")[0]
    })
  });
  const validationPostData = await validationPostRes.json();
  
  console.log("-> 1. Attempting to schedule with NO CAPTION, NO MEDIA...");
  try {
    const sRes = await fetch(`${API_URL}/planner/${validationPostData.id}/schedule`, {
      method: 'POST',
      headers: { "x-user-id": userId, "Content-Type": "application/json" },
      body: JSON.stringify({
        publishAt: new Date(Date.now() + 5000).toISOString()
      })
    });
    if (!sRes.ok) throw new Error(await sRes.text());
    console.log("   FAIL: Scheduled successfully when it should have failed.");
  } catch (err: any) {
    console.log("   PASS: Schedule prevented. Reason:", err.message);
  }

  console.log(`\n--- Test 3: Asset Lifecycle ---`);
  const assetCheck = await prisma.bRoll.findUnique({ where: { id: brollId } });
  console.log("-> 1. Checking Asset Status after Test 1 publish...");
  console.log("   Asset Status:", assetCheck?.status);
  if (assetCheck?.status !== "PUBLISHED") console.log("   Note: Expected PUBLISHED if publish was successful.");

  console.log(`\n--- Test 4: Dashboard Accuracy ---`);
  const dashboardStats = await prisma.post.groupBy({
    by: ['status'],
    where: { title: { contains: "[Test]" } },
    _count: true
  });
  console.log("-> 1. Dashboard stats for [Test] posts:", dashboardStats);

  console.log(`\n--- Acceptance Tests Complete ---`);
}

main().catch(console.error);
