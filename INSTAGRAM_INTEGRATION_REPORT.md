# Instagram Integration & Creator Intelligence Engine Report

This report documents the architectural design, implementation details, and verification results for **Phase 1 (OAuth Connection)** and **Phase 2.1 (Creator Intelligence Engine)** of the InstaBrain Instagram Integration.

---

## 1. Meta OAuth & Graph API Flow

The connection process establishes a secure link to import profile metadata and posts:
1. **Authorize Link**: The client initiates link redirection to Meta's authorize URL (`https://api.instagram.com/oauth/authorize`), requesting `user_profile` and `user_media` scopes.
2. **Account Connection**: The frontend captures the Meta User Access Token and posts it to `POST /api/instagram/connect`. The server queries `graph.instagram.com/v25.0/me` to verify the token, resolving and linking the Instagram ID and username.
3. **Database Security (Token Storage)**:
   - Access tokens are stored on the `User` table directly (`instagramAccessToken`, `instagramUserId`, `instagramUsername`, `instagramConnectedAt`).
   - **Token Masking**: Access tokens are kept strictly on the server and are never returned in any response payloads to prevent leaks.

---

## 2. Instagram Snapshot Cache

To optimize load times, reduce Meta API rate limits, and enable historical analytics comparisons, we implemented the `InstagramSnapshot` cache:
- **Prisma Model**:
  - `id`: String/UUID primary key.
  - `userId`: References the authenticated creator user.
  - `profileJson`: Cached JSON string of the user's Instagram profile metadata.
  - `mediaJson`: Cached JSON array containing the user's latest 20 media items.
  - `analyticsJson`: Cached JSON representation of computed analytics calculations.
  - `createdAt`: Timestamp.
- **Sync Routine (`POST /api/instagram/sync`)**:
  - Queries live posts and profile metadata from Meta.
  - Generates the deterministic analytics.
  - Inserts a new `InstagramSnapshot` record.
  - Subsequent requests to `/api/instagram/intelligence` query the latest snapshot first, minimizing Meta Graph API calls.

---

## 3. Deterministic Analytics Engine (`instagram.analytics.ts`)

A rule-based mathematical calculator compiles creator statistics programmatically before triggering AI enhancements:

### Posting Cadence & Velocity
- **Weekly/Monthly Rates**: Analyzes time gaps between the latest 20 posts to calculate average posts/week and posts/month.
- **Average Post Gap**: Calculates the average span between consecutive publication timestamps in days.

### Content Format Mix (Distribution)
- Inspects the `media_type` of recent posts to calculate format percentages:
  - **Reels Percentage**: (Count of `VIDEO` / Total Posts) * 100
  - **Carousel Percentage**: (Count of `CAROUSEL_ALBUM` / Total Posts) * 100
  - **Image Percentage**: (Count of `IMAGE` / Total Posts) * 100

### Consistency Score
- Computes a `0-100` score based on the average gap and standard deviation of gaps. Short, stable posting intervals yield higher scores, while erratic gaps trigger consistency penalties.

### Content Pillar Engine
- Audits caption text and hashtags against keyword maps to compute weights for four content categories:
  - **Productivity**: e.g., work, setup, focus, schedule.
  - **Business**: e.g., monetization, brand deals, pricing.
  - **Lifestyle**: e.g., routine, coffee, travel, aesthetics.
  - **Personal**: e.g., lessons, failures, storytelling.

### Hook Database
- Extracts the first line of captions.
- Evaluates engagement metrics (`like_count` + `comments_count`) to extract the top 3 **Strongest Hooks** and bottom 3 **Weakest Hooks**.
- Scans hooks for recurring phrase patterns (e.g. "How to", "Why you").

### Creator Health Index
- Weighted score compiling `0.4 * Consistency` + `0.3 * Format Diversity` + `0.3 * Frequency Index`.

---

## 4. Opportunity Engine

Generates rule-based findings directly from analytics without calling OpenAI:
- **Formats Alerts**: e.g., "No carousels posted recently. Add multi-slide Carousels to share guides and boost saves."
- **Cadence Declining**: Alerted if weekly frequency drops below 2.
- **Erratic gaps**: Flags publishing schedule gaps exceeding 4 days.
- **Pillar Imbalance**: Warns if core topics (such as Personal or Business) fall below 15% representation.

---

## 5. AI Recommendations Layer (`gpt-4o-mini`)

Using the structured profile details, recent posts, and computed metrics as context, OpenAI generates strategic content recommendations:
1. **Content Opportunities**: Specific analysis of formatting and pillar trends.
2. **Hook Suggestions**: Maps weak hooks to high-retention creator variants, including 10 new suggested hooks.
3. **Draft Post Generation**: Creates 5 content ideas across Reels, Carousels, and Stories complete with hooks, captions, and b-roll visual concepts.

---

## 6. Planner Integration (⚡ Add To Planner)

To close the loop between insights and execution, suggested ideas integrate with the planner:
- Frontend displays `⚡ Add To Planner` on each Reels/Carousel/Story idea card.
- Tapping it sends a `POST` request to `/api/planner/posts` with pre-filled content (suggested title, concept, hook, and caption).
- Automatically saves it as a new `DRAFT` post directly inside the creator's Content Planner calendar.

---

## 7. Tenant Isolation Validation

Existing security boundaries have been fully enforced and verified:
- **Authorization**: All API requests derives identity exclusively from the secure JWT context (`req.user.id`).
- **No Shared Access**: User A cannot read User B's snapshots, computed analytics, or Instagram tokens. User B querying User A's profile or intelligence receives `404 Not Found`.

---

## 8. Integration Test Suite Execution Results

We verified the integration using the automated test suite `instagram_intelligence_test.ts` on a live Express dev server.

### Test Log Output (`npm run test:instagram-intel`)
```
====================================================
   InstaBrain Instagram Intelligence Test Suite     
====================================================

--- Setup: Registering Test Creator Accounts ---
✅ PASS: Register User A
✅ PASS: Register User B

--- Category: Instagram Snapshot Sync ---
✅ PASS: User B gets 404 Sync when unconnected
✅ PASS: User A syncs channel and creates snapshot
✅ PASS: Snapshot caching verified directly in Database

--- Category: Deterministic & AI Analytics ---
✅ PASS: User B gets 404 Intelligence when unconnected
✅ PASS: Successfully returns creator health index, cadence, hook database, visual content pillars, and AI ideas
✅ PASS: Deterministic analytics (postsPerWeek, format percentages, pillars weights) calculate correctly

--- Category: Content Planner Integration ---
✅ PASS: Tapping '⚡ Add To Planner' creates a draft item
✅ PASS: Planner draft ownership matches User A

--- Category: Multi-Tenant Data Isolation ---
✅ PASS: User B database snapshots return empty
✅ PASS: User B can only read and manage their own snapshots

--- Teardown: Cleaning Test Accounts ---
Teardown completed cleanly.

====================================================
   Instagram Intelligence Tests: Passed 12/12 checks
====================================================

✅ All Creator Intelligence tests PASSED cleanly.
```

The Creator Intelligence Engine is successfully implemented and ready for production!
