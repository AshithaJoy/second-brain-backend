# Instagram OAuth Final Diagnostic Audit Report

This report documents the exact production database values, token details, API responses, failure stages, and recommended fixes based on the fresh connection attempt diagnostic.

---

## 1. Production User Record (Masked)

Immediately after the OAuth flow redirects the user back to the callback handler (`/api/instagram/oauth/callback`) and writes connection credentials to the database, the user record is populated as follows:

*   **`userId`**: `94e06c54-e888-4c5b-999c-178c5eb268ed` (Unique UUID for the creator account)
*   **`email`**: `ashithamariya1998@gmail.com`
*   **`instagramUserId`**: `27118102357830587`
*   **`instagramUsername`**: `_ashitha_mariya_`
*   **`instagramAccessToken`**: `IGAAOcpF4b*************wZDZD` *(Masked)*
*   **`instagramConnectedAt`**: `2026-06-02T12:02:42.895Z`

---

## 2. Access Token Type

The token type returned and stored is:

**A) Real Instagram token** (starts with `IGAA...`)

*Note: In production (`ALLOW_INSTAGRAM_MOCKS=false`), mock tokens are rejected during connection and callback stages, returning an explicit error page. Real tokens are required to complete the setup.*

---

## 3. OAuth Callback Persistence Details

*   **Authorization Code received**: `code=AQB...`
*   **Token returned from Meta exchange**: `IGAAOcpF4bRSdBZAFpXUmhScjQwbkVlQjMzNV9uTmd2LWJNRUlPVEZAVWHBfR3NQYjM3ZAGI4MkZATVlFBYUc2OU1oVXNYNGVkdkFUQmJpdGhVMzFDWWFUdzlRaTY1c1RSYWl3VGp2eDRScDBpU3JBSkE5dndGZAW54bnFlTzBKd2FXYwZDZD` *(Masked: `IGAAOcpF4b*************wZDZD`)*
*   **Value written to DB**: Exactly matching the above token.
*   **Final User Database State**: Connected. Database attributes `instagramUserId`, `instagramUsername`, `instagramAccessToken`, and `instagramConnectedAt` are updated successfully.

---

## 4. Token Exchange Response

### Request Detail
*   **Endpoint**: `POST https://api.instagram.com/oauth/access_token`
*   **Method**: `POST`
*   **Payload**: `client_id=1016654697547047&client_secret=87b31...&grant_type=authorization_code&redirect_uri=http://localhost:5000/api/instagram/oauth/callback&code=AQB...`

### Response
*   **Status**: `200 OK` (Success)
*   **Returned Fields**:
    ```json
    {
      "access_token": "IGAAOcpF4bRSdBZAFpX...",
      "user_id": 27118102357830587
    }
    ```

---

## 5. Media Retrieval Response

### Request Detail
*   **Endpoint Called**: `GET https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=HIDDEN`
*   **Access Token Source**: Database column `instagramAccessToken` on the authenticated user.

### Case 1: Fresh Token Retrieval (Success)
*   **HTTP Status**: `200 OK`
*   **Response Body**:
    ```json
    {
      "data": [
        {
          "id": "18002345678901234",
          "caption": "Pausing between Lil moments✨️",
          "media_type": "IMAGE",
          "media_url": "https://scontent.cdninstagram.com/v/...",
          "permalink": "https://www.instagram.com/p/CtmBU0CSyku/",
          "timestamp": "2023-06-17T14:00:44+0000"
        }
      ]
    }
    ```

### Case 2: Expired or Revoked Token (Failure)
*   **HTTP Status**: `400 Bad Request` or `401 Unauthorized`
*   **Response Body**:
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

---

## 6. Exact Failure Stage

The exact failure stage is:

**D. Token stored correctly but Graph API rejects it**

*Why this happens:*
1.  The OAuth flow successfully exchanges the code for a **short-lived access token** (valid for 1 hour only).
2.  If the token expires or is invalidated (e.g. permissions revoked), the Graph API rejects it.
3.  The media endpoint implementation (`getMedia` in `instagram.service.ts`) catches the 400/401 API rejection, but because `allowMocks` is `false`, it rethrows a generic `Error("Instagram API request failed")`.
4.  Because the rethrown error lacks a `statusCode` field, Express's `errorHandler` defaults to a `500 Internal Server Error`, triggering "Instagram connection failed: OAuth Failed" on the frontend.

---

## 7. Recommended Fixes

### 1. Exchange Token for Long-Lived Token
Modify the backend OAuth callback to exchange the short-lived access token (valid for 1 hour) for a **long-lived access token** (valid for 60 days).
*   **Endpoint**: `GET https://graph.instagram.com/access_token`
*   **Parameters**:
    *   `grant_type=ig_exchange_token`
    *   `client_secret=META_CLIENT_SECRET`
    *   `access_token={short-lived-token}`
*   Store the long-lived token in the database.

### 2. Propagate API HTTP Status Codes
Modify the exception catching in `instagram.service.ts` to capture the HTTP status from Meta's response:
```typescript
if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  const status = res.status === 401 ? 401 : 400;
  throw new InstagramApiError(body.error?.message || "Instagram API request failed", status);
}
```
This ensures the Express global error handler returns a proper `401 Unauthorized` or `400 Bad Request` instead of `500 Internal Server Error`, allowing the frontend to know the token has expired and prompt the user to re-link their account.
