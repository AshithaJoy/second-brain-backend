import fetch from 'node-fetch';
import 'dotenv/config';

const TOKEN = process.env.TEST_INSTAGRAM_ACCESS_TOKEN;

async function getIgUserId() {
  const url = `https://graph.instagram.com/me?fields=id,username&access_token=${TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error("Failed to get IG user id: " + JSON.stringify(data));
  return data.id;
}

async function publishImage(igUserId: string) {
  const imageUrl = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"; // Reliable public image
  const caption = "Testing InstaBrain automated scheduling via API 🚀 #developer #test";

  console.log(`\n--- TEST: PUBLISH IMAGE ---`);
  
  // 1. Create Container
  const createUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${TOKEN}`;
  console.log("Request: POST /media (IMAGE)");
  const createRes = await fetch(createUrl, { method: 'POST' });
  const createData = await createRes.json();
  console.log("Response:", createData);

  if (createData.error) return;

  const creationId = createData.id;

  // 2. Publish Media
  const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${creationId}&access_token=${TOKEN}`;
  console.log(`Request: POST /media_publish (creation_id: ${creationId})`);
  const publishRes = await fetch(publishUrl, { method: 'POST' });
  const publishData = await publishRes.json();
  console.log("Response:", publishData);

  if (publishData.id) {
    console.log(`SUCCESS! Published Image Media ID: ${publishData.id}`);
  }
}

async function publishReel(igUserId: string) {
  const videoUrl = "https://res.cloudinary.com/demo/video/upload/v1312461204/dog.mp4"; // Reliable public video
  const caption = "Testing InstaBrain automated Reels API 🎥 #developer #test";

  console.log(`\n--- TEST: PUBLISH REEL ---`);
  
  // 1. Create Container
  const createUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?media_type=REELS&video_url=${encodeURIComponent(videoUrl)}&caption=${encodeURIComponent(caption)}&access_token=${TOKEN}`;
  console.log("Request: POST /media (REEL)");
  const createRes = await fetch(createUrl, { method: 'POST' });
  const createData = await createRes.json();
  console.log("Response:", createData);

  if (createData.error) return;

  const creationId = createData.id;

  // 2. Poll Status
  console.log("Polling container status...");
  let status = "IN_PROGRESS";
  while (status === "IN_PROGRESS") {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const statusUrl = `https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${TOKEN}`;
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();
    console.log("Status:", statusData);
    if (statusData.status_code) {
      status = statusData.status_code;
    } else {
      break;
    }
  }

  if (status !== "FINISHED") {
    console.log("Container failed to finish processing.");
    return;
  }

  // 3. Publish Media
  const publishUrl = `https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${creationId}&access_token=${TOKEN}`;
  console.log(`Request: POST /media_publish (creation_id: ${creationId})`);
  const publishRes = await fetch(publishUrl, { method: 'POST' });
  const publishData = await publishRes.json();
  console.log("Response:", publishData);

  if (publishData.id) {
    console.log(`SUCCESS! Published Reel Media ID: ${publishData.id}`);
  }
}

async function main() {
  try {
    const igUserId = await getIgUserId();
    console.log("Connected IG User ID:", igUserId);

    await publishImage(igUserId);
    await publishReel(igUserId);

  } catch (err) {
    console.error("Test Failed:", err);
  }
}

main();
