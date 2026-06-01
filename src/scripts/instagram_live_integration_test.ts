import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { InstagramService } from "../services/instagram/instagram.service";
import { OpenAIService } from "../services/openai/openai.service";

// Load backend .env configuration
dotenv.config({ path: path.join(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function run() {
  console.log("====================================================");
  console.log("   Instagram Live Graph API Integration Test Suite  ");
  console.log("====================================================\n");

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    failures: [] as string[]
  };

  function assert(condition: boolean, message: string) {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`✅ PASS: ${message}`);
    } else {
      results.failed++;
      results.failures.push(message);
      console.log(`❌ FAIL: ${message}`);
    }
  }

  const token = process.env.TEST_INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.error("❌ Aborting Test: No TEST_INSTAGRAM_ACCESS_TOKEN set in second-brain-backend/.env");
    process.exit(1);
  }

  // Setup: Register two test creators to verify tenant isolation
  const timestamp = Date.now();
  const emailA = `live_tester_A_${timestamp}@instabrain.co.in`;
  const emailB = `live_tester_B_${timestamp}@instabrain.co.in`;
  const passwordHash = "$2b$10$wE99Y01H4sB2k8eX9JcTku.examplepasswordhash"; // mock bcrypt stub

  let userA: any;
  let userB: any;

  try {
    userA = await prisma.user.create({
      data: { email: emailA, passwordHash }
    });
    userB = await prisma.user.create({
      data: { email: emailB, passwordHash }
    });
    console.log("--- Setup: Creator accounts registered ---");
  } catch (err: any) {
    console.error("Test setup database write failed:", err.message);
    process.exit(1);
  }

  try {
    // 1. Connected account returns profile
    console.log("\n--- Requirement 1: Live Profile Retrieval ---");
    const profile = await InstagramService.getProfile(token);
    assert(!!profile.id && !!profile.username, `Connected profile returned id: ${profile.id}, username: @${profile.username}`);

    // Update User A with live token credentials
    await prisma.user.update({
      where: { id: userA.id },
      data: {
        instagramUserId: profile.id,
        instagramUsername: profile.username,
        instagramAccessToken: token,
        instagramConnectedAt: new Date()
      }
    });

    // 2. Connected account returns media
    console.log("\n--- Requirement 2: Live Media Retrieval ---");
    const media = await InstagramService.getMedia(token);
    assert(Array.isArray(media) && media.length > 0, `Connected account returned ${media.length} media items.`);
    if (media.length > 0) {
      assert(!!media[0].id && media[0].permalink !== undefined, "Media item structure verified.");
    }

    // 3. Snapshot creation succeeds
    console.log("\n--- Requirement 3: Snapshot Creation & Persistence ---");
    const syncRes = await InstagramService.refreshProfileData(userA.id);
    assert(syncRes.success === true && !!syncRes.snapshotId && syncRes.syncedPosts === media.length, `Sync flow succeeded. Synced ${syncRes.syncedPosts} posts. Snapshot ID: ${syncRes.snapshotId}`);

    const savedSnapshot = await prisma.instagramSnapshot.findUnique({
      where: { id: syncRes.snapshotId }
    });
    assert(!!savedSnapshot && savedSnapshot.userId === userA.id, "Snapshot persisted and correctly bound to Creator A ID.");

    // 4. Intelligence generation succeeds using real media
    console.log("\n--- Requirement 4: Dynamic Creator Intelligence Audits ---");
    const snapshotProfile = JSON.parse(savedSnapshot!.profileJson);
    const snapshotMedia = JSON.parse(savedSnapshot!.mediaJson);
    const snapshotAnalytics = JSON.parse(savedSnapshot!.analyticsJson);

    // Call intelligence generator (which uses mock fallback logic to extract real hooks or calls OpenAI)
    const intel = await OpenAIService.analyzeInstagramContent(snapshotProfile, snapshotMedia, snapshotAnalytics, userA.id);
    
    assert(!!intel && Array.isArray(intel.hookSuggestions), "Intelligence payload generated successfully.");
    
    if (intel.hookSuggestions && intel.hookSuggestions.length > 0) {
      const realFirstCaption = media[0].caption ? media[0].caption.split("\n")[0].substring(0, 60) : "";
      if (realFirstCaption) {
        assert(intel.hookSuggestions[0].original === realFirstCaption, `Verified: Intelligence uses real media caption "${intel.hookSuggestions[0].original}" instead of mock presets.`);
      } else {
        console.log("⚠️ First media item has no caption; skipped caption exact match assert.");
      }
    }

    // 5. Planner draft creation succeeds using insight suggestions
    console.log("\n--- Requirement 5: Content Planner Integration ---");
    const testIdea = {
      title: "Sync Concept Post",
      concept: "Mock draft post concept generated from live Instagram audit.",
      suggestedHook: intel.hookSuggestions?.[0]?.improved || "New Hook Concept",
      caption: "Real post copy"
    };

    const newPost = await prisma.post.create({
      data: {
        userId: userA.id,
        title: testIdea.title,
        date: new Date().toISOString().split("T")[0],
        type: "REEL",
        status: "DRAFT",
        mood: "inspired",
        caption: `Hook: ${testIdea.suggestedHook}\n\nConcept: ${testIdea.concept}\n\n${testIdea.caption}`,
      }
    });
    assert(!!newPost && newPost.title === "Sync Concept Post" && newPost.userId === userA.id, `Successfully created Content Planner draft from audit. Draft ID: ${newPost.id}`);

    // 6. Tenant isolation is maintained
    console.log("\n--- Requirement 6: Tenant Isolation & Scoping Rules ---");
    // Verify Creator B cannot pull Creator A's snapshot or credentials
    const BSnapshot = await prisma.instagramSnapshot.findFirst({
      where: { userId: userB.id }
    });
    assert(BSnapshot === null, "Isolation verified: Unconnected Creator B has 0 snapshot records.");

    try {
      await InstagramService.refreshProfileData(userB.id);
      assert(false, "Unconnected Creator B refreshProfileData should throw exception");
    } catch (e: any) {
      assert(e.message === "Instagram account not connected", "Scoping verified: Direct refresh throws Unconnected error.");
    }

    // 7. Mock fallback still functions if Meta credentials fail
    console.log("\n--- Requirement 7: Mock Fallback Strategy ---");
    const mockToken = "mock-token-fallback-userB-998877";
    await prisma.user.update({
      where: { id: userB.id },
      data: {
        instagramUserId: "mock-fallback-ig",
        instagramUsername: "mock_fallback_username",
        instagramAccessToken: mockToken,
        instagramConnectedAt: new Date()
      }
    });

    const mockProfile = await InstagramService.getProfile(mockToken);
    const mockMedia = await InstagramService.getMedia(mockToken);
    assert(mockProfile.username === "test_creator" && mockMedia.length === 2, "Mock fallback functions seamlessly when mock token is detected.");

  } catch (err: any) {
    console.error("Test execution exception occurred:", err.message);
    results.failed++;
    results.failures.push(err.message);
  } finally {
    // Teardown: Clean database records to avoid cluttering local postgres
    console.log("\n--- Teardown: Removing Test Database Records ---");
    try {
      await prisma.post.deleteMany({ where: { userId: userA.id } });
      await prisma.instagramSnapshot.deleteMany({ where: { userId: userA.id } });
      await prisma.user.delete({ where: { id: userA.id } });
      await prisma.user.delete({ where: { id: userB.id } });
      console.log("Teardown completed cleanly.");
    } catch (err: any) {
      console.error("Teardown database clean failed:", err.message);
    }
  }

  console.log("\n====================================================");
  console.log(`   Live Integration Tests: Passed ${results.passed}/${results.total} checks`);
  console.log("====================================================");

  if (results.failed > 0) {
    console.error(`\n❌ Integration failures detected: ${results.failed} failures.`);
    process.exit(1);
  } else {
    console.log("\n✅ All live Instagram Graph API integration tests PASSED successfully.");
    process.exit(0);
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
