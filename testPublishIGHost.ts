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

async function main() {
  try {
    const igUserId = await getIgUserId();
    console.log(`Connected IG User ID: ${igUserId}`);

    const imageUrl = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
    const caption = "Testing InstaBrain automated scheduling via API 🚀 (Graph.Instagram.com Host)";

    // 1. Create Container
    const createUrl = `https://graph.instagram.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${TOKEN}`;
    console.log(`\nRequest: POST ${createUrl.replace(TOKEN!, "HIDDEN_TOKEN")}`);
    
    const createRes = await fetch(createUrl, { method: 'POST' });
    const createData = await createRes.json();
    
    console.log(`HTTP Status: ${createRes.status}`);
    console.log(`Response Payload:`, JSON.stringify(createData, null, 2));

    if (createData.error) {
      console.error("\nContainer creation failed. Halting.");
      return;
    }

    const creationId = createData.id;
    console.log(`\nContainer ID created: ${creationId}`);

    // 2. Publish Media
    const publishUrl = `https://graph.instagram.com/v19.0/${igUserId}/media_publish?creation_id=${creationId}&access_token=${TOKEN}`;
    console.log(`\nRequest: POST ${publishUrl.replace(TOKEN!, "HIDDEN_TOKEN")}`);
    
    const publishRes = await fetch(publishUrl, { method: 'POST' });
    const publishData = await publishRes.json();
    
    console.log(`HTTP Status: ${publishRes.status}`);
    console.log(`Response Payload:`, JSON.stringify(publishData, null, 2));

    if (publishData.id) {
      console.log(`\nSUCCESS! Published Image Media ID: ${publishData.id}`);
    }

  } catch (err) {
    console.error("Script Error:", err);
  }
}

main();
