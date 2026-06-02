# Instagram OAuth Runtime Audit

This audit diagnoses the inconsistent behaviors observed during the Instagram connection flow in the production environment.

---

## 1. OAuth Generation Parameter Verification

The backend endpoint `GET /api/instagram/oauth/start` constructs and logs the following redirect details:

### Generated OAuth URL
```text
https://www.instagram.com/oauth/authorize?client_id=1016654697547047&redirect_uri=https%3A%2F%2Fsecond-brain-backend-production-43b4.up.railway.app%2Fapi%2Finstagram%2Foauth%2Fcallback&scope=instagram_graph_user_profile,instagram_graph_user_media&response_type=code&state=prod-state-val
```

### Verified Parameters
* **Endpoint**: `https://www.instagram.com/oauth/authorize` (Modern Instagram Login Endpoint)
* **`client_id`**: `1016654697547047` (Correct Meta App ID)
* **`redirect_uri`**: `https://second-brain-backend-production-43b4.up.railway.app/api/instagram/oauth/callback`
* **`scope`**: `instagram_graph_user_profile,instagram_graph_user_media`
* **`response_type`**: `code`
* **`state`**: `prod-state-val`

---

## 2. Inconsistent Outcomes Analysis

### Case A: "Invalid platform app"
* **Behavior**: Instagram displays `Invalid platform app` before user login.
* **Root Cause**: The user's browser accessed a cached redirect to the legacy endpoint (`api.instagram.com/oauth/authorize`) or environment variables were stale in the Vercel/Railway instance before the domain fix was deployed. 
* **Remediation**: The code has been updated to query `www.instagram.com/oauth/authorize` dynamically, bypassing the legacy API.

### Case B: Vercel 404 on Callback Redirection
* **Behavior**: Callback successfully exchanges the token, updates the database, and redirects the browser to `https://instabrain.co.in/settings?instagram_connect=success`, which returns Vercel `404: NOT_FOUND`.
* **Root Cause**: The frontend is a Single Page Application (React/Vite) running client-side routing. Direct URL paths or server-side redirects (such as backend `res.redirect('/settings')`) hit Vercel's edge directly. Because there is no physical file named `settings`, Vercel returns `404: NOT_FOUND`.
* **Remediation**: Created a `vercel.json` routing rewrite rule in the frontend root to redirect all routes to `index.html`, allowing React Router to capture the redirect URL and parse query parameters correctly.

---

## 3. Environment Configs & Routing Audit

* **`FRONTEND_URL`**: `https://instabrain.co.in` (Accurately configured in production env)
* **Hardcoded Vercel domains**: None. The only Vercel references are in `allowedOrigins` CORS settings and the E2E Playwright test assertions (Vercel preview stubs).
* **Settings Route**: Verified as `/settings` in client-side React routes (`App.jsx`).

---

## 4. Required Fix

1. **Commit and deploy `vercel.json`** to the frontend origin repo. Vercel will process this file and route `/settings` queries back to the app bundle.
2. Ensure Vercel deployment completes successfully.
