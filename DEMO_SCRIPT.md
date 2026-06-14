# AEGIS — 5-Minute Demo Script

Goal: prove a **real** security engine wrapped in a cinematic UI. Every dramatic
moment is backed by real code — say that out loud, judges reward it.

## Pre-record checklist
- [ ] **Warm the server** — open `<render-url>/health` ~1 min before (free tier sleeps).
- [ ] **Clear browser site data / localStorage** for the Vercel URL, so the first Range
      scan shows the clean F (no stale re-grade banner).
- [ ] **AI key set** on Render (`ANTHROPIC_API_KEY`) so the briefing works live.
- [ ] **Seed the Threat Intel tile** — scan 4-5 real sites once (example.com, a couple
      news/blog sites) so the dashboard isn't empty on camera.
- [ ] Record at 1920×1080, browser zoom 100%, hide bookmarks bar.

---

## Beat 1 — Hook (0:00–0:30)
**Do:** Land on home. Hover the headline (it scrambles/decodes). Drag the score slider
once: tree withers red → blooms green.
**Say:** "This is AEGIS. You give it a URL or a GitHub repo, it runs real security
attacks, proves them, and writes the patch. Watch — *Scan, Prove, Patch, Re-grade.*"

## Beat 2 — Scan, live (0:30–1:30)
**Do:** Click the **AEGIS Range** hot-target (or paste `<vercel-url>/range`). Hit Scan.
Let the console stream the checks live; land on **grade F**, category rings, withered tree.
**Say:** "That's not a progress bar — it's a live Server-Sent-Events stream from a real
check engine: 14 checks across headers, TLS, cookies, CORS, clickjacking, info-disclosure,
and dependency CVEs. This target scored an F."

## Beat 3 — Prove it's real (1:30–2:30)  ← strongest moment
**Do:** Click the **Clickjacking** finding → **Exploit Test** tab → **Run Exploit**.
The real Range page renders *inside* the attacker frame with the decoy "Claim your reward"
button over it.
**Say:** "This isn't a mockup. I'm loading the actual target inside an attacker-controlled
iframe — it renders because the site sends no anti-framing headers. The verdict comes
straight from the real scan, not a timer. A protected site shows 'Exploit Blocked' instead."

## Beat 4 — AI Security Analyst (2:30–3:15)
**Do:** Scroll to the **AI Security Analyst** panel → **Generate Briefing**.
**Say:** "Claude reads every real finding and returns a prioritized briefing — for each
gap: how an attacker exploits it, the business impact, and the one fix that matters most.
Real model, real findings, no canned text."

## Beat 5 — Patch (3:15–4:00)
**Do:** On a finding → **Shield SDK** tab → download `aegis-shield.js` / `middleware.ts`,
open it, show it contains exactly the missing headers. Then **CI/CD Gate** tab → show the
GitHub Action that fails PRs below grade C.
**Say:** "AEGIS doesn't just diagnose — it writes the fix: a middleware tailored to *this*
target's missing headers, plus a CI gate so security can't regress in future PRs."

## Beat 6 — Re-grade, the payoff (4:00–4:45)  ← emotional peak
**Do:** Scan `<vercel-url>/range?safe=1` (the patched app). It streams to **A+**, the
**"POSTURE IMPROVED — F → A+, +XX points, N issues fixed"** banner animates in, tree blooms
to a lush green crown.
**Say:** "Same app, patched with the generated middleware, re-scanned and verified — F to
A-plus. The tree isn't decoration; it's the live security score."

## Beat 7 — Close + architecture (4:45–5:00)
**Do:** Show the **Threat Intelligence** tile (DB-backed stats), the README badge + report
export.
**Say:** "Next.js on Vercel, Express on Render, MongoDB Atlas. SSRF-guarded, normalized
data model, live streaming. Real engine, cinematic skin. That's AEGIS."

---

## One-liners to drop for Technical Depth points
- "SSRF guard blocks scans against localhost, private ranges, and cloud metadata."
- "Each check is a module returning evidence + a tailored fix — the engine is extensible."
- "Findings are normalized in MongoDB, keyed by scan, so reports and badges are reproducible."
