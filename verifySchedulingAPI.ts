import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'test@example.com' } });
  if (!user) throw new Error("User not found");

  // Force instagram connection to pass validation
  await prisma.user.update({
    where: { id: user.id },
    data: {
      instagramUserId: "test_ig_user_id",
      instagramUsername: "test_ig_user",
      instagramAccessToken: "test_mock_token",
      instagramConnectedAt: new Date(),
      instagramTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    }
  });
  console.log("Instagram mock connection enabled for validation.");

  let token;
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    const data = await res.json();
    token = data.token;
  } catch (err) {
    console.error("Login failed", err);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const brollRes = await fetch(`${API_URL}/broll`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: "Scheduling Test BRoll",
      url: "https://example.com/video.mp4",
      thumbnailUrl: "https://example.com/thumb.jpg",
      format: "video",
      fileSize: 1000,
      duration: 10
    })
  });
  const broll = await brollRes.json();
  console.log("Created broll:", broll.id);

  const postRes = await fetch(`${API_URL}/planner/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: "My Awesome Scheduled Post",
      type: "REEL",
      status: "APPROVED",
      mood: "cinematic",
      date: new Date().toISOString().split('T')[0],
      brollIds: [broll.id]
    })
  });
  const post = await postRes.json();
  console.log("Created post:", post.id);

  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${API_URL}/planner/posts/${post.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ publishAt: futureDate })
  });
  console.log("Updated post with publishAt:", futureDate);

  const scheduleRes = await fetch(`${API_URL}/planner/posts/${post.id}/schedule`, {
    method: 'POST',
    headers
  });
  
  if (!scheduleRes.ok) {
     const text = await scheduleRes.text();
     throw new Error("Failed to schedule: " + text);
  }
  const scheduledPost = await scheduleRes.json();
  console.log("Scheduled Post successfully!", scheduledPost.status, scheduledPost.publishAt);

  console.log("Verification complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
