# Instagram Media API 500 Root Cause Audit Report

This report documents the findings and root-cause analysis of the `500 Internal Server Error` occurring on the `GET /api/instagram/media` endpoint in the production environment.

---

## 1. Root Cause Analysis

The `500 Internal Server Error` on `GET /api/instagram/media` occurs because of how the application's error handling and mock boundaries are structured under production settings (`ALLOW_INSTAGRAM_MOCKS=false`). There are two distinct failure paths:

### Path A: Leftover Mock Credentials in Database
If a user connected their Instagram account under a development setting (when `ALLOW_INSTAGRAM_MOCKS=true`) or before mock connections were prohibited, the database user record contains mock connection attributes:
*   `instagramAccessToken`: `"mock-token-..."`
*   `instagramUserId`: `"mock-ig-id-99999"`

When the backend environment is switched to production (`ALLOW_INSTAGRAM_MOCKS=false`), any call to `GET /api/instagram/media` pulls this token, enters the service method `InstagramService.getMedia(accessToken)`, and triggers the mock rejection gate:
```typescript
if (accessToken.startsWith("mock") || accessToken.startsWith("mock-")) {
  if (!allowMocks) {
    console.error(`[Instagram Debug] step=service.getMedia.mockRejected status=error error=Mock access tokens are forbidden in production`);
    throw new Error("Instagram connection failed: Mock access tokens are forbidden in production");
  }
}
```
This throws a standard JavaScript `Error`. Because the error does not carry a custom HTTP status code, the Express global `errorHandler` defaults to status **`500`**.

### Path B: Rethrown API Exceptions (Expired/Invalid Tokens)
If a user completes a real OAuth connection, a valid token is persisted. However, if the token later **expires**, is **revoked**, or has **insufficient permissions**, the fetch call to the Instagram Graph API returns a `400 Bad Request` or `401 Unauthorized` response with an `OAuthException` payload:
```json
{
  "error": {
    "message": "Invalid OAuth access token - Cannot parse access token",
    "type": "OAuthException",
    "code": 190,
    "fbtrace_id": "ApHirAxN_LnG3wmasHV9fZL"
  }
}
```
The catch block in `InstagramService.getMedia` catches this, but because `allowMocks` is `false`, it rethrows a generic error:
```typescript
catch (err: any) {
  console.error(`[Instagram Debug] step=service.getMedia.catch error=${err.message} stack=${err.stack} status=error`);
  if (!allowMocks) {
    console.error(`[Instagram Debug] step=service.getMedia.rethrow error=Instagram API request failed`);
    throw new Error("Instagram API request failed");
  }
}
```
Because the rethrown `Error("Instagram API request failed")` has no custom `statusCode` attribute, the Express global `errorHandler` catches it and returns a generic **`500 Internal Server Error`** to the user instead of a `401 Unauthorized` or `400 Bad Request` suggesting a re-login.

---

## 2. Evidence & Captures

### Case 1: Mock Token in Production
*   **Database Record**:
    ```json
    {
      "id": "92ed81e0-1275-4040-ac98-015a45e416fa",
      "instagramUserId": "mock-ig-id-99999",
      "instagramUsername": "mock_creator_partner",
      "instagramAccessToken": "mock-token-userA-12345",
      "instagramConnectedAt": "2026-06-02T12:02:54.111Z"
    }
    ```
*   **Failing Endpoint**: `https://graph.instagram.com/me/media` (Bypassed due to mock check)
*   **Failing Service Method**: `InstagramService.getMedia(accessToken)`
*   **Exception Log**:
    ```
    [Instagram Debug] step=service.getMedia.start allowMocks=false status=processing
    [Instagram Debug] step=service.getMedia.mockRejected status=error error=Mock access tokens are forbidden in production
    Global Error Caught: Error: Instagram connection failed: Mock access tokens are forbidden in production
        at Function.getMedia (C:\Users\HI10148\.gemini\antigravity\scratch\second-brain-backend\src\services\instagram\instagram.service.ts:85:15)
        at Function.getInstagramMedia (C:\Users\HI10148\.gemini\antigravity\scratch\second-brain-backend\src\services\instagram\instagram.service.ts:159:29)
    ```

### Case 2: Invalid/Expired Real Token
*   **Database Record**:
    ```json
    {
      "id": "c0616886-cab4-4606-8a88-3fc94ce4cb62",
      "instagramUserId": "27118102357830587",
      "instagramUsername": "_ashitha_mariya_",
      "instagramAccessToken": "invalid-real-token-12345",
      "instagramConnectedAt": "2026-06-02T12:03:06.648Z"
    }
    ```
*   **Failing Endpoint**: `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=HIDDEN`
*   **Request Headers**: None (Standard browser fetch request)
*   **Failing Service Method**: `InstagramService.getMedia(accessToken)`
*   **Graph API Error Response**:
    ```json
    {
      "error": {
        "message": "Invalid OAuth access token - Cannot parse access token",
        "type": "OAuthException",
        "code": 190,
        "fbtrace_id": "ApHirAxN_LnG3wmasHV9fZL"
      }
    }
    ```
*   **Exception Log**:
    ```
    [Instagram Debug] step=service.getMedia.start allowMocks=false status=processing
    [Instagram Debug] step=service.getMedia.apiCall endpoint=https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=HIDDEN status=processing
    [Instagram Debug] step=service.getMedia.apiResponse status=400
    [Instagram Debug] step=service.getMedia.apiError responseBody={"error":{"message":"Invalid OAuth access token - Cannot parse access token","type":"OAuthException","code":190,"fbtrace_id":"ApHirAxN_LnG3wmasHV9fZL"}} status=error
    [Instagram Debug] step=service.getMedia.catch error=Invalid OAuth access token - Cannot parse access token stack=Error: Invalid OAuth access token - Cannot parse access token
        at Function.getMedia (C:\Users\HI10148\.gemini\antigravity\scratch\second-brain-backend\src\services\instagram\instagram.service.ts:120:15)
    [Instagram Debug] step=service.getMedia.rethrow error=Instagram API request failed
    Global Error Caught: Error: Instagram API request failed
        at Function.getMedia (C:\Users\HI10148\.gemini\antigravity\scratch\second-brain-backend\src\services\instagram\instagram.service.ts:130:15)
    ```

---

## 3. Core Status Summary

| Item | Status | Details / Evidence |
| :--- | :--- | :--- |
| **OAuth Success** | Yes | Callback flow completes successfully (`GET /api/instagram/oauth/callback` returns `302`). |
| **User Data Persisted** | Yes | User connection columns are fully written to the database. |
| **Access Token Exist** | Yes | Stored securely in `instagramAccessToken` on the `User` model. |
| **Token Validity** | Varies | Can be mock (legacy connections) or expired/invalid real tokens. |
| **Permissions/Scopes** | Sufficient | Standard scopes (`instagram_graph_user_profile`, `instagram_graph_user_media`) are requested and authorized. |

---

## 4. Required Code Fix

To resolve the 500 errors and ensure the frontend receives appropriate actions (like prompts to re-authenticate), we should implement the following changes:

### 1. Propagate Meta/Instagram Status Codes
Modify `InstagramService.getMedia` and `getProfile` to throw exceptions with specific HTTP status codes (e.g. 401 for expired tokens, 400/403 for permission/scope issues) instead of a generic `500` Error.

We can define a simple custom error class:
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

Then in `InstagramService.getMedia`:
```typescript
if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  const status = res.status === 401 ? 401 : 400; // Map authentication issues to 401
  throw new InstagramApiError(body.error?.message || "Instagram API request failed", status);
}
```

And in the catch block:
```typescript
catch (err: any) {
  if (!allowMocks) {
    if (err instanceof InstagramApiError) {
      throw err;
    }
    throw new InstagramApiError(err.message || "Instagram API request failed", 500);
  }
  // Fallback dev mock behavior here
}
```

### 2. Disconnect Invalid Accounts Automatically (Optional but Recommended)
In the controller, if a `401 Unauthorized` is returned from the Instagram API during media retrieval, the backend could clear out the invalid credentials from the user record or return a specific error code to the client prompting them to re-connect.

---

## 5. Verification Plan

1.  **Mock Token Rejection Validation**:
    *   Set `ALLOW_INSTAGRAM_MOCKS=false`.
    *   Connect using a mock token and verify that the endpoint returns `401 Unauthorized` or `400 Bad Request` instead of `500 Internal Server Error`.
2.  **Expired Token Validation**:
    *   Provide an invalid real token to a database user.
    *   Request `GET /api/instagram/media` and verify the API responds with a correct `401` status and JSON payload describing the authentication failure.
3.  **No Regression Check**:
    *   Run `npm run test:instagram` under dev settings (`ALLOW_INSTAGRAM_MOCKS=true`) to ensure standard mock integration tests remain green.
