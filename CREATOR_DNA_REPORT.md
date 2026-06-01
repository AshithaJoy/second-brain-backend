# PHASE 7.1 – CREATOR DNA PERSONALIZATION ENGINE (ENHANCED)

InstaBrain has been transformed from a generic creator utility into a personalized Creator Operating System. By understanding each creator's primary and secondary niches, primary goals, audience size, maturity stage, posting frequency, preferred formats, content pillars, tone, struggles, and AI preferences, all system recommendations, planner ideas, hooks, captions, and strategies are dynamically tailored to their brand identity.

---

## 1. Database Schema

A new `CreatorProfile` model has been introduced in PostgreSQL, mapped 1:1 with the `User` model, to represent the creator's identity.

### Model Representation (`schema.prisma`)
```prisma
model CreatorProfile {
  id                String    @id @default(uuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  primaryNiche      String
  secondaryNiches   Json      // JSON array of strings: e.g. ["Tech", "Finance"]
  primaryGoal       String
  audienceSize      String
  creatorStage      String
  postingFrequency  String
  preferredFormats  Json      // JSON array of strings: e.g. ["Reels", "Carousels"]
  contentPillars    Json      // JSON array of strings: e.g. ["Education", "Tutorials"] (max 5)
  toneOfVoice       String
  biggestChallenge  String
  aiAssistanceLevel String      // Minimal | Balanced | Aggressive
  completedAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId])
}
```

---

## 2. Onboarding Flow Questions & Options

A multi-step onboarding wizard collects the Creator DNA. The questions are structured as follows:

| Step | Parameter | Question | Available Options | Multi-Select |
|---|---|---|---|---|
| **Step 1** | `primaryNiche` | What type of creator are you? | Business, Marketing, Fitness, Travel, Lifestyle, Fashion, Food, Tech, Finance, Education, Gaming, Creator Economy, Other | No |
| **Step 2** | `secondaryNiches` | Select secondary niches | Same options as primary niche | Yes |
| **Step 3** | `primaryGoal` | What are you trying to achieve? | Grow Followers, Build Personal Brand, Generate Leads, Get Brand Deals, Sell Products, Sell Services, Become Full-Time Creator, Build Community | No |
| **Step 4** | `audienceSize` | How large is your audience today? | 0–1k, 1k–10k, 10k–50k, 50k–100k, 100k+ | No |
| **Step 5** | `creatorStage` | What stage are you currently in? | Just Starting, Growing Creator, Established Creator, Full-Time Creator, Agency / Team | No |
| **Step 6** | `postingFrequency` | How often would you like to post? | Daily, 5x Weekly, 3x Weekly, Weekly, Custom | No |
| **Step 7** | `preferredFormats` | Content formats to focus on | Reels, Carousels, Stories, Long-form Videos, Mixed | Yes |
| **Step 8** | `contentPillars` | Topics you create content about | Education, Tutorials, Behind The Scenes, Personal Stories, Case Studies, Industry News, Motivation, Product Reviews, Opinions, Lifestyle (Max 5) | Yes |
| **Step 9** | `toneOfVoice` | How do you want to sound? | Professional, Educational, Friendly, Humorous, Bold, Luxury, Minimalist, Inspirational | No |
| **Step 10**| `biggestChallenge`| What is your biggest struggle? | Running Out Of Ideas, Consistency, Hooks, Editing, Planning, Growth, Brand Deals, Monetization | No |
| **Step 11**| `aiAssistanceLevel`| How much AI assistance do you want?| Minimal, Balanced, Aggressive | No |

---

## 3. Backend API Endpoints

All routes are mounted under `/api/profile`, protected by JWT token authentication, and strictly tenant-isolated to prevent cross-account access.

- **`GET /api/profile`**: Fetches the authenticated user's profile. Returns `404` if not yet configured.
- **`POST /api/profile`**: Saves/Configures the profile. Triggers auto-save of current state during wizard onboarding.
- **`PUT /api/profile`**: Updates specific profile settings (e.g. changing Tone from settings page).
- **`GET /api/profile/completion-status`**: Computes completion scorecard status.

---

## 4. Completion Scoring & Checklist

To increase onboarding completion rates, a scorecard checklist is displayed in **Settings → Creator DNA**.

### Scorecard Metrics
Completion score (0-100%) is calculated dynamically across 7 core metrics:
1. **Niche** (Presence of `primaryNiche`)
2. **Goals** (Presence of `primaryGoal`)
3. **Audience** (Presence of `audienceSize`)
4. **Formats** (`preferredFormats` array has at least 1 item)
5. **Pillars** (`contentPillars` array has at least 1 item)
6. **Tone** (Presence of `toneOfVoice`)
7. **Challenge** (Presence of `biggestChallenge`)

---

## 5. AI Prompt Personalization Logic

Inside `OpenAIService`, a centralized function formats the Creator DNA profile parameters into a structured prompt block:

```typescript
static async getCreatorProfileContext(userId?: string): Promise<string> {
  // Query database for CreatorProfile ...
  return `
[CREATOR DNA PROFILE]
- Primary Niche: ${profile.primaryNiche}
- Secondary Niches: ${secondary}
- Primary Goal: ${profile.primaryGoal}
- Audience Size: ${profile.audienceSize}
- Creator Stage: ${profile.creatorStage}
- Posting Frequency: ${profile.postingFrequency}
- Preferred Formats: ${formats}
- Core Content Pillars: ${pillars}
- Tone of Voice: ${profile.toneOfVoice}
- Biggest Challenge: ${profile.biggestChallenge}
- AI Assistance Level: ${profile.aiAssistanceLevel}

Ensure all generated hooks, captions, content recommendations, rewrites, and plans align with this profile. Customize the output based on:
1. Niche & Topics: Tailor terminology to the creator's niches (${profile.primaryNiche}, ${secondary}) and pillars (${pillars}).
2. Tone: Adhere to the tone of voice: "${profile.toneOfVoice}".
3. Creator Stage: Craft recommendations suitable for a "${profile.creatorStage}" creator (e.g. adjust technical difficulty/complexity).
4. Goal: Direct call-to-actions to support their primary goal: "${profile.primaryGoal}".
5. AI Assistance Level: If level is "Minimal", give simple brief ideas/suggestions. If "Balanced", give suggestions + drafts. If "Aggressive", provide full, detailed plans and draft copy.
`;
}
```

This context is injected into system system messages for:
- `generateHooks()`
- `generateCaptions()`
- `rewriteDump()`
- `analyzeInstagramContent()`
- `futureCollabSuggestions()`
- `futurePlannerRecommendations()`

---

## 6. Integration Test Results

The backend test suite `creator_dna_test.ts` was executed to verify the system end-to-end:

```bash
=== STARTING CREATOR DNA ENGINE VALIDATION ===

[Step 1] Registering and authenticating Test Creator A and Creator B...
Creator A ID: 549c4a04-40cf-4546-9262-af02e6bde2dc, Creator B ID: 9778df5b-1612-4af4-ace3-99c561fe706d
✅ Users authenticated.

[Step 2] Fetching initial profile for Creator A (Expecting 404)...
Get Profile Status: 404
✅ Profile correctly not found.

[Step 3] Fetching completion status for Creator A...
Completion status: {
  complete: false,
  score: 0,
  checklist: { niche: false, goals: false, audience: false, formats: false, pillars: false, tone: false, challenge: false }
}
✅ Verified initial completion scorecard is 0.

[Step 4] Creating profile for Creator A (Saving DNA)...
Save status: 201
✅ Profile created successfully.

[Step 5] Re-checking completion status for Creator A...
Updated status: {
  complete: true,
  score: 100,
  checklist: { niche: true, goals: true, audience: true, formats: true, pillars: true, tone: true, challenge: true }
}
✅ Verified scorecard checks out to 100%.

[Step 6] Testing tenant isolation (Creator B accessing Creator A profile)...
Creator B fetch status: 404
✅ Tenant isolation verified. Creator B cannot view Creator A's profile.

[Step 7] Updating profile parameters for Creator A...
Update status: 200
✅ Profile updated successfully.

[Step 8] Verifying AI prompt personalization context injection...
✅ Prompt personalization context injected correctly.

[Step 9] Verifying AI personalization output in mock mode...
Generated personalized hooks: [
  '"They say consistency is key, but here is the raw reality behind 3 money mistakes as a finance creator..."',
  '"The secret to rebuilding your routine around 3 money mistakes to get brand deals..."',
  '"POV: documenting the systems that actually keep you focused in a luxury way."'
]
✅ Personalization verified. Generated content dynamically customized.

[Cleanup] Cleaning up test data from database...
✅ Database cleanup successful.

=== ALL CREATOR DNA TEST CASES PASSED SUCCESSFULLY ===
```
