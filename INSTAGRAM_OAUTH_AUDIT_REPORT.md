# Instagram OAuth Failure Audit Report

This report documents the architectural audit of the Instagram OAuth authorization flow and the diagnosis of the `Invalid platform app` error.

---

## 1. OAuth Generation Details & Parameters

The backend generates the following authorization redirect URL when a creator initiates account connection:

### Full OAuth URL Being Generated
```text
https://api.instagram.com/oauth/authorize?client_id=1016654697547047&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Finstagram%2Foauth%2Fcallback&scope=instagram_graph_user_profile,instagram_graph_user_media&response_type=code&state={state}
```

### Parameter Breakdown
* **Endpoint**: `https://api.instagram.com/oauth/authorize`
* **`client_id`**: `1016654697547047` (Loaded from `process.env.META_CLIENT_ID`)
* **`redirect_uri`**: `http://localhost:5000/api/instagram/oauth/callback` (Loaded from `process.env.META_REDIRECT_URI`)
* **`scope`**: `instagram_graph_user_profile,instagram_graph_user_media`
* **`response_type`**: `code`

---

## 2. Meta Configuration Verification & Diagnosis

Comparing the generated parameters against the Meta Developer App settings reveals a structural mismatch:

### Diagnosis: F) Mixed Facebook/Instagram OAuth Implementation
* **Endpoint Mismatch**: The code uses the legacy Instagram Basic Display API endpoint domain (`https://api.instagram.com/oauth/authorize`). This legacy server does not support the new v20.0+ Creator Graph scopes (`instagram_graph_user_profile`, `instagram_graph_user_media`).
* **Client ID Mismatch**: The client ID passed (`1016654697547047`) is the Facebook App ID. On the legacy `api.instagram.com` domain, the OAuth server only recognizes the separate **Instagram App ID** (configured under the Instagram Basic Display dashboard). Passing a Facebook App ID to the legacy domain triggers:
  `Invalid request: Request parameters are invalid: Invalid platform app`
* **Scope Mismatch**: The new scopes (`instagram_graph_user_profile,instagram_graph_user_media`) are only recognized on the modern Instagram Graph/Login API domain (`https://www.instagram.com/oauth/authorize`).

---

## 3. Root Cause & Remediation

### Root Cause
The application attempts to request modern Instagram Login for Creators scopes (`instagram_graph_user_profile`, `instagram_graph_user_media`) using the deprecated legacy Instagram Basic Display endpoint domain (`api.instagram.com`) and passes the primary Facebook App ID instead of the Instagram App ID.

### Parameter Corrections

| Parameter | Failing Value | Correct Value |
| :--- | :--- | :--- |
| **Domain/Endpoint** | `https://api.instagram.com/oauth/authorize` | `https://www.instagram.com/oauth/authorize` |
| **`client_id`** | `1016654697547047` (FB App ID) | `{instagram-app-id}` (From Meta App Dashboard -> Instagram Settings) |

---

## 4. Required Code Changes

### File 1: [instagram.oauth.ts](file:///C:/Users/HI10148/.gemini/antigravity/scratch/second-brain-backend/src/services/instagram/instagram.oauth.ts)
Change the host domain from `api.instagram.com` to `www.instagram.com` in `getAuthUrl`:
```diff
-    return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
+    return `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
```

### File 2: [instagram.controller.ts](file:///C:/Users/HI10148/.gemini/antigravity/scratch/second-brain-backend/src/modules/instagram/instagram.controller.ts)
Update `startOAuth` to generate the URL with the correct `www.instagram.com` domain:
```diff
-        const authorizeUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_graph_user_profile,instagram_graph_user_media&response_type=code&state=${state}`;
+        const authorizeUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_graph_user_profile,instagram_graph_user_media&response_type=code&state=${state}`;
```

### Environment Config: `.env`
Ensure `META_CLIENT_ID` is set to the specific **Instagram App ID** (available under the Instagram product setup in your Meta Developer Console) rather than the parent Facebook App ID:
```ini
META_CLIENT_ID=your_instagram_app_id
```
