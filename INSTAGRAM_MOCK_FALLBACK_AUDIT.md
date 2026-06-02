# INSTAGRAM_MOCK_FALLBACK_AUDIT

This audit report investigates the root causes of mock creator profiles (`@mock_creator_partner`) being connected in the production environment and documents the resolutions applied.

---

## 1. Database Values Verified

From inspecting the Prisma database for connected creators, the following records were verified:
- **`instagramUserId`**: `"mock-ig-id-99999"`
- **`instagramUsername`**: `"mock_creator_partner"`
- **`instagramAccessToken`**: `"mock_code_888"` or `"mock-token-..."`
- **`instagramConnectedAt`**: Active timestamps

This confirms that users were successfully completing the flow but were assigned static mock user credentials.

---

## 2. Connected Account Source & OAuth Result

- **Connected Account Source**: Mock stub data generator.
- **OAuth Result**: Failed. The token exchange with the Meta Graph API failed (due to configuration mismatch, invalid authorization code, or expired sessions). Instead of terminating with an error, the system catch-blocks intercept the exception and assign the mock creator profile.

---

## 3. Root Cause

1. **`instagram.controller.ts: oauthCallback()`**:
   The try-catch wrapper around `InstagramOAuth.getAccessToken()` and `InstagramService.getProfile()` caught any connection/exchange errors and automatically fell back to:
   - `accessToken = mock-token-...`
   - `username = "mock_creator_partner"`
   - `id = "mock-ig-id-99999"`
   It then redirected the user back to the frontend with `?instagram_connect=success`.

2. **`instagram.service.ts: getProfile() / getMedia()`**:
   Both methods had try-catch catch-blocks that warnings-logged live Graph API network errors and immediately returned mock creator profiles and post arrays, hiding connection failures.

---

## 4. Required Fix (Enforced Rules)

Enforced strict production environment rules using `process.env.NODE_ENV === "production"`:

### 1. Controller Remediations (`instagram.controller.ts`)
- Modified `oauthCallback()` to check the environment:
  - If `isProduction` is `true` and the authentication code starts with `"mock"`, the request is immediately rejected.
  - If a real token exchange fails inside the try-catch block, the system logs the error and redirects to the frontend settings page with `?instagram_error=Instagram connection failed: [Details]` instead of fallback mock assignments.
  - If client configuration (`META_CLIENT_ID`, `META_CLIENT_SECRET`, etc.) is missing in production, mock fallback is denied and an explicit connection error is sent.

### 2. Service Remediations (`instagram.service.ts`)
- Modified `getProfile()` and `getMedia()`:
  - If `accessToken` starts with `"mock"`, a check is done. If `isProduction` is `true`, they throw an explicit `Error("Mock access tokens are forbidden in production")`.
  - In their try-catch catch-blocks, if `isProduction` is `true`, they log the error and throw an explicit connection error rather than returning mock arrays.
