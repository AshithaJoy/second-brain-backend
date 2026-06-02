# Instagram Long-Lived Token Upgrade Report

This report documents the design, database changes, endpoint implementations, error handling remediations, and verification results for upgrading the Instagram integration to support 60-day long-lived access tokens.

---

## 1. Database Schema Migrations

Added fields `instagramTokenExpiresAt` and `instagramTokenType` to the `User` model to track token health.

### Model Modification (`schema.prisma`)
```prisma
model User {
  id                      String          @id @default(uuid())
  ...
  instagramUserId         String?
  instagramUsername       String?
  instagramAccessToken    String?         @db.Text
  instagramConnectedAt    DateTime?
  instagramTokenExpiresAt DateTime?
  instagramTokenType      String?
  instagramOAuthState     String?
  ...
}
```

### Applied Migration
*   **Migration Name**: `add_instagram_token_expiration`
*   **Migration File**: `prisma/migrations/20260602122133_add_instagram_token_expiration/migration.sql`
*   **SQL Schema Statement**:
    ```sql
    ALTER TABLE "User" ADD COLUMN "instagramTokenExpiresAt" TIMESTAMP(3),
                       ADD COLUMN "instagramTokenType" TEXT;
    ```

---

## 2. Codebase Implementations

### A. OAuth Exchange Upgrade (`instagram.oauth.ts`)
Added the `exchangeForLongLivedToken` method to call the Graph API token exchange endpoint.
*   **API Endpoint**: `GET https://graph.instagram.com/access_token`
*   **Parameters**:
    *   `grant_type=ig_exchange_token`
    *   `client_secret=META_CLIENT_SECRET`
    *   `access_token={short-lived-token}`
*   **Returns**: `{ accessToken, expiresIn, tokenType }` where `expiresIn` maps to seconds remaining (typically 60 days, e.g. `5183944`).

### B. Controller Integration (`instagram.controller.ts`)
*   **OAuth Callback (`oauthCallback`)**: Upgraded to exchange the authorization code for a short-lived token, immediately exchange it for a long-lived token, calculate the exact expiration date, and store the long-lived token (`instagramAccessToken`), expiration timestamp (`instagramTokenExpiresAt`), and token type (`instagramTokenType = 'LONG_LIVED'`).
*   **Direct Connect (`connect`)**: Standardized to perform the long-lived token upgrade as well.

### C. Exposing Token Health Status (`GET /api/instagram/status`)
Exposes token validity metrics to the frontend:
*   **Path**: `GET /api/instagram/status` (Scoped under JWT Auth middleware)
*   **Connected Payload**:
    ```json
    {
      "connected": true,
      "username": "_ashitha_mariya_",
      "expiresAt": "2026-08-01T12:00:00.000Z",
      "daysRemaining": 58,
      "requiresReconnect": false,
      "tokenType": "LONG_LIVED"
    }
    ```
*   **Unconnected Payload**:
    ```json
    {
      "connected": false
    }
    ```

### D. Expired Token Error Propagation (`instagram.service.ts`)
Defined a custom `InstagramApiError` class extending `Error` to carry a `statusCode` field:
```typescript
export class InstagramApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "InstagramApiError";
    this.statusCode = statusCode;
  }
}
```
*   When Meta's Graph API returns `code = 190` or `type = OAuthException` (token expired/invalid), the service throws `InstagramApiError("Instagram token expired", 401)`.
*   The Express global `errorHandler` intercepts `statusCode` and responds to the frontend with **`401 Unauthorized`** instead of a generic `500 Internal Server Error`, permitting the UI to display a clear reconnect notice:
    > "Instagram connection expired. Please reconnect your account."

### E. Existing User Backfill Policy (`refreshProfileData`)
To prevent disconnecting existing users automatically, the next sync execution (`POST /api/instagram/sync`) checks if the user's `instagramTokenType` is `null` or `UNKNOWN`.
If so, it attempts to upgrade the existing token to a long-lived token using the client secret. If the upgrade succeeds, it updates the token type to `LONG_LIVED` and saves the calculated expiration date. If it fails (e.g. token already expired), it maintains `UNKNOWN` and continues querying the active token, falling back only when the API fails.

---

## 3. Verification Scenarios & Testing Results

| Scenario | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- |
| **1. Fresh OAuth Connection** | Exchanged for long-lived, calculates expiresAt, tokenType set to `LONG_LIVED` | Verified mock / real token calculations correctly resolve to ~60 days, type set to `LONG_LIVED`. | **PASS** |
| **2. Status Endpoint** | Returns connected properties: expiresAt, daysRemaining, requiresReconnect | Returns connected JSON payload with 60 days remaining for mock. | **PASS** |
| **3. Expired Token** | Returns `401 Unauthorized` instead of `500` | Endpoint returns `401 Unauthorized` with `OAuthException` error payload. | **PASS** |
| **4. Media Sync** | Upgrades legacy/unknown tokens on sync, saves status | Upgrades token to `LONG_LIVED` or warns-logs and falls back to existing valid queries. | **PASS** |
| **5. Regression Check** | Live & Mock test suites remain green | Automated integration tests passed (11/11). Live API tests passed (11/11). | **PASS** |
