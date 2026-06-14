# AEGIS — "Simulate Attacks" Feature Spec (for Sonnet to build)

> **Goal:** Port the teammate's `dv2/` "orbital siege" attack-simulation feature into
> AEGIS, but **rebuilt in AEGIS's stack and re-skinned to AEGIS's dark forest/CRT
> theme**. The teammate's version is light/mint ("Organic Biophilic") and uses a
> Python subprocess backend — we keep neither. We keep the *idea* (8 non-destructive
> probes + a cinematic 3D siege) and the *good engineering* (single-clock timeline,
> instanced beams, pooled impacts), and make it look like it was always part of AEGIS.

---

## 0. Context you need before starting

**Two reference codebases live in this repo:**
- `dv2/dv/` — teammate's implementation. **Read these, port the logic, do NOT copy verbatim** (wrong theme, wrong stack):
  - `dv2/dv/scanners/simulate.py` — the 8 probes (source of truth for probe logic)
  - `dv2/dv/lib/simulateTypes.ts` — the result contract
  - `dv2/dv/components/simulation/*` — the R3F siege scene
- `client/` + `server/` — **AEGIS, the project you are modifying.**

**AEGIS stack (do not deviate):**
- Frontend: Next.js 16 App Router, React 19, Tailwind v4, **raw three.js** (NOT R3F yet), framer-motion, Lenis.
- Backend: Express 5 + TypeScript, MongoDB (Mongoose), native `fetch`. No Python anywhere.
- Design tokens live in `client/src/app/globals.css` (`:root` + `@theme`). **Always use `var(--…)` / Tailwind token classes — never hardcode hex in DOM/CSS.** The only place literal hex is allowed is inside three.js material colors (WebGL can't read CSS vars), and those must mirror the tokens.

**AEGIS dark theme tokens (from `globals.css`):**
| token | hex | meaning |
|---|---|---|
| `--bg` | `#0A0E0D` | app background |
| `--surface` | `#121817` | card bg |
| `--surface-2` | `#18211E` | elevated |
| `--border` (`border-dim`) | `#243029` | hairlines |
| `--text` | `#E6EDEA` | primary text |
| `--text-dim` | `#8B9A94` | secondary |
| `--text-faint` | `#5A6863` | hints |
| `--forest` | `#3FB950` | the one bright accent / "defended" |
| `--forest-deep` | `#1B4332` | fills |
| `--forest-soft` | `#2D6A4F` | muted green |
| `--sev-critical` | `#D5453B` | "vulnerable" |
| `--sev-high` | `#C6803C` | |
| `--sev-medium` | `#B59A3E` | "inconclusive" (amber) |
| `--sev-low` | `#5E7C9E` | |

Existing reusable AEGIS CSS helpers: `.card-elevated`, `.brackets` (corner brackets), `.scanlines` (CRT overlay), `.text-gradient`, custom scrollbar, `.animate-shimmer`.

---

## 1. Color re-map (dv2 → AEGIS)

dv2's `siegeShared.ts` and `simulateTypes.ts` use a **light mint** palette. Re-map ALL of them:

| dv2 constant / value | dv2 hex (light) | → AEGIS hex (dark) | → AEGIS token |
|---|---|---|---|
| `FOREST` | `#15803d` | `#2D6A4F` | `--forest-soft` |
| `FOREST_BRIGHT` (defended, shield) | `#22c55e` | `#3FB950` | `--forest` |
| `ACCENT` (inconclusive, amber motes) | `#d97706` | `#B59A3E` | `--sev-medium` |
| `BG_GLOW` | `#f0fdf4` | `#0A0E0D` | `--bg` |
| `SHIELD_TINT` | `#22c55e` | `#3FB950` | `--forest` |
| `SEV.critical` (vulnerable) | `#dc2626` | `#D5453B` | `--sev-critical` |
| `SEV.high` | `#ea580c` | `#C6803C` | `--sev-high` |
| `SEV.medium` | `#ca8a04` | `#B59A3E` | `--sev-medium` |
| `SEV.low` | `#16a34a` | `#5E7C9E` | `--sev-low` |
| `SEV.info` | `#64748b` | `#5A6863` | `--text-faint` |
| TargetSphere base color | `#ffffff` (white) | `#121817` | `--surface` (dark core, forest emissive) |
| scene lighting (hemisphere/dir) | warm/white mint | cool dark: hemisphere `["#1a2420","#0A0E0D"]`, dir `#cfe9d6` low intensity | — |

The siege should read as a **dark void with a forest-glowing core**, red breaches, amber glances — matching the landing-page shader hero mood, not a bright daytime scene.

---

## 2. BACKEND — port the 8 probes to TypeScript

### 2.1 New file: `server/src/services/simulate.service.ts`

Port `dv2/dv/scanners/simulate.py` to TypeScript. **Same 8 probes, same verdict logic, same safety posture.** Reuse AEGIS infra instead of Python:

- Use the existing **`fetchScanContext()`** (`server/src/services/fetcher.service.ts`) for the base `GET /` (headers, cookies, body, TLS) — this replaces `scan_headers_and_transport` + `scan_tls`. It already follows redirects and inspects TLS.
- For probes that need extra requests (CSRF cookie read, open-redirect, sensitive-path, SQLi, XSS marker), use native `fetch` with `AbortController` timeout (mirror fetcher's 8s pattern), and enforce a **shared request budget**.
- **Request budget:** `let budget = { remaining: 20 }`. Each probe request decrements it; at 0, remaining probes return `inconclusive` with evidence `"request budget exhausted"`.
- Per-request timeout: **8000ms**. User-Agent: `"AEGIS-Sim/1.0 (+non-destructive susceptibility probe)"`.

**Define these types in the service (or a shared `server/src/types/simulate.ts`):**
```ts
export type Verdict = 'defended' | 'vulnerable' | 'inconclusive';
export type AttackClass =
  | 'xss' | 'sqli' | 'clickjacking' | 'open-redirect'
  | 'sensitive-path' | 'csrf' | 'security-headers' | 'transport';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AttackResult {
  id: string;            // e.g. "attack.xss"
  label: string;         // e.g. "Reflected XSS"
  attackClass: AttackClass;
  verdict: Verdict;
  severity: Severity;    // 'info' when defended
  description: string;
  payloadSummary: string;
  evidence?: string;
  recommendation?: string;
  reference?: string;
  durationMs?: number;
}

export interface SimulationResult {
  target: string;
  scannedAt: string;     // ISO
  attacks: AttackResult[];
  warnings: string[];    // warnings[0] = the safety disclaimer
  meta: Record<string, string | number>; // probesRun, requestsUsed
  score: number;         // from calculateScoreAndGrade(derivedFindings)
  grade: string;
}
```

**The 8 probes (port exactly from `simulate.py` — keep the verdict thresholds identical):**

1. **`security-headers`** — from the base context's headers, list missing of: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Any missing → `vulnerable` (severity = worst of the missing; CSP/HSTS high, others low/medium per AEGIS's existing `headers.check.ts` severities). None missing → `defended`/info.
2. **`clickjacking`** — `vulnerable` (medium) only if **both** X-Frame-Options missing **and** no CSP `frame-ancestors`. Else `defended`. (AEGIS has `clickjack.check.ts` — reuse its logic.)
3. **`transport`** — `vulnerable` if served over HTTP, or TLS invalid/expired (use `ctx.tls` + `ctx.protocol`). Unreachable → `inconclusive`. Else `defended`.
4. **`csrf`** — one extra `GET /` (budget), inspect `Set-Cookie`. A session-like cookie (`sess|sid|session|auth|token|login|csrf`) **without** `SameSite` → `vulnerable` (medium). No cookies / no session cookie → `inconclusive` or `defended` per `simulate.py`.
5. **`xss`** — reflected XSS. If target URL has query params, inject marker `aegisXSS<random>` payload `"'<aegisXSS…>` into each param (budget-limited, reuse AEGIS `xss.check.ts` approach). Unescaped reflection → `vulnerable` (high). Encoded reflection → `defended`. No params → `inconclusive`.
6. **`open-redirect`** — inject `https://example.org/sc-probe` into a redirect-ish param (`next|url|redirect|return`, default `next`), `redirect: 'manual'`, **never follow**. If 3xx + `Location` host contains `example.org` → `vulnerable` (high). On-host redirect → `defended`. No redirect → `inconclusive`.
7. **`sensitive-path`** — same-host GET (budget, cap 5, `redirect: 'manual'`) of `/.git/config`, `/.env`, `/.well-known/security.txt`, `/robots.txt`, `/server-status`. `/.git/config` or `/.env` returning 200 + non-empty body → `vulnerable` (high). Budget/timeout before finishing → `inconclusive`. Else `defended`. **Re-check hostname on every URL so we never traverse off the original host (SSRF safety).**
8. **`sqli`** — error-signature detection only. Send a single `'` on the first query param (budget, follow redirects). Match response body against signatures: `SQL syntax`, `mysql_fetch`, `ORA-\d{5}`, `PostgreSQL.*ERROR`, `SQLite3::`, `ODBC SQL`, `Unclosed quotation mark`. Match → `vulnerable` (high). 5xx → `inconclusive`. No params → `inconclusive`. Else `defended`.

**Disclaimer string (warnings[0]), keep verbatim:**
> "These are SAFE, non-destructive susceptibility probes (benign payloads + response analysis only) — no exploitation, flooding, or auth bypass. Use only on targets you own or are authorized to test."

**Scoring:** derive one finding `{ severity }` per attack (`info` if defended), then call AEGIS's existing `calculateScoreAndGrade()` (`server/src/services/score.service.ts`) to get `{ score, grade }`. This keeps the simulate grade consistent with the scan grade.

### 2.2 New controller: `server/src/controllers/simulate.controller.ts`
```ts
export async function simulateAttacks(req, res) {
  const { target } = req.body;            // URL only
  // 1. parseTarget-style normalization (reuse logic from scan.controller parseTarget,
  //    but REJECT repos: simulate needs a live attack surface).
  //    If type === 'repo' → 400 "Attack simulation only supports live URLs, not repositories."
  // 2. validateTargetURL() from ssrf.guard.ts — MANDATORY (DNS-rebind safe).
  // 3. const result = await runSimulation(normalizedUrl);
  // 4. res.json(result);
}
```
Wrap in try/catch; on probe error return a `SimulationResult` with empty `attacks`, the disclaimer + error in `warnings`, `meta.error = 'true'` (never 500 for a probe failure — mirror `simulate.py`'s top-level guard).

### 2.3 New route: `server/src/routes/simulate.routes.ts`
`POST /` → `simulateAttacks`. Register in `server/src/index.ts`:
```ts
import simulateRoutes from './routes/simulate.routes';
app.use('/api/simulate', scanLimiter, simulateRoutes); // reuse the existing rate limiter
```

### 2.4 Persistence (optional, recommended for parity)
Do **not** add a new Mongoose model for v1 — return the result directly (the siege is ephemeral by nature). If time allows, persist a lightweight record for the ThreatIntel ticker, but it's out of scope for the first pass.

---

## 3. FRONTEND — the siege scene, re-skinned

### 3.1 Add the one dependency
```
cd client && npm i @react-three/fiber@^9
```
(R3F v9 supports React 19 + three 0.184, both already in `client/package.json`.) **Do not** add `@react-three/drei` — the dv2 scene doesn't need it.

> Note: AEGIS's existing `LivingTree3D` uses raw three.js and must keep working untouched. R3F and raw three can coexist (R3F just wraps three). The siege scene is the only R3F surface.

### 3.2 Port the siege components → `client/src/components/simulation/`
Copy these from `dv2/dv/components/simulation/`, then apply the **§1 color re-map** and the changes below:

| file | port notes |
|---|---|
| `siegeShared.ts` | Re-map every palette constant to AEGIS dark hex (§1). Keep all geometry/timing constants (`ORBIT_RADIUS`, `BEAM_*_MS`, `orbitSlot` Fibonacci spiral, `damp`) **unchanged** — they're theme-agnostic and well-tuned. Change the `import type … from "@/lib/simulateTypes"` to AEGIS's path (see §3.4). |
| `useSiegeTimeline.ts` | **Copy unchanged.** Pure logic, no colors. This is the single-clock timeline driver — don't touch it. |
| `AttackBeam.tsx` | Copy; colors already come from `siegeShared.beamColor()` so they re-map automatically. |
| `ImpactBurst.tsx` | Copy unchanged (colors come from slots). |
| `ShieldLayer.tsx` | Copy; `BASE_TINT`/flash colors come from `siegeShared` — re-mapped. Keep the anti-neon opacity cap. |
| `TargetSphere.tsx` | Re-map: core `color` `#ffffff` → `--surface` `#121817`; emissive stays forest (`--forest`). Dark core + forest glow reads correct on the void. |
| `OrbitField.tsx` | Copy; motes use `FOREST_BRIGHT`/`ACCENT` from `siegeShared` — re-mapped. Lower base opacity to ~0.4 for the dark bg. |
| `SiegeScene.tsx` | Re-map the lighting (see §1 last row — cool/dark). Keep the single master `useFrame`. |
| `SiegeErrorBoundary.tsx`, `SiegeFallback.tsx` | Copy; restyle fallback with AEGIS classes (`.card-elevated`, mono text, `text-text-faint`). Fallback message e.g. "3D siege unavailable — results shown below." |

### 3.3 Rewrite `SiegeHud.tsx` (do NOT copy verbatim)
dv2's HUD uses classes/tokens AEGIS doesn't have (`glass-card`, `--color-muted`, `--color-accent`, `--color-forest-bright`, `--color-sev-info`, `soft-pulse` keyframe). Rebuild it with AEGIS chrome:
- Container: `.card-elevated .scanlines border border-border-dim rounded-2xl p-4` with a hairline header rule + index label like the other AEGIS instrument panels (see `client/src/components/CategoryRings.tsx` header for the pattern: `border-b border-border-dim/40`, `text-[11px] uppercase tracking-[0.2em]`, a live status dot).
- Severity dot color → `--sev-*` tokens. Verdict pill colors:
  - vulnerable → `--sev-critical`
  - defended → `--forest`
  - inconclusive → `--sev-medium`
- Text colors → `--text` / `--text-dim` / `--text-faint`. Mono font for labels.
- Keep the WCAG-AA **text** verdict (not color-only) and the `role="region"` a11y.
- Replace the `soft-pulse` animation with the existing `animate-pulse` (Tailwind) for unresolved rows, OR add a `soft-pulse` keyframe to `globals.css` (see §3.6).

### 3.4 Shared client types: `client/src/lib/simulateTypes.ts`
Mirror the backend `SimulationResult` / `AttackResult` / `Verdict` / `AttackClass` types (§2.1). Also export:
```ts
export const VERDICT_LABELS = { vulnerable: 'Vulnerable', defended: 'Defended', inconclusive: 'Inconclusive' };
export const VERDICT_ORDER: Verdict[] = ['vulnerable', 'inconclusive', 'defended'];
export const ATTACK_CLASS_LABELS = { /* from dv2 simulateTypes.ts, unchanged */ };
// VERDICT_HEX mapped to AEGIS tokens' hex (for any non-CSS context):
export const VERDICT_HEX = { vulnerable: '#D5453B', defended: '#3FB950', inconclusive: '#B59A3E' };
```

### 3.5 New page: `client/src/app/simulate/page.tsx`
Mirror the structure of `dv2/dv/app/simulate/page.tsx` but with AEGIS chrome and our API client:
- `'use client'`. Read target from `?target=` query param (and/or an input box).
- Call a new `client/src/lib/api.ts` function:
  ```ts
  export async function simulateAttacks(target: string): Promise<SimulationResult> {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ target })
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || 'Simulation failed.'); }
    return res.json();
  }
  ```
- **Phase machine:** `idle → scanning` (while the POST is in flight, show the charging sphere) `→ resolving` (response arrived, beams fire on the timeline) `→ complete`. Pass `phase` + `attacks` to `<SiegeScene>`; render `<SiegeHud>` absolutely positioned over the canvas (e.g. top-right on desktop, stacked on mobile).
- Dynamic-import the canvas (R3F is client-only):
  ```ts
  const SiegeScene = dynamic(() => import('@/components/simulation/SiegeScene'), { ssr: false, loading: () => <AegisSpinner/> });
  ```
  Wrap it in `<SiegeErrorBoundary fallback={<SiegeFallback/>}>`.
- Below the canvas: a results list reusing the verdict styling (port dv2's `AttackResultRow.tsx` + `VerdictBadge.tsx` + `SeverityBadge.tsx`, re-skinned to AEGIS — collapsible rows, vulnerable ones expanded by default, showing `description / payloadSummary / evidence / recommendation / reference`).
- Header: AEGIS page chrome consistent with `client/src/app/scan/[id]/page.tsx` (back arrow, shield glyph, mono title "ATTACK SIMULATION", target name). Show the **safety disclaimer** (`warnings[0]`) as a small muted note under the header — important for judges/ethics.
- Full-screen dark layout (`min-h-screen`, the canvas in a tall framed panel ~`h-[60vh]`). Respect the §1 dark mood.

### 3.6 `globals.css` additions (only if needed)
If you keep dv2's `soft-pulse`, add:
```css
@keyframes soft-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
```
Otherwise use Tailwind's `animate-pulse`. No other global changes should be required.

### 3.7 Entry points
- **Scan dashboard** (`client/src/app/scan/[id]/page.tsx`): in the control bar (next to Re-Scan / Audit Report / README Badge), add a **"Simulate Attacks"** button (lucide `Swords` or `Crosshair` icon) shown only when `scan.targetType === 'url'`. It links to `/simulate?target=<encoded scan.target>`. Match the existing button styling exactly (`px-3 py-2 bg-surface hover:bg-surface-2 border border-border-dim … font-mono text-xs rounded-xl`).
- **Landing page** (`client/src/app/page.tsx` / `ScanInput.tsx`): optional secondary action "or simulate attacks" — low priority; the dashboard entry is the primary path.

---

## 4. Theming checklist (the "make it not look crappy" part)

The teammate's version looks generic because it's light, glassy, and has no AEGIS identity. To make it feel native:
1. **Dark void, single forest glow** — re-map all colors (§1). The scene should match the landing shader-hero mood.
2. **Instrument-panel HUD** — hairline rules, `01 ·` style index label, mono uppercase headers, live status dot (copy the pattern from `CategoryRings.tsx` / `ThreatIntelTile.tsx`).
3. **CRT + brackets** — wrap the canvas panel in `.scanlines` and `.brackets` so it matches the AttackConsole and bento cards.
4. **Mono everything** — labels, verdicts, payload summaries in `--font-mono` (JetBrains Mono).
5. **Restraint** — keep the anti-neon opacity caps from `ShieldLayer`. AEGIS uses muted severity colors, not neon. Don't brighten them.
6. **Motion parity** — honor `prefers-reduced-motion` (the dv2 components already do; keep it).
7. **Consistent corners** — AEGIS uses sharp radii (`--radius-* ≈ 0.25–0.4rem`); the ported components should inherit `rounded-2xl`/`rounded-xl` which already map to those.

---

## 5. Build / verify

**Backend:**
```
cd server && npx tsc --noEmit       # typecheck
# smoke test (server running on :8080):
#   POST /api/simulate { "target": "http://localhost:3000/range" }  → vulnerable-heavy result
#   POST /api/simulate { "target": "http://localhost:3000/range?safe=1" } → mostly defended
#   POST /api/simulate { "target": "github:expressjs/express" } → 400 (URL-only)
```
**Frontend:**
```
cd client && npm run build          # typecheck + production build gate
```
Then in the running app: open `/simulate?target=http://localhost:3000/range`, confirm:
- Sphere charges (scanning) → beams stagger in (resolving) → settles (complete).
- Red beams pierce to the core for vulnerable probes; green ricochet; amber glance.
- HUD lists all 8 probes with text verdicts; matches dark theme.
- Reduced-motion collapses to final state instantly.
- The "Simulate Attacks" button appears on a URL scan dashboard and deep-links correctly.

> **Verification gotcha:** the `/simulate` page runs an R3F `requestAnimationFrame` loop, and AEGIS already runs a WebGL shader on the landing page. The preview `screenshot`/`eval` tools **time out** while a continuous WebGL loop runs even when the page is healthy — verify via DOM queries (canvas present, HUD list length === attacks.length, no console errors), not screenshots. (See the existing `webgl-coexistence` note.) The siege page and the landing shader are different routes, so they never run simultaneously.

---

## 6. Explicitly OUT of scope (don't do these)
- ❌ No Python, no `child_process`, no `scanners/` dir. TypeScript only.
- ❌ No light/mint theme, no `glass-card`, no `recharts` donut import.
- ❌ Don't touch `LivingTree`/`LivingTree3D` or the landing shader.
- ❌ No real exploitation — every probe stays GET-mostly, benign-payload, budget-capped, SSRF-guarded. The "attack" is the 3D dramatization only.
- ❌ Don't change the existing scan/score/finding contracts.

---

## 7. File manifest (what you'll create/modify)

**Create:**
- `server/src/services/simulate.service.ts`
- `server/src/controllers/simulate.controller.ts`
- `server/src/routes/simulate.routes.ts`
- `client/src/lib/simulateTypes.ts`
- `client/src/components/simulation/` (siegeShared, useSiegeTimeline, AttackBeam, ImpactBurst, ShieldLayer, TargetSphere, OrbitField, SiegeScene, SiegeHud, SiegeErrorBoundary, SiegeFallback, AttackResultRow, VerdictBadge, SeverityBadge)
- `client/src/app/simulate/page.tsx`

**Modify:**
- `server/src/index.ts` (register `/api/simulate`)
- `client/src/lib/api.ts` (add `simulateAttacks()`)
- `client/src/app/scan/[id]/page.tsx` (add "Simulate Attacks" button for URL scans)
- `client/package.json` (add `@react-three/fiber`)
- `client/src/app/globals.css` (only if adding `soft-pulse`)
