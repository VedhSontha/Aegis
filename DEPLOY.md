# AEGIS — Deployment Runbook

Two pieces: **server → Render**, **client → Vercel**. MongoDB Atlas is already live.
Deploy the **server first** (you need its URL for the client), then the client, then
point the server's CORS back at the client URL.

---

## 0. Prereqs
- Code pushed to a GitHub repo (Vercel + Render deploy from GitHub).
- MongoDB Atlas cluster with Network Access `0.0.0.0/0` (already done).
- (Optional) Anthropic API key for the AI analyst.

---

## 1. Server → Render
1. [render.com](https://render.com) → **New** → **Web Service** → connect the repo.
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - Instance type: Free is fine for the demo.
3. **Environment variables** (Render → Environment):
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | your Atlas SRV-off connection string (same as local `.env`) |
   | `CLIENT_ORIGIN` | leave blank for now — set after Vercel is live |
   | `ALLOW_LOCAL_SCANS` | `false`  ← important: keep SSRF protection on in prod |
   | `SCAN_TIMEOUT_MS` | `8000` |
   | `MAX_CONCURRENCY` | `4` |
   | `ANTHROPIC_API_KEY` | your key (omit to leave AI disabled) |
   | `AEGIS_AI_MODEL` | `claude-3-5-sonnet-latest` |
   - Do **not** set `PORT` — Render injects it; the server already reads `process.env.PORT`.
4. Deploy. When live, copy the URL, e.g. `https://aegis-xxxx.onrender.com`.
5. Sanity check: open `https://aegis-xxxx.onrender.com/health` → should return `{"status":"UP",...}`.

---

## 2. Client → Vercel
1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the repo.
2. Settings:
   - **Root Directory:** `client`
   - Framework Preset: **Next.js** (auto-detected).
3. **Environment variable:**
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_BASE` | `https://aegis-xxxx.onrender.com/api`  ← your Render URL + `/api` |
   - This is read at **build time**, so set it before deploying (or redeploy after).
4. Deploy. Copy the URL, e.g. `https://aegis-yyyy.vercel.app`.

---

## 3. Close the CORS loop
1. Back in Render → Environment, set:
   - `CLIENT_ORIGIN` = `https://aegis-yyyy.vercel.app` (your Vercel URL, no trailing slash)
2. Save → Render redeploys. Now the browser can call the API.

---

## 4. Keep Render awake (free tier sleeps after 15 min idle)
A cold server makes the first scan time out — bad on camera.
- [cron-job.org](https://cron-job.org) (free) → new cron job:
  - URL: `https://aegis-xxxx.onrender.com/health`
  - Interval: every **10 minutes**
- Hit `/health` yourself ~1 min before recording so it's warm.

---

## 5. Smoke test the live deploy
1. Open the Vercel URL → landing loads, tree renders.
2. Scan the **AEGIS Range**: `https://aegis-yyyy.vercel.app/range` → should stream and grade **F**.
3. Open the clickjacking finding → **Run Exploit** → the live Range frames inside the attacker box.
4. (If AI key set) **Generate Briefing** → real Claude analysis appears.
5. Scan `https://aegis-yyyy.vercel.app/range?safe=1` → should grade **A/A+** (the "patched" state).

---

## Gotchas
- **Mixed content:** the live client is HTTPS, so it can only frame HTTPS targets in the exploit proof. The Range and most real targets are HTTPS — fine.
- **`NEXT_PUBLIC_API_BASE` baked at build:** if you change the server URL, redeploy the client.
- **First scan slow?** Render cold start — see step 4.
- **CORS error in console:** `CLIENT_ORIGIN` doesn't exactly match the Vercel URL (trailing slash / wrong subdomain).
