const fs = require('fs');

async function testUploadFlow() {
  const baseURL = 'https://second-brain-backend-production-43b4.up.railway.app';
  let token;

  console.log("--- Starting Production Upload Flow Verification ---");

  // 1. Authenticate (Register/Login)
  try {
    const regRes = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_prod_upload@example.com',
        password: 'Password123!',
        name: 'Prod Upload Tester'
      })
    });
    if (regRes.status === 201) {
      console.log("1. Account registered successfully in production.");
    }
  } catch (e) {
    // ignore
  }

  const loginRes = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test_prod_upload@example.com',
      password: 'Password123!'
    })
  });
  if (!loginRes.ok) {
    const errorText = await loginRes.text();
    throw new Error(`Login failed: ${loginRes.status} ${errorText}`);
  }
  const loginData = await loginRes.json();
  token = loginData.accessToken;
  console.log("2. Logged in successfully to production. Token received.");

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. OPTIONS /api/broll/upload-signature
  console.log("3. Testing OPTIONS request to /api/broll/upload-signature...");
  const optionsRes = await fetch(`${baseURL}/api/broll/upload-signature`, {
    method: 'OPTIONS',
    headers: {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization',
      'Origin': 'https://second-brain-instabrain.vercel.app'
    }
  });
  console.log(`   OPTIONS Response Status: ${optionsRes.status} (Expected: 200 or 204)`);

  // 3. POST /api/broll/upload-signature (Request Signature)
  console.log("4. Testing POST request to /api/broll/upload-signature...");
  const sigRes = await fetch(`${baseURL}/api/broll/upload-signature`, {
    method: 'POST',
    headers: authHeaders
  });
  console.log(`   POST Signature Status: ${sigRes.status} (Expected: 200)`);
  if (!sigRes.ok) {
    const errorText = await sigRes.text();
    throw new Error(`Signature request failed: ${sigRes.status} ${errorText}`);
  }
  const sigData = await sigRes.json();
  console.log("   Signature Payload:", JSON.stringify(sigData, null, 2));

  const { signature, timestamp, cloudName, apiKey } = sigData;
  if (!signature || !timestamp || !cloudName || !apiKey) {
    throw new Error("Missing Cloudinary credentials in signature response!");
  }

  // 4. Read a real local image and upload to Cloudinary
  console.log("5. Performing real image upload directly to Cloudinary...");
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
  console.log(`   Cloudinary Upload Status: ${uploadRes.status} (Expected: 200)`);
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Cloudinary upload failed: ${uploadRes.status} ${errorText}`);
  }
  const uploadData = await uploadRes.json();
  const secureUrl = uploadData.secure_url;
  const thumbnailUrl = secureUrl;
  console.log(`   Uploaded URL: ${secureUrl}`);

  // 5. Create B-Roll record in database
  console.log("6. Creating B-Roll record in production database...");
  const brollData = {
    title: 'Verify Startup Image.png',
    description: "End-to-end automated validation on production",
    mood: "cinematic",
    visualTags: ["automated", "test"],
    emotionTags: ["happy"],
    clipType: 'image',
    energy: "soft",
    fileUrl: secureUrl,
    thumbnailUrl: thumbnailUrl,
    status: "READY",
    fileSize: uploadData.bytes,
    duration: 0,
    resolution: `${uploadData.width}x${uploadData.height}`,
    mimeType: 'image/png'
  };

  const createRes = await fetch(`${baseURL}/api/broll`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(brollData)
  });
  console.log(`   B-Roll creation status: ${createRes.status} (Expected: 201)`);
  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`B-Roll record creation failed: ${createRes.status} ${errorText}`);
  }
  const createData = await createRes.json();
  console.log("   Created B-Roll Record:", JSON.stringify(createData, null, 2));

  // 6. Fetch assets from vault to verify it appears as READY
  console.log("7. Querying Asset Vault to verify asset state...");
  const vaultRes = await fetch(`${baseURL}/api/broll`, {
    method: 'GET',
    headers: authHeaders
  });
  if (!vaultRes.ok) {
    const errorText = await vaultRes.text();
    throw new Error(`Failed to query vault: ${vaultRes.status} ${errorText}`);
  }
  const vaultData = await vaultRes.json();
  const foundAsset = vaultData.find(asset => asset.id === createData.id);
  
  if (foundAsset) {
    console.log(`   Asset found in vault! Status: ${foundAsset.status} (Expected: READY)`);
    if (foundAsset.status === 'READY') {
      console.log("\n*** ALL PRODUCTION TESTS PASSED SUCCESSFULLY! ***\n");
    } else {
      console.error(`\n*** TEST FAILED: Status is ${foundAsset.status}, expected READY ***\n`);
    }
  } else {
    console.error("\n*** TEST FAILED: Asset not found in the vault ***\n");
  }
}

testUploadFlow().catch(err => {
  console.error("Test failed with error:", err.stack || err.message || err);
  process.exit(1);
});
