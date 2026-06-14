# AEGIS — Complete Feature Checklist

> Scan. Prove. Patch. Re-grade. — a real web/repo security scanner with a cinematic UI.
> `[x]` = built & working · `[ ]` = remaining task (not a feature)

---

## 1. Scan Engine (core)
- [x] Scan any **public website URL**
- [x] Scan any **public GitHub repository** (`github:owner/repo` or full `github.com/...` URL)
- [x] Smart **target parsing/normalization** (auto-prepends `https://`, detects GitHub vs URL)
- [x] **Target-type detection** (`url` vs `repo`) drives which checks run
- [x] Real **HTTP fetcher** with custom User-Agent
- [x] **Manual redirect following** (up to 5 hops) with full **redirect-chain tracking**
- [x] **Header extraction** (normalized lowercase)
- [x] **Set-Cookie extraction** & parsing
- [x] **Body snippet capture** (first 50 KB)
- [x] **TLS certificate inspection** via raw `tls.connect` (SNI, issuer, expiry, authorized flag)
- [x] **Configurable timeout** (8 s default, `AbortController`)
- [x] **Concurrency-limited** check execution (4 at a time, chunked)
- [x] **Per-check error isolation** (one failing check can't crash the scan)
- [x] **Modular, extensible check registry** (`{id, category, title, severity, weight, run()}`)

## 2. Security Checks — 14 total
**Headers (6)**
- [x] **Content-Security-Policy** — missing *and* `unsafe-inline`-without-nonce/hash detection (high, w1.4)
- [x] **HSTS** — missing *and* weak `max-age` (< 6 months) detection (high, w1.2)
- [x] **X-Frame-Options** — missing (accepts CSP `frame-ancestors`) (medium, w1.2)
- [x] **X-Content-Type-Options** — missing / not `nosniff` (low, w1.0)
- [x] **Referrer-Policy** — missing (low, w1.0)
- [x] **Permissions-Policy** — missing (low, w1.0)

**Transport / TLS (3)**
- [x] **HTTPS enforced** — unencrypted-protocol detection (high, w1.5)
- [x] **HTTP→HTTPS redirect** — verifies auto-redirect via the redirect chain (medium, w1.0)
- [x] **Certificate validity** — self-signed/invalid + **expiry warning (< 15 days)** + issuer (medium, w1.0)

**Cookies (1)**
- [x] **Secure cookie directives** — per-cookie `HttpOnly` / `Secure` / `SameSite` audit, **dynamic severity** (medium, w1.0)

**CORS (1)**
- [x] **CORS misconfiguration** — **real active probe** with a malicious `Origin`; detects wildcard+credentials (critical) and arbitrary-origin reflection (high, w1.5)

**Disclosure (1)**
- [x] **Server info disclosure** — `Server` / `X-Powered-By` version-leak detection (low, w1.0)

**Clickjacking (1)**
- [x] **Framing protection** — XFO or CSP `frame-ancestors` (medium, w1.3)

**Dependencies (1, repo scans)**
- [x] **Vulnerable NPM dependencies** — fetches `package.json` from GitHub (main/master), queries the **OSV.dev** CVE database (up to 15 packages)
- [x] Also flags missing **`SECURITY.md`** and **`.github/dependabot.yml`** (high, w1.5)

## 3. SSRF Protection (security control)
- [x] Blocks **private IPv4** ranges (127/8, 10/8, 192.168, 169.254, 172.16–31)
- [x] Blocks **IPv6** loopback / link-local / unique-local (`::1`, `fe80:`, `fc00:`, `fd00:`)
- [x] **DNS-resolution check** — resolves the hostname and re-checks the IP (anti-DNS-rebinding)
- [x] **Protocol whitelist** (http/https only)
- [x] `ALLOW_LOCAL_SCANS` env toggle (on in dev, off in prod)

## 4. Scoring & Grading
- [x] **Severity-weighted penalties** (critical 25 / high 15 / medium 8 / low 3) × per-check weight
- [x] Score **clamped 0–100**
- [x] **Letter grades** A+ (≥97) · A (≥93) · A- (≥90) · B (≥80) · C (≥70) · D (≥55) · F (<55)
- [x] **Target-type-aware** (deps excluded from URL scores; web checks excluded from repo scores)
- [x] **Severity summary counts** (critical/high/medium/low/passed) persisted per scan

## 5. Live Streaming (SSE)
- [x] **Server-Sent Events** scan stream
- [x] **Per-check live events** (each result streamed the instant it finishes)
- [x] **`done`** event with final score/grade/summary
- [x] **`error`** event with message
- [x] **Keep-alive ping** every 15 s
- [x] **`X-Accel-Buffering: no`** (defeats reverse-proxy buffering)
- [x] Scan status lifecycle (`pending → scanning → complete / error`)

## 6. Persistence (MongoDB Atlas)
- [x] **Scan** model (target, type, status, score, grade, summary, timestamps, indexed)
- [x] **Finding** model (normalized, keyed by `scanId`, evidence + fix + severity + weight, indexed)
- [x] Bulk `insertMany` of findings; reproducible report retrieval

## 7. Remediation Generators (the "Patch" pillar)
- [x] **AEGIS Shield** — tailored middleware containing **only the missing headers**
  - [x] **Express** variant (`aegis-shield.js`)
  - [x] **Next.js** App Router variant (`middleware.ts`, with matcher config)
  - [x] Inline comments explaining each header
- [x] **CI/CD security gate** generator
  - [x] **GitHub Actions** (`aegis.yml`) — fails PRs at grade D/F
  - [x] **GitLab CI** (`.gitlab-ci.yml`) — same gate
- [x] **Markdown audit report** export (summary table, failed/passed checks, remediation details, embedded shield code for both frameworks)
- [x] **SVG README badge** — live security rating, color-coded by grade

## 8. AI Security Analyst (Claude)
- [x] Claude-powered **threat briefing** from the real findings (native `fetch`, no SDK dependency)
- [x] **Structured output** — headline, risk level, executive summary, ranked priorities
- [x] Per-finding **Attack → Impact → Fix** breakdown
- [x] **Configurable model** (`AEGIS_AI_MODEL`)
- [x] **Graceful degradation** (clean "not configured" message with no key; JSON-parse fallback)
- [ ] *Activate by pasting your `ANTHROPIC_API_KEY` into `server/.env`*

## 9. AEGIS Range (built-in vulnerable target)
- [x] Intentionally **vulnerable** route (`/range`) — raw Route Handler (bypasses Next header injection)
- [x] Missing CSP / HSTS / X-Frame-Options
- [x] **Insecure cookies** (no flags)
- [x] **Wildcard CORS + credentials**
- [x] **Leaky** `Server` / `X-Powered-By`
- [x] **Reflected XSS** sink (`?q=`)
- [x] **`?safe=1` patched mode** (all headers set, input sanitized) for the before/after demo

## 10. Exploit Proof / Simulator (the "Prove" pillar)
- [x] **Live clickjacking PoC** — embeds the **real target** in an attacker `<iframe>` with a decoy overlay
- [x] Verdict driven by the **real scan result** (`finding.passed`), not a timer/fake
- [x] **Real XSS execution** test against the Range (via `postMessage`)
- [x] **Honest scoping** — never injects into third-party sites it doesn't own
- [x] **Evidence + attacker-impact** view for non-framing findings
- [x] Per-finding attacker-impact copy (HSTS, CORS, CSP, cookies, disclosure, clickjacking)

## 11. Re-grade payoff (the "Re-grade" pillar)
- [x] **Before/After reveal banner** — old grade → new grade, animated **+points**, **N issues fixed**
- [x] **Per-target grade memory** in `localStorage` — re-scanning a target (incl. `/range` → `/range?safe=1`) auto-fires the delta
- [x] In-app **Re-Scan** button
- [x] Grade ring glow + count-up

## 12. Frontend pages
- [x] **Landing** (`/`) — hero, scan input, signature tree, threat intel, feature cards
- [x] **Scan dashboard** (`/scan/[id]`) — live console, grade ring, category rings, tree, AI briefing, findings, remediation
- [x] **Read-only report** (`/report/[id]`) — shareable snapshot (badge links here)
- [x] **AEGIS Range** (`/range`)

## 13. Frontend components
- [x] **ScanInput** — URL/repo field, **Hot Targets** (Range + expressjs/express), error + loading states
- [x] **AttackConsole** — live terminal, color-coded lines, auto-scroll, traffic-light header, CRT scanlines
- [x] **GradeRing** — animated count-up, SVG ring, glow, grade-colored
- [x] **CategoryRings** — per-category posture % (Headers/Transport/Cookies/CORS/Framing)
- [x] **RemediationDrawer** — 4 tabs: **Fix · Shield SDK · CI/CD Gate · Exploit Test**, copy-to-clipboard, file downloads
- [x] **ExploitSimulator** (see §10)
- [x] **AiBriefing** (see §8) — with loading skeletons + error state
- [x] **RescanReveal** (see §11)
- [x] **ThreatIntelTile** — DB-backed: total audits, threats detected, most-common vuln, **live ticker** with **masked** target names, auto-refresh every 30 s
- [x] **ScrambleText** — hover/decode scramble effect on the headline

## 14. The Living Tree (signature 3D visual)
- [x] **Procedural Three.js tree** (tapered trunk, recursive branches, puff canopy + instanced leaves)
- [x] **Score-driven color** — withered red/amber → lush green
- [x] **Bloom** post-processing glow
- [x] **Fireflies** that fade in when healthy
- [x] **Ground glow disc** + ambient **star field** + fog
- [x] **Time-based growth** that **freezes when settled** (performance) 
- [x] **Auto-rotate** + drag-to-orbit (locked to a flattering 3/4 range)
- [x] **Auto-framing camera** (never clips at any rotation)
- [x] **WebGL fallback to 2D SVG** tree
- [x] Health footer (% + COMPROMISED/STABLE/HEALTHY)
- [x] Landing-page **score slider** to preview wither↔bloom

## 15. Visual / design system
- [x] **Design tokens** (CSS vars: forest palette, muted severity colors)
- [x] **Tailwind v4** theme
- [x] **Ambient background** — radial green light pools + fading blueprint grid + CRT scanlines
- [x] **Mono scramble headline** (no generic gradient)
- [x] **Corner-bracket** instrument framing on key panels
- [x] **Elevated card** style + **sharpened corner radii**
- [x] **Fonts** — Space Grotesk (display) + JetBrains Mono (mono)
- [x] Custom scrollbar, shimmer + fade-in animations
- [x] **AEGIS shield favicon** + proper page `<title>`/description
- [x] **Responsive** (mobile verified, no overflow)

## 16. API surface
- [x] `POST /api/scan` — create scan (SSRF-guarded)
- [x] `GET /api/scan/:id` — scan + findings
- [x] `GET /api/scan/:id/stream` — SSE live stream
- [x] `POST /api/generate/shield` — Express/Next middleware
- [x] `POST /api/generate/cicd` — GitHub/GitLab gate
- [x] `POST /api/ai/analyze` — Claude briefing
- [x] `GET /api/stats` — platform metrics
- [x] `GET /api/report/:id/export.md` — markdown report
- [x] `GET /api/report/badge/:id.svg` — SVG badge
- [x] `GET /health` — uptime/keep-alive

## 17. Backend hardening / infra
- [x] **Express 5** server, modular routes/controllers/services
- [x] **CORS** origin whitelist (env-driven)
- [x] **Rate limiting** (30 req/min on scan endpoint)
- [x] **Global error handler** + 404 fallback
- [x] **Env-config** (Mongo URI, PORT, origin, scan timeout, concurrency, AI key/model, local-scan toggle)
- [x] **Production builds verified** — client (`next build`) + server (`tsc`) both green
- [x] Preview/launch config, `.gitignore`, Devfolio `.mcp.json`

## 18. Docs
- [x] `AEGIS_BUILD_SPEC.md` — full build spec
- [x] `DEPLOY.md` — Vercel + Render + Atlas runbook
- [x] `DEMO_SCRIPT.md` — timed 5-minute walkthrough
- [x] `FEATURES_CHECKLIST.md` — this file

---

## Remaining (tasks, not features)
- [ ] Add `ANTHROPIC_API_KEY` to activate AI
- [ ] Deploy client → Vercel, server → Render (see `DEPLOY.md`)
- [ ] Keep-Render-awake ping (cron-job.org → `/health`)
- [ ] Seed Threat-Intel tile with a few real scans before recording
- [ ] Record the 5-minute video (see `DEMO_SCRIPT.md`)
- [ ] Incremental git commits + Devfolio submission
