# AEGIS — Full Build Specification
### Devlynix Buildathon 2.0 · Track 2 (Cybersecurity Tooling)
**Tagline:** *Scan. Prove. Patch. Re-grade.*

> **READ FIRST — Anti-plagiarism timestamp rule.** This file is a **design document only**. Per the Devlynix manual, the actual GitHub repo must be created **after June 12, 2026, 6:00 PM IST**, with continuous commits across the 72 hours. Do **not** commit pre-written application code before launch. Use this spec to build fresh, in vertical slices, committing every 1–2 hours. This doc is your blueprint, not your codebase.

This document is written so any developer or coding agent can build AEGIS exactly as intended. It contains the product vision, exact tech stack, repo structure, data models, scoring math, every check module, all API contracts, the generators, the design system (exact colors/typography/spacing), every screen, and an hour-by-hour build plan mapped to the grading rubric.

---

## 0. Why AEGIS wins (rubric alignment)

The Devlynix rubric (100 pts): Functional Execution & Deployment (30), Technical Depth & Code Quality (30), UI/UX (20), Video + Architecture Walkthrough (20). **60% rewards a real, explainable, stably-deployed backend.** AEGIS is built to bank all four buckets:

| Bucket | How AEGIS earns it |
|---|---|
| Execution & Deployment (30) | All scans are real but fast (timeout-capped). Single hero loop that never crashes on stage. Deployed on Render + Vercel + Atlas. |
| Technical Depth (30) | Modular check engine, normalized MongoDB (`scans` ⇄ `findings`), SSRF guard, rate limiting, OSV CVE integration, code generators. |
| UI/UX (20) | "Silent Coder" charcoal + forest-green **bento grid**, animated grade ring, live terminal console. |
| Video Walkthrough (20) | Clean controllers/routes; every dramatic UI moment is backed by real code you open on camera. Say the phrases "secure controller logic", "database normalization", "SSRF guard". |

**The one rule that governs every feature: REAL ENGINE, CINEMATIC SKIN.** Never mock a result. Security judges distrust faked output — one fake taints everything. Every flashy moment sits on a real mechanism.

---

## 1. The product in one paragraph

A user pastes a **URL** or **GitHub repo** into AEGIS. A live, terminal-style **Attack Console** streams each security check as it runs (Server-Sent Events). The results resolve into an **A–F security grade** on a bento dashboard. Each finding is **proven real** (e.g., the target's own page loaded in an iframe to demonstrate clickjacking; the actual `Access-Control-Allow-Origin: *` header shown). The user opens the **Remediation Drawer** and downloads a tailored **`aegis-shield.js`** middleware (only the headers they were missing) plus a **CI/CD pipeline YAML** and a **Markdown audit report**. They drop the shield into their app, hit **Re-Scan**, and watch the grade climb **F → A+** while the exploit test now shows **`[Blocked]`**. A built-in **AEGIS Range** (the team's own intentionally vulnerable demo app) guarantees a juicy, legal, reliable demo target.

### The 90-second demo arc (this is also the video script spine)
1. Paste the AEGIS Range URL → Attack Console streams checks live.
2. Grade ring lands on **F**. Category rings fill (Headers red, Transport green…).
3. Click "Clickjacking" finding → the Range page loads framed inside AEGIS with a red overlay → **proof it's real**.
4. Open Remediation Drawer → download `aegis-shield.js` (6 headers) + show the CI/CD tab.
5. Drop shield into the Range → **Re-Scan** → grade animates **F → A+**.
6. Click "Run exploit test" again → **`[Blocked — CSP enforced]`**.
7. Export Markdown audit + show the shareable `/report/:id` link. Done.

---

## 2. Tech stack & deployment (exact)

**Monorepo, two apps + one DB.** This separation gives the cleanest "frontend / backend controllers / database" story for the video.

- **`client/`** — Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Framer Motion (animations) + Tabler/Lucide icons. **Deploy: Vercel.**
- **`server/`** — Node.js + Express + TypeScript + Mongoose. Hosts all scan logic, SSE, generators. **Deploy: Render (Web Service).** *Reason to say on video: Vercel serverless functions time out and can't hold an SSE stream; Render runs a persistent Node process.*
- **Database** — MongoDB Atlas (free M0 tier).
- **External APIs** — OSV.dev (free, no key, dependency CVEs), GitHub REST API (public, optional token for rate limits).
- **Optional AI** — none required. (If you add an AI "audit summary", use the Anthropic API server-side with a keyless fallback string so the demo never breaks.)

**Env vars:**
- `server/.env`: `MONGODB_URI`, `PORT=8080`, `CLIENT_ORIGIN=https://<vercel-app>`, `GITHUB_TOKEN` (optional), `SCAN_TIMEOUT_MS=8000`, `MAX_CONCURRENCY=6`.
- `client/.env.local`: `NEXT_PUBLIC_API_BASE=https://<render-service>/api`.

**CORS:** server allows `CLIENT_ORIGIN` only. **Rate limit:** `express-rate-limit`, 30 req/min/IP on `/api/scan`.

---

## 3. Repository structure (exact)

```
aegis/
├── client/                              # Next.js frontend (Vercel)
│   ├── app/
│   │   ├── layout.tsx                   # fonts, globals, <body> charcoal bg
│   │   ├── page.tsx                     # Landing + scan input + threat tile
│   │   ├── globals.css                  # CSS variables (design tokens)
│   │   ├── scan/[id]/page.tsx           # Live report dashboard (SSE + bento)
│   │   ├── report/[id]/page.tsx         # Public read-only shareable report
│   │   └── range/page.tsx               # AEGIS Range vulnerable demo target
│   ├── components/
│   │   ├── ScanInput.tsx
│   │   ├── GradeRing.tsx
│   │   ├── CategoryRings.tsx
│   │   ├── AttackConsole.tsx
│   │   ├── BentoGrid.tsx
│   │   ├── FindingCard.tsx
│   │   ├── RemediationDrawer.tsx        # tabs: Fix | Shield | CI/CD | Exploit
│   │   ├── ExploitSimulator.tsx
│   │   ├── ThreatIntelTile.tsx
│   │   └── ui/                          # Badge, Card, Button, Tab, Ring primitives
│   ├── lib/
│   │   ├── api.ts                       # fetch wrappers to NEXT_PUBLIC_API_BASE
│   │   ├── sse.ts                       # EventSource helper
│   │   └── types.ts                     # shared TS types (Finding, Scan…)
│   └── tailwind.config.ts
└── server/                              # Express backend (Render)
    ├── src/
    │   ├── index.ts                     # app bootstrap: cors, json, rate-limit, routes
    │   ├── db.ts                        # mongoose connect
    │   ├── routes/
    │   │   ├── scan.routes.ts           # POST /scan, GET /scan/:id, GET /scan/:id/stream
    │   │   ├── report.routes.ts         # GET /scan/:id/export.md, GET /badge/:id.svg
    │   │   ├── generate.routes.ts       # POST /generate/shield, /generate/cicd
    │   │   └── stats.routes.ts          # GET /stats
    │   ├── controllers/
    │   │   ├── scan.controller.ts
    │   │   ├── report.controller.ts
    │   │   ├── generate.controller.ts
    │   │   └── stats.controller.ts
    │   ├── checks/                      # THE ENGINE — one module per check
    │   │   ├── index.ts                 # registry + runChecks(context)
    │   │   ├── headers.check.ts
    │   │   ├── tls.check.ts
    │   │   ├── cookies.check.ts
    │   │   ├── cors.check.ts
    │   │   ├── disclosure.check.ts
    │   │   ├── clickjack.check.ts
    │   │   └── deps.check.ts            # GitHub package.json → OSV.dev
    │   ├── services/
    │   │   ├── score.service.ts         # findings → score → grade
    │   │   ├── ssrf.guard.ts            # block private/internal targets
    │   │   ├── fetcher.service.ts       # single timeout-capped fetch → ScanContext
    │   │   ├── github.service.ts
    │   │   └── osv.service.ts
    │   ├── generators/
    │   │   ├── shield.generator.ts
    │   │   ├── cicd.generator.ts
    │   │   └── markdown.generator.ts
    │   └── models/
    │       ├── Scan.model.ts
    │       └── Finding.model.ts
    └── package.json
```

---

## 4. Data models (MongoDB / Mongoose — exact)

### `Scan`
```ts
{
  _id: ObjectId,
  target: string,            // normalized: "https://acme.com" or "github:owner/repo"
  targetType: "url" | "repo",
  status: "pending" | "scanning" | "complete" | "error",
  score: number,             // 0–100
  grade: string,             // "A+","A","A-","B","C","D","F"
  summary: {                 // denormalized counts for fast listing
    critical: number, high: number, medium: number, low: number, passed: number
  },
  createdAt: Date,
  completedAt: Date | null
}
```
Indexes: `{ createdAt: -1 }` (for stats/recent feed).

### `Finding` (normalized — one document per check result)
```ts
{
  _id: ObjectId,
  scanId: ObjectId,          // ref Scan, INDEXED
  checkId: string,           // "csp","hsts","cookie-httponly","cors-wildcard"…
  category: "headers" | "transport" | "cookies" | "cors" | "disclosure" | "clickjacking" | "dependencies",
  title: string,             // human label, sentence case
  severity: "critical" | "high" | "medium" | "low" | "info",
  passed: boolean,
  evidence: string,          // the REAL value seen (header value, response snippet, cookie)
  description: string,       // what it means / risk
  fix: { text: string, code: string, lang: "http"|"js"|"bash"|"yaml" },
  weight: number             // contribution to score (see §5)
}
```
Index: `{ scanId: 1 }`.

> **Say on video:** "Findings are a separate normalized collection keyed by `scanId`, not embedded — that's `database normalization`." (Rubric phrase.)

---

## 5. Scoring & grading (exact algorithm)

`score.service.ts` turns findings into a grade.

```
START score = 100
For each FAILED finding: score -= penalty(severity) * weightFactor
penalty: critical=25, high=15, medium=8, low=3, info=0
weightFactor = finding.weight (default 1.0; raise for flagship checks)
score = clamp(score, 0, 100)
```

**Grade thresholds:**
| Grade | Score |
|---|---|
| A+ | ≥ 97 |
| A | 93–96 |
| A- | 90–92 |
| B | 80–89 |
| C | 70–79 |
| D | 55–69 |
| F | < 55 |

Keep it deterministic and explainable — a judge may ask "why D?" and you point at the failed-findings sum.

---

## 6. The check engine (the heart — exact specs)

### 6.0 Contract
Every check implements:
```ts
interface Check {
  id: string;
  category: Finding["category"];
  title: string;
  severity: Finding["severity"];   // severity if FAILED
  weight: number;
  run(ctx: ScanContext): Promise<{ passed: boolean; evidence: string; fix: Finding["fix"]; descriptionOverride?: string }>;
}
```
`runChecks(ctx)` iterates the registry, runs checks (respecting `MAX_CONCURRENCY`), emits each result for SSE, and returns the full array.

### 6.1 `ScanContext` (fetched ONCE, shared by all URL checks)
`fetcher.service.ts` does a single timeout-capped request and builds:
```ts
{
  url: string,
  finalUrl: string,           // after redirects
  protocol: "http" | "https",
  redirectChain: string[],
  status: number,
  headers: Record<string,string>,   // lowercased keys
  setCookies: string[],              // raw Set-Cookie lines
  bodySnippet: string,               // first ~50KB for reflection checks
  tls: { valid: boolean, issuer?: string, validTo?: string } | null
}
```
Use `node-fetch`/native `fetch` with `AbortController` timeout = `SCAN_TIMEOUT_MS`. For TLS cert: `tls.connect(443, host)` → `getPeerCertificate()` → read `valid_to`.

### 6.2 `headers.check.ts` — emits MULTIPLE findings
Inspect `ctx.headers`. One finding per header:
| checkId | Header checked | Pass = present | Severity if missing | weight |
|---|---|---|---|---|
| `csp` | `content-security-policy` | present & not `unsafe-inline` everywhere | high | 1.4 |
| `hsts` | `strict-transport-security` | present, `max-age` ≥ 15552000 | high | 1.2 |
| `xfo` | `x-frame-options` OR CSP `frame-ancestors` | present | medium | 1.2 |
| `xcto` | `x-content-type-options: nosniff` | present | low | 1.0 |
| `refpol` | `referrer-policy` | present | low | 1.0 |
| `permpol` | `permissions-policy` | present | low | 1.0 |
Evidence example (fail): `"Content-Security-Policy header not present in response."` Fix.code = the exact header line to add.

### 6.3 `tls.check.ts`
- `https-present`: is `ctx.protocol === "https"`? Fail → high (weight 1.5). Evidence: scheme.
- `https-redirect`: does `http://target` 301/302 to `https://`? Fail → medium. Evidence: redirect chain.
- `cert-valid`: `ctx.tls.valid` and not near expiry. Fail/expiring → medium. Evidence: issuer + validTo.

### 6.4 `cookies.check.ts`
Parse each `ctx.setCookies` line. For each cookie emit findings for missing `HttpOnly` (medium), `Secure` (medium), `SameSite` (low). Evidence: `"Cookie 'session' set without HttpOnly, Secure."` Fix: corrected Set-Cookie.

### 6.5 `cors.check.ts`
Send a request with header `Origin: https://aegis-probe.example`. Inspect response:
- `Access-Control-Allow-Origin: *` **and** `Access-Control-Allow-Credentials: true` → **critical** (weight 1.5).
- Reflects the arbitrary origin back → high.
- Restrictive/absent → pass.
Evidence: the actual `Access-Control-Allow-Origin` value received. *(This is real, shown verbatim.)*

### 6.6 `disclosure.check.ts`
Check `server` and `x-powered-by` for version strings (regex `\/?\d+\.\d+`). Present → low/medium. Evidence: `"Server: nginx/1.18.0"`. Bonus: flag if version is known-old (maintain a tiny static map; optional).

### 6.7 `clickjack.check.ts` (powers the iframe Proof)
Framable if **no** `x-frame-options` AND **no** CSP `frame-ancestors`. Framable → medium (weight 1.3). Evidence: `"No X-Frame-Options or CSP frame-ancestors; page can be embedded."` The UI uses this finding to actually load the target in an iframe as proof.

### 6.8 `deps.check.ts` (repo mode only)
Given `github:owner/repo`:
1. `github.service.ts`: fetch `package.json` (GitHub contents API, base64 decode). Parse `dependencies` + `devDependencies`.
2. For each `{name, version}`: `osv.service.ts` → `POST https://api.osv.dev/v1/query` body `{ "package": {"ecosystem":"npm","name": name}, "version": cleanSemver(version) }`.
3. If vulns returned: one finding per vulnerable package. Severity from OSV `database_specific.severity` / CVSS (CRITICAL/HIGH/MODERATE/LOW → map). Evidence: `"lodash@4.17.11 → CVE-2021-23337 (fixed in 4.17.21)"`. Fix: `"Upgrade to >= 4.17.21"`.
Also flag: missing `SECURITY.md`, no Dependabot config (low). Optional: regex-scan repo tree for committed secrets (AWS keys `AKIA[0-9A-Z]{16}`, `.env` patterns) → critical.

---

## 7. SSRF guard (`ssrf.guard.ts`) — security flagship

Run BEFORE any fetch. Reject the scan (HTTP 400) if the target hostname resolves to or is:
- `localhost`, `127.0.0.0/8`, `::1`
- Private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`
- Cloud metadata: `169.254.169.254`
- Non-`http(s)` protocols; non-standard internal ports.
DNS-resolve the host and re-check the resolved IP (prevents DNS-rebinding). 

> **Say on video:** "We sanitize scan targets against an SSRF guard and rate-limit the endpoint" = the rubric's `secure controller logic`.

---

## 8. API contracts (exact)

Base: `https://<render>/api`. All JSON unless noted.

### `POST /api/scan`
Req: `{ "target": "https://acme.com" }` (URL or `owner/repo` or full GitHub URL — server normalizes & detects type).
Flow: validate → SSRF guard → create `Scan{status:"pending"}` → return `{ "scanId": "..." }`.

### `GET /api/scan/:id/stream` — **SSE**
Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
Runs the engine; emits per check:
```
event: check
data: {"checkId":"csp","title":"Content-Security-Policy missing","passed":false,"severity":"high","category":"headers"}
```
At the end:
```
event: done
data: {"scanId":"...","grade":"F","score":41,"summary":{"critical":1,"high":3,"medium":2,"low":2,"passed":4}}
```
On error: `event: error`. Persist `Scan` + all `Finding`s before/at `done`.

### `GET /api/scan/:id`
Returns `{ scan, findings: [...] }` — used by the dashboard render and the public report.

### `POST /api/generate/shield`
Req: `{ "scanId":"...", "framework":"express" | "next" }`. Returns `{ "filename":"aegis-shield.js", "content":"..." }` — only the headers that FAILED in that scan. (See §10.)

### `POST /api/generate/cicd`
Req: `{ "scanId":"...", "platform":"github" | "gitlab" }`. Returns `{ "filename":".github/workflows/aegis.yml", "content":"..." }`.

### `GET /api/scan/:id/export.md`
Returns Markdown audit (`Content-Disposition: attachment; filename="aegis-audit.md"`).

### `GET /api/stats`
Returns `{ totalScans, totalFindings, mostCommonVuln, recent: [{ hostMasked, city?, grade }] }` via Mongo aggregation. Powers the Threat Intel tile. **Real data from your DB — never random.**

### `GET /api/badge/:id.svg` (stretch)
Returns an SVG badge showing the grade.

---

## 9. Generators (exact output)

### 9.1 `aegis-shield.js` — Express variant
Include ONLY lines for failed header checks.
```js
// aegis-shield.js — generated by AEGIS for https://acme.com on 2026-06-13
// Express: app.use(require('./aegis-shield'))
module.exports = function aegisShield(req, res, next) {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};
```
### 9.2 Next.js variant → `middleware.ts`
```ts
import { NextResponse } from 'next/server';
export function middleware() {
  const res = NextResponse.next();
  res.headers.set('Content-Security-Policy', "default-src 'self'");
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
```
### 9.3 CI/CD — GitHub Actions `.github/workflows/aegis.yml`
```yaml
name: AEGIS Security Gate
on: [pull_request]
jobs:
  aegis-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Run AEGIS scan
        run: |
          GRADE=$(curl -s -X POST https://<aegis-api>/api/scan \
            -H 'Content-Type: application/json' \
            -d "{\"target\":\"${{ secrets.DEPLOY_URL }}\"}" | jq -r '.grade')
          echo "AEGIS grade: $GRADE"
          if [[ "$GRADE" =~ ^(D|F)$ ]]; then
            echo "::error::Security grade $GRADE is below threshold (C)"; exit 1; fi
```
### 9.4 Markdown audit (`markdown.generator.ts`)
Header (target, grade, date) → summary counts → table of findings (severity, title, evidence) → the generated shield code block. Clean, paste-into-a-PR ready.

---

## 10. AEGIS Range (your own vulnerable demo target)

A route in `client/app/range/page.tsx` (or a tiny Express route) that is **intentionally insecure** so AEGIS can scan it and reliably score **F**, and the exploit simulator can fire **legally and safely** (you own it).
- Sends **no** security headers (CSP, HSTS, XFO, etc.).
- Reflects `?q=` into the HTML **unescaped** (real reflected-XSS surface for the sandboxed demo).
- Sets `Set-Cookie: session=demo` with **no** HttpOnly/Secure/SameSite.
- Is **framable** (no X-Frame-Options) → clickjacking proof works.
- Banner at top: **"AEGIS Range — intentionally vulnerable demo environment."**
- Provide a **patched variant** (`/range?safe=1`) that adds all headers → used to demonstrate the `[Blocked]` state after "patching."

> On Vercel, Next may inject some headers — verify the Range truly lacks them (use a route handler returning a raw `Response` with controlled headers). The Range existing in YOUR repo = the legal/ethical foundation for all live exploit demos.

---

## 11. Frontend — routes, components, behavior

### Routes
- `/` — landing: hero, `ScanInput`, example chips ("Try the AEGIS Range", "Scan a URL", "Scan a GitHub repo"), `ThreatIntelTile`.
- `/scan/[id]` — live dashboard: opens `EventSource` to `/scan/:id/stream`, renders `AttackConsole` live, then animates `GradeRing` + bento on `done`.
- `/report/[id]` — read-only public report (no live stream; fetches `/scan/:id`). Shareable.
- `/range` — the vulnerable demo target.

### Key components
- **`ScanInput`** — big input + scan button. Detects URL vs repo. POSTs `/scan`, routes to `/scan/:id`.
- **`AttackConsole`** — monospace terminal. Appends a line per `check` SSE event with an icon (`ti-check` green / `ti-x` red / `ti-alert-triangle` amber). Ends with `> scan complete — grade X`.
- **`GradeRing`** — large SVG ring, arc length = score%, color by grade (F/D red, C amber, B green-ish, A forest). Framer Motion count-up + arc draw. On Re-Scan, animates from old → new score.
- **`CategoryRings`** — 5 mini rings (Headers, Transport, Cookies, CORS, Dependencies), each % passed.
- **`FindingCard`** — severity badge (color dot + label), title, mono evidence line, chevron → opens `RemediationDrawer`. Clickjacking/CORS cards show a "Run exploit test" button.
- **`RemediationDrawer`** — slides from right (in-flow panel, NOT position:fixed). Tabs: **Fix** (the header/code snippet, copy button) · **Shield** (download `aegis-shield.js`, framework toggle) · **CI/CD** (download YAML) · **Exploit** (`ExploitSimulator`).
- **`ExploitSimulator`** — clickjacking: real `<iframe src={target}>` with red overlay "this site is framable". Range XSS: sandboxed iframe runs the payload against the Range; shows result; after patch → `[Blocked]`.
- **`ThreatIntelTile`** — real `/stats`: total scans, vulns found, most common vuln, scrolling ticker of recent anonymized scans. **Real DB data only.**

---

## 12. UI / UX design system — "Silent Coder" (exact)

**Aesthetic:** deep charcoal backgrounds, subtle forest-green highlights, bento-grid layout, modern mono+sans typography. No neon, no hyper-bright colors. Flat surfaces. One bright accent allowed: forest green.

### Color tokens (`globals.css`)
```css
:root {
  --bg:            #0A0E0D;   /* app background (deepest charcoal) */
  --surface:       #121817;   /* card background */
  --surface-2:     #18211E;   /* elevated tile / hover */
  --border:        #243029;   /* subtle hairline borders */
  --text:          #E6EDEA;   /* primary text */
  --text-dim:      #8B9A94;   /* secondary text */
  --text-faint:    #5A6863;   /* hints, timestamps */
  --forest:        #3FB950;   /* primary accent / pass (the ONE bright color) */
  --forest-deep:   #1B4332;   /* accent fills, ring tracks */
  --forest-soft:   #2D6A4F;   /* muted green */
  /* severity (muted, not neon) */
  --sev-critical:  #D5453B;
  --sev-high:      #C6803C;
  --sev-medium:    #B59A3E;
  --sev-low:       #5E7C9E;
}
```
### Typography
- UI/sans: **Inter** (or Geist). Mono (console, code, evidence): **JetBrains Mono** (or Fira Code).
- Scale: page title 28/600, section 18/500, body 14/400, labels 12/500, mono 13/400.
- **Sentence case everywhere.** Never ALL CAPS headings.

### Spacing & shape
- 8px grid. Card padding 16–20px. Radius 14px cards, 10px controls, pill for badges.
- Borders 1px `--border`. Subtle, no heavy shadows. Optional faint green glow only on the active grade ring.
- **Bento grid:** CSS grid, `gap: 16px`, varied tile spans (see below).

### Dashboard bento layout (`/scan/[id]`)
12-column grid:
- **Grade ring** — `col-span 4, row-span 2` (hero tile).
- **Attack console** — `col-span 8, row-span 2` (tall terminal).
- **Category breakdown** — `col-span 4`.
- **Threat intel** — `col-span 4`.
- **Remediation CTA / shield-ready** — `col-span 4`.
- **Findings list** — `col-span 8`.
- **Fix preview (code)** — `col-span 4`.

Top bar: AEGIS shield logo + wordmark · target URL pill · Re-Scan button · Export + Share icons.

### Landing layout (`/`)
- Hero headline: "Scan. Prove. Patch. Re-grade." + subhead.
- Centered large `ScanInput` with example chips beneath.
- Three feature cards (Scan / Prove / Patch).
- Threat Intel tile. Footer.

### Animation (Framer Motion)
Grade ring: arc draws + number counts up (~1s). Console lines: stagger-in. Drawer: slide-in from right. Re-Scan: grade pulses then animates to new value. Finding cards: fade-up on mount.

---

## 12.6 Signature visual — "The Living Security Tree" (the anti-generic hook)

A bento dashboard alone reads as template/AI-generated. AEGIS gets ONE signature visual so judges remember it: **security posture rendered as a living 3D tree** (perfect for the forest-green mandate).

**Concept:** the target's grade drives a procedural tree.
- F/D → sparse, brown, withered, few leaves, reddish mood light, no fireflies.
- A/A+ → lush, vibrant forest-green canopy, drifting green fireflies, green key light.
- The **Re-Scan payoff** = the tree visibly **blooming from dead → alive** when the shield is applied. This is the unforgettable demo beat (far stronger than a number ticking up).

**Tech:** `@react-three-fiber` + `drei` (preferred, declarative) or vanilla Three.js (r128). Procedural recursive branches (cylinders aligned via quaternion), leaves as small spheres/instanced meshes, a background point field, additive-blended firefly points. Grade (0–100) drives: leaf color (lerp brown→forest), leaf scale/count, key-light color (red→green), ring color, firefly opacity. `OrbitControls` with `enableZoom=false`, `autoRotate`, damping. Growth animates in via per-branch `scale.y` revealed by depth order.

**Where it appears:**
- **Landing hero** — the big interactive tree with a "grade" slider (drag F↔A+) as the centerpiece that says "next-gen product" in 3 seconds.
- **Re-Scan moment** — a compact tree beside/behind the grade ring that blooms when the grade improves.
- It **complements, not replaces** the functional bento (the bento still does the work and earns the structured-layout UI points).

**RELIABILITY RULES (non-negotiable — wow must never break execution, the 30-pt bucket):**
1. **Lazy-load** the 3D scene (dynamic import / `next/dynamic`, `ssr:false`) so it never blocks first paint or the functional app.
2. **Fallback ladder:** WebGL unsupported OR `prefers-reduced-motion` → render a lightweight **2D Canvas/SVG tree** (or just the animated grade ring). The app is 100% usable with zero 3D.
3. **Perf budget:** ≤ ~250 meshes, capped pixel ratio (≤2), pause `requestAnimationFrame` when offscreen. Test on a mid laptop before relying on it in the video.
4. **Build order (de-risked — 2D first, 3D as the upgrade target).** Build the **2D SVG/Canvas tree FIRST**, behind a single grade-driven `apply(score)` interface — it animates on re-scan, looks clean, and is guaranteed-shippable. It is BOTH your safe default AND the stepping stone. On Day 3, *if Tier 2 is stable*, **swap the renderer to the proven 3D version (§12.7) behind the same interface** — that's the "best one" target. Whatever is stable at freeze ships: a clean 2D tree beats a janky 3D one; a working 3D tree beats both. The 2D path also doubles as the WebGL / `prefers-reduced-motion` runtime fallback. Never let the 3D tree block the functional app — lazy-load it (`next/dynamic`, `ssr:false`).

---

## 12.7 Reference implementation — the proven Living Tree (vanilla Three.js)

This is the EXACT, tested approach — build this, don't improvise a different one. In Next.js, put it in a client component loaded via `dynamic(() => import('./LivingTree'), { ssr: false })` so it never blocks SSR. Load Three.js r128 + OrbitControls. The grade (0–100) is a prop; calling `apply(score)` re-skins the tree live (this is what the Re-Scan loop and the landing slider call).

```js
// Setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));      // perf cap
renderer.setClearColor(0x0A0E0D, 1);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0A0E0D, 0.022);
const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 200); camera.position.set(0, 4.2, 13);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
controls.autoRotate = true; controls.autoRotateSpeed = 0.7; controls.target.set(0, 3.4, 0);
controls.minPolarAngle = 0.5; controls.maxPolarAngle = Math.PI / 2.05;
scene.add(new THREE.AmbientLight(0x9fb4ad, 0.75));
const key = new THREE.PointLight(0x3FB950, 0.9, 120); key.position.set(5, 11, 7); scene.add(key);

// Procedural tree: recursive branches (cylinders aligned via quaternion) + leaf spheres.
// Each branch/leaf stores userData.order = depth, used to animate growth in.
const branchMat = new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.95 });
const leafGeo = new THREE.SphereGeometry(0.17, 6, 5);
const branches = [], leaves = []; let maxOrder = 0;
function addBranch(start, dir, len, rad, order) {
  const end = start.clone().add(dir.clone().multiplyScalar(len));
  const geo = new THREE.CylinderGeometry(rad * 0.65, rad, len, 6); geo.translate(0, len / 2, 0);
  const m = new THREE.Mesh(geo, branchMat);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  m.position.copy(start); m.scale.y = 0.001; m.userData.order = order;
  scene.add(m); branches.push(m); maxOrder = Math.max(maxOrder, order); return end;
}
function grow(start, dir, len, rad, order, depth) {            // call: grow(origin, up, 2.4, 0.3, 0, 5)
  const end = addBranch(start, dir, len, rad, order);
  if (depth <= 1) { const n = depth <= 0 ? 4 : 2; for (let k = 0; k < n; k++) addLeaf(end, order + 1); }
  if (depth <= 0) return;
  const up = Math.abs(dir.y) < 0.99 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
  const side = new THREE.Vector3().crossVectors(dir, up).normalize();
  for (let i = 0; i < 2; i++) {                                 // exactly 2 children → bounds mesh count (~63 branches)
    const nd = dir.clone();
    nd.applyAxisAngle(side, (i ? -1 : 1) * (0.42 + Math.random() * 0.22));
    nd.applyAxisAngle(new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(), (Math.random()-0.5)*0.5);
    nd.y += 0.28; nd.normalize();
    grow(end, nd, len * 0.77, rad * 0.68, order + 1, depth - 1);
  }
}

// Grade → appearance. Drives leaf color (brown→forest), leaf scale, light & fireflies.
const brown = new THREE.Color(0x7a5a32), green = new THREE.Color(0x3FB950), red = new THREE.Color(0xD5453B);
let leafTarget = 1;
function apply(score) {
  const h = Math.max(0, Math.min(1, score / 100));
  const c = brown.clone().lerp(green, h);
  leaves.forEach(l => { l.material.color.copy(c); l.material.emissive.copy(green).multiplyScalar(0.14 * h); });
  leafTarget = 0.18 + 0.95 * h;                 // sparse when vulnerable, lush when secure
  key.color.copy(red.clone().lerp(green, h));   // mood light red→green
  fireflies.material.opacity = Math.max(0, h - 0.55) * 1.3;
}

// Animation loop: reveal branches/leaves by depth order (growth), gentle sway, autorotate.
let growthT = 0; const ease = x => 1 - Math.pow(1 - x, 3);
function loop() {
  requestAnimationFrame(loop);
  growthT = Math.min(1, growthT + 0.007); const front = growthT * (maxOrder + 2);
  branches.forEach(b => { const t = Math.max(0, Math.min(1, front - b.userData.order)); b.scale.y += (ease(t) - b.scale.y) * 0.16; });
  leaves.forEach(l => { const r = Math.max(0, Math.min(1, front - l.userData.order)); const ts = r * leafTarget; l.scale.setScalar(l.scale.x + (ts - l.scale.x) * 0.12); });
  controls.update(); renderer.render(scene, camera);
}
```

Also add: a faint background `THREE.Points` star field, additive-blended firefly `THREE.Points` (the `fireflies` referenced above), a forest-green `RingGeometry` ground disc, and a `try/catch` around renderer creation that swaps in the 2D fallback if WebGL is missing. Full proven version was demonstrated live during planning — replicate its structure exactly.

**On the landing page:** wire an `<input type="range" min="5" max="100">` to `apply(+e.target.value)` so dragging blooms/withers the tree. **On the dashboard:** call `apply(grade.score)` on scan complete and again on re-scan so the tree blooms F→A+ in sync with the grade ring.

---

## 13. Feature tiers (BUILD IN THIS ORDER — freeze scope here)

### 🥇 TIER 1 — MVP (must be LIVE end of Day 1; a valid scoring entry on its own)
URL scan → 5 real checks (headers, TLS, cookies, CORS, disclosure) → A–F grade → bento dashboard → **deployed (client on Vercel, server on Render, Atlas connected).**
**Acceptance:** paste a real URL → see a real grade + real findings on a deployed link.

### 🥈 TIER 2 — Winning core (this is what actually wins)
1. **AEGIS Range** (own vulnerable target) — removes all "is it fake" doubt.
2. **Live SSE Attack Console** — the atmosphere centerpiece.
3. **Aegis Shield generator + Re-Scan loop** — the F→A+ payoff (your #1 demo beat).
4. **Exploit Simulator** (clickjacking iframe proof + Range XSS) → `[Blocked]` after patch.
**Acceptance:** the full 90-second arc in §1 runs end-to-end on the deployed app.

### 🥉 TIER 3 — Trophy polish (only if Tier 2 is green AND deployed; in this order)
1. CI/CD generator (cheap, high cred)
2. Markdown export (cheap, useful)
3. GitHub repo mode + OSV.dev CVEs
4. Threat Intel tile (real aggregations)
5. AEGIS Badge

### ❄️ FROZEN — do NOT build unless everything above is done (you won't get here)
Attack-AEGIS playground · PDF rendering · Shield Diff view · OG share image · Hall of Shame · secret scanning · AI audit summary.

---

## 14. 72-hour execution plan (continuous commits — never one big dump)

**Day 0 (after June 12, 6:00 PM IST):** `git init` fresh, scaffold monorepo, push "hello world", deploy both apps immediately (Vercel + Render) so the pipeline is proven Day 1. Commit hourly.

**Day 1:**
- AM: scaffold client + server, Mongo Atlas connect, `POST /scan` + `GET /scan/:id`, one real check (`headers`) returning JSON. **Deploy.**
- PM: add TLS, cookies, CORS, disclosure checks; `score.service` + grade; persist findings; render a static (non-streaming) bento dashboard. **Tier 1 done & live.**

**Day 2:**
- AM: SSE `/scan/:id/stream` + `AttackConsole` live feed; `GradeRing` + `CategoryRings` animations.
- PM: `RemediationDrawer` + **Shield generator** + **Re-Scan** loop. Build the **AEGIS Range**.
- Night: **Exploit Simulator** (clickjacking iframe + Range XSS) → `[Blocked]` after patch. **Tier 2 done — you're in contention.**

**Day 3:**
- AM: CI/CD generator, Markdown export, GitHub repo + OSV, Threat Intel tile (only what's green).
- Midday: **STOP CODING.** Polish empty/error states, mobile pass, seed a few scans so the Threat tile/ticker isn't empty.
- PM: record the 5–10 min video (arc in §1 + a controllers/routes walkthrough), submit before the deadline buffer. Lock deploy.

**Also Day 1 (free points, ~10 pts on a 10k leaderboard):** join the mandatory WhatsApp community, follow LinkedIn/Instagram/YouTube, post a "Build in Public" update tagging @Devlynix.

---

## 15. Video walkthrough script (20 pts) — TIMED for 5–10 min (target ~7:00)

> Manual requires **5–10 min**: live operational features **+** a walkthrough of backend controllers & routing. Anti-plagiarism: the architecture you narrate **must match the public repo** or the entry is discarded. Density beats padding — every second shows something real.

**SEGMENT A — Hook & framing (0:00–0:50)**
- 0:00 Cold open on the **Living Tree** (lush) → drag slider F↔A+ so it blooms/withers. "This is AEGIS. It doesn't just scan your site — it scans, *proves*, patches, and re-grades it."
- 0:25 One-line problem: "Developers ship security misconfigs blind. AEGIS makes them visible, provable, and fixable in one loop." Show the deployed URL in the address bar (prove it's live).

**SEGMENT B — Live demo, the full arc (0:50–4:10)** — *this is the bulk; ~3.2 min*
- 0:50 Paste the **AEGIS Range** URL → hit scan.
- 1:00 **Live SSE Attack Console** streams checks in real time (let it visibly fill — this eats 15–20s of great footage).
- 1:25 Grade lands **F**. Tour the **bento**: grade ring, 5 category rings, findings list, threat-intel tile.
- 1:55 Click the **CSP** finding → **Remediation Drawer** opens → show the evidence (real header absence) + the Fix tab snippet.
- 2:20 Click **"Run exploit test"** on the clickjacking finding → the Range page **really loads inside an iframe** with the red overlay → "this is the actual site, framable — real proof, not a claim."
- 2:45 Run the **XSS** exploit against the Range → the injected payload fires (sandboxed). "Again — real, on a target we own."
- 3:05 Open **Shield tab** → download `aegis-shield.js` → open the file on screen (only the missing headers). Flip the **CI/CD tab** → show the generated `aegis.yml` PR gate. Flip **Export** → the Markdown audit.
- 3:35 Drop the shield into the Range → **Re-Scan** → grade animates **F → A+**, the **tree blooms dead→alive**. (Money shot — hold on it.)
- 3:55 Click **"Run exploit test"** again → **`[Blocked — CSP enforced]`**. The loop is closed on camera.

**SEGMENT C — Depth features (4:10–4:55)**
- 4:10 **GitHub repo mode**: paste a repo → OSV.dev returns **real CVEs** on outdated deps (e.g. lodash → CVE). 
- 4:35 Show the **shareable `/report/:id`** link (open it) + the **AEGIS badge** + the live **Threat-Intel ticker** (real DB aggregation).

**SEGMENT D — Architecture walkthrough (4:55–6:40)** — *the 20-pt bucket; open the actual code*
- 4:55 Repo structure: `client/` (Next.js, Vercel) · `server/` (Express, Render) · MongoDB Atlas. "Separate backend on Render because Vercel serverless can't hold an SSE stream — that's a real architecture decision."
- 5:20 `scan.controller.ts` → the `checks/` registry: "each check is an independent module returning a normalized `Finding{severity, evidence, fix}`." Open one check (`headers.check.ts`).
- 5:45 `ssrf.guard.ts` + the rate limiter: "we sanitize every scan target against SSRF and rate-limit the endpoint — **secure controller logic**."
- 6:05 The Mongo models: "`scans` ⇄ `findings`, normalized and keyed by `scanId`, not embedded — **database normalization**." Show the SSE route streaming.
- 6:25 `shield.generator.ts`: "this produces the real middleware you watched fix the grade — generation logic, not a static file."

**SEGMENT E — Close (6:40–7:05)**
- 6:40 Recap the loop in one breath: "scan → prove → patch → re-grade, every step backed by real code." 
- 6:55 Real-world framing: "a CI gate + shareable audit means this drops into a real pipeline." End on the deployed URL.

**To stretch toward 10 min:** go deeper in Segment D (walk a second check module, the scoring math, the OSV service call, the deploy config). To compress toward 5 min: trim Segment C and tighten the console wait. **Never pad — add real depth or stop.**

**Recording tips:** seed 3–4 scans first so the Threat tile/ticker isn't empty; pre-stage the broken Range and a patched branch so the Re-Scan is instant on camera; record at 1080p+; do the architecture segment in your IDE with large font.

---

## 16. Quick setup commands (Day 0, AFTER launch)

```bash
# client
npx create-next-app@latest client --ts --tailwind --app --eslint
cd client && npm i framer-motion @tabler/icons-react
# server
mkdir server && cd server && npm init -y
npm i express mongoose cors express-rate-limit node-fetch dotenv
npm i -D typescript ts-node @types/express @types/node nodemon
npx tsc --init
```
Deploy: client → Vercel (set `NEXT_PUBLIC_API_BASE`); server → Render Web Service (build `npm i && tsc`, start `node dist/index.js`, set env vars); DB → MongoDB Atlas M0 (whitelist Render egress / 0.0.0.0/0 for the event).

---

## 17. Risk mitigations & demo-day hardening (protects the 30-pt Execution score — do all of these)

**🔴 Deploy reliability (two-deploy setups fail in predictable ways)**
- **Render cold start** (the #1 demo killer): free tier spins down after ~15 min → a judge hitting it cold waits 30–60s or the scan times out. Add `GET /health`; ping it every 10 min via UptimeRobot or cron-job.org (free). **Keep the ping running through the June 15–17 eval window**, and hit the app yourself right before judging.
- **CORS:** server must allow the exact Vercel origin (`CLIENT_ORIGIN`). Works on localhost, 403s in prod if missed.
- **Env:** `NEXT_PUBLIC_API_BASE` must point at the Render URL in prod, not localhost.
- **MongoDB Atlas:** whitelist `0.0.0.0/0` (or Render egress) or the backend silently can't connect in prod.
- **SSE buffering:** Render/proxies buffer responses and break the live console. On the stream route set `X-Accel-Buffering: no`, disable compression, and flush after each event.

**🔴 The AEGIS Range (foundation — build & test Day 1, before anything depends on it)**
- Build as a **raw Route Handler** (`app/range/route.ts`) returning a `Response` with explicit/empty security headers, so Next/Vercel can't auto-inject a CSP and break the "vulnerable" demo. Verify with curl/devtools first.
- **Drive the entire demo arc off the Range** (self-owned) so the video never depends on a third-party site being reachable.

**🟠 Frontend resilience (judges WILL try to break it)**
- **Bento skeletons:** shimmer cards for grade ring / category rings / findings while scanning — no empty broken-looking grid for the first 5–10s.
- **Error states in `AttackConsole`:** red terminal line + human message for unreachable URL, SSRF-blocked private IP, GitHub rate limit.
- **Seed 5–8 scans** via `seed.ts` immediately after first deploy so the Threat-Intel ticker is never empty.

**🟡 Process / scoring**
- **Mid-Sprint Check = June 14, 12:00 PM IST (~42h after the June 12, 6 PM launch).** Tier 1 deployed by end of Day 1 (~24h) clears it comfortably — don't slip.
- **Commit discipline:** conventional prefixes (`feat:`, `fix:`, `chore:`). The git log is audited; generic "update"/"fix" reads like a bulk dump.
- **Record video Segment B (the demo arc) the night Tier 2 lands**, while it's fresh. Day 3 then only needs the architecture segment + submission — don't cram a 7-min video into the final 2 hours.

**🟢 Small wins**
- "Try the AEGIS Range" chip auto-fills the URL AND auto-triggers the scan → one click = live demo for a judge exploring solo.

---

### The one line to remember
**Real engine, cinematic skin.** Build the Tier-2 loop until it is flawless and deployed, then stop. A finished AEGIS that scans-proves-patches-regrades on a live URL beats any feature pile that crashes on stage.
