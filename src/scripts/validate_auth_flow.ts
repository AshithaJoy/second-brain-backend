import { PrismaClient } from "@prisma/client";

const API_URL = "http://localhost:5000/api";
const TEST_EMAIL = `test_${Date.now()}@secondbrain.ai`;
const TEST_PASSWORD = "testpassword123";

const prisma = new PrismaClient();

async function run() {
  console.log("=== STARTING END-TO-END AUTH FLOW VALIDATION ===");

  // 1. Try to access /auth/me without authorization header (Should fail with 401)
  console.log("\n[Step 1] Accessing /auth/me without token (Expecting 401)...");
  try {
    const res = await fetch(`${API_URL}/auth/me`);
    console.log(`Response Status: ${res.status}`);
    const data = await res.json();
    console.log("Response Body:", data);
    if (res.status !== 401) {
      throw new Error(`Expected status 401, but got ${res.status}`);
    }
    console.log("✅ Correctly rejected unauthorized access.");
  } catch (err: any) {
    console.error("❌ Step 1 Failed:", err.message);
    process.exit(1);
  }

  // 2. Register a new user
  console.log(`\n[Step 2] Registering user ${TEST_EMAIL}...`);
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    console.log(`Response Status: ${res.status}`);
    const data = await res.json();
    console.log("Registered User Data:", data);
    if (res.status !== 201) {
      throw new Error(`Expected status 201, but got ${res.status}`);
    }
    console.log("✅ User registered successfully.");
  } catch (err: any) {
    console.error("❌ Step 2 Failed:", err.message);
    process.exit(1);
  }

  // 3. Try to login with incorrect credentials (Should fail)
  console.log("\n[Step 3] Logging in with incorrect password (Expecting error status)...");
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: "wrongpassword!!!" })
    });
    console.log(`Response Status: ${res.status}`);
    const data = await res.json();
    console.log("Response Body:", data);
    if (res.status >= 400) {
      console.log("✅ Correctly rejected invalid login.");
    } else {
      throw new Error(`Expected error status, but got ${res.status}`);
    }
  } catch (err: any) {
    console.error("❌ Step 3 Failed:", err.message);
    process.exit(1);
  }

  // 4. Login with correct credentials
  console.log("\n[Step 4] Logging in with correct credentials...");
  let accessToken = "";
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    console.log(`Response Status: ${res.status}`);
    const data: any = await res.json();
    if (res.status !== 200) {
      throw new Error(`Expected status 200, but got ${res.status}`);
    }
    accessToken = data.accessToken;
    console.log("Access Token received:", accessToken ? "Present" : "Missing");
    console.log("✅ Login successful.");
  } catch (err: any) {
    console.error("❌ Step 4 Failed:", err.message);
    process.exit(1);
  }

  // 5. Access /auth/me with valid bearer token
  console.log("\n[Step 5] Accessing /auth/me with correct token...");
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      }
    });
    console.log(`Response Status: ${res.status}`);
    const data: any = await res.json();
    console.log("User Profile Data:", data);
    if (res.status !== 200) {
      throw new Error(`Expected status 200, but got ${res.status}`);
    }
    if (data.email !== TEST_EMAIL) {
      throw new Error(`Expected email ${TEST_EMAIL}, but got ${data.email}`);
    }
    console.log("✅ Retreived profile successfully matching logged-in user.");
  } catch (err: any) {
    console.error("❌ Step 5 Failed:", err.message);
    process.exit(1);
  }

  // 6. Clean up test user
  console.log("\n[Step 6] Cleaning up test user from database...");
  try {
    const deleted = await prisma.user.delete({
      where: { email: TEST_EMAIL }
    });
    console.log(`Deleted user: ${deleted.email}`);
    console.log("✅ DB cleanup successful.");
  } catch (err: any) {
    console.error("❌ Step 6 Failed:", err.message);
    process.exit(1);
  }

  console.log("\n=== ALL AUTH PIPELINE TESTS PASSED SUCCESSFULLY ===");
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
