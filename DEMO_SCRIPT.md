# AEGIS — 10-Minute Demo Video Script
**Devlynix Buildathon 2.0 · Track 2: Cybersecurity Tooling**

> Required: ~10 min architectural walkthrough. Live deploy + GitHub + screen-recorded demo.
> Live app: https://client-psi-lemon-26.vercel.app
> API: https://aegis-server-1amb.onrender.com
> Repo: https://github.com/VedhSontha/Aegis

> ⚠️ BEFORE RECORDING: open https://aegis-server-1amb.onrender.com/health once to wake the
> server (Render free tier sleeps after 15 min — first request takes ~50s). Wait for
> {"status":"UP"} then start recording so scans are instant on camera.

---

## [0:00 – 0:45] Intro / The Problem

**Say:**
"Hi, we're [names], and this is AEGIS — a web security scanner built for Track 2,
Cybersecurity Tooling.

The problem: most developers ship apps without knowing if they're secure. Security
scanners exist, but they either just dump a list of warnings you don't understand, or
they cost money. AEGIS does four things in one loop — it scans, it *proves* the
vulnerability is real, it generates the exact patch, and then it re-grades you so you
can watch your security improve.

Our tagline is: **Scan. Prove. Patch. Re-grade.**"

**Show:** Homepage. Let the shader hero + headline breathe for a second.

---

## [0:45 – 1:30] The Tech Stack (architecture overview)

**Say:**
"Quick architecture before the demo.

- The frontend is **Next.js 16 with React 19 and Tailwind**, deployed on **Vercel**.
- The backend is **Express 5 in TypeScript**, deployed on **Render**, with **MongoDB
  Atlas** storing every scan and finding.
- Scans stream live to the browser over **Server-Sent Events**, so you see each probe
  run in real time.
- The AI briefing is powered by **Google Gemini**.
- And every scan is protected by **SSRF guards** — we block private IPs and DNS-rebind
  attacks so the scanner can't be turned into an attack tool against internal networks."

**Show:** Scroll the homepage — the 3D Living Tree, the feature cards.

---

## [1:30 – 3:00] Demo Part 1 — Scan the Range (the bad grade)

**Say:**
"Let's scan something. We built an intentionally vulnerable target into AEGIS itself —
the AEGIS Range. I'll click it."

**Do:** Click **[AEGIS Range Target]**.

**Say (while it streams):**
"Watch the Attack Console on the right — this is live, streaming over SSE. Each line is
a real probe hitting the target: security headers, clickjacking, transport security,
cookie flags, CORS, XSS reflection.

And here's the result — a failing grade. The Security Rating ring shows the score, the
category breakdown shows *which* areas failed, and the Living Tree visualizes it — when
your security is bad, the tree is dead and red."

**Show:** Point at the Grade Ring, Category Rings, dead tree.

---

## [3:00 – 4:30] Demo Part 2 — Prove + Understand

**Say:**
"A score isn't enough — you need to know what's actually wrong. Two things here.

First, the AI Security Analyst. I'll click Generate Briefing."

**Do:** Click **Generate Briefing**. Wait for Gemini response.

**Say:**
"Gemini takes the real findings and turns them into a prioritized threat briefing — a
headline, a risk level, and the top issues with the actual attack vector and how to fix
each one. This is the part that makes security understandable to a normal developer.

Second — proof. I'll click a failing finding."

**Do:** Click a failed finding in the Vulnerabilities Audit → Remediation Drawer opens.

**Say:**
"The Remediation Drawer shows the exact evidence and the exact fix — the literal header
or code you need to add. No guessing."

---

## [4:30 – 5:45] Demo Part 3 — Simulate Attacks (the showpiece)

**Say:**
"Now the part we're most proud of. For any live URL, you can run a full attack
simulation. I'll click Simulate Attacks."

**Do:** Click **Simulate Attacks** → /simulate page → **Launch Siege**.

**Say:**
"This launches 8 non-destructive attack probes against the target — reflected XSS, open
redirect, SQL injection error signatures, sensitive path enumeration, CSRF, clickjacking,
transport downgrade, and security headers.

The 3D orbital siege you're watching isn't just eye candy — each beam is a real probe
firing, and the results panel fills in live with which attacks the target is vulnerable
to. Everything is non-destructive — we never actually exploit, we just prove the
vulnerability exists."

**Show:** Let the siege scene run, point at the results table filling in.

---

## [5:45 – 7:00] Demo Part 4 — Patch + Re-grade (the payoff)

**Say:**
"So we've found the problems and proved them. Now we fix them. AEGIS generates a
ready-to-deploy middleware patch with exactly the missing headers."

**Do:** Download the Shield / show the generated middleware code.

**Say:**
"You drop this into your Express or Next.js app and you're patched. To prove it works,
we've got a patched version of the same target at /range?safe=1 — same page, but with
the security headers applied. Let me scan that."

**Do:** Scan `https://client-psi-lemon-26.vercel.app/range?safe=1` (or use Re-Scan flow).

**Say:**
"And there it is — the grade jumps to A+, and watch the Living Tree come back to life,
full and green. That's the whole loop: Scan, Prove, Patch, Re-grade."

**Show:** The before/after grade reveal (F → A+), the blooming tree.

---

## [7:00 – 8:30] Code Walkthrough (architectural depth)

**Say:**
"Let me show the architecture in the code."

**Show in editor / GitHub:**
- `server/src/checks/` — "Each security check is a self-contained module — headers, TLS,
  cookies, CORS, clickjacking, XSS, dependencies. Easy to add more."
- `server/src/services/score.service.ts` — "Scoring uses a diminishing-returns curve, so
  a few critical issues hurt more than a long tail of minor ones — it mirrors real risk."
- `server/src/services/simulate.service.ts` — "The 8 attack probes, all non-destructive,
  with a shared request budget and per-request timeouts."
- `server/src/services/fetcher.service.ts` / SSRF guard — "Before any scan we validate the
  target — private IPs and rebind attacks are blocked."
- `client/src/components/simulation/SiegeScene.tsx` — "The siege is React Three Fiber,
  driven by a single animation clock — no setInterval, pure render loop, so it stays
  smooth."

---

## [8:30 – 9:30] Repo scan + extras (breadth)

**Say:**
"AEGIS has a second mode — GitHub repo scanning. Instead of web probes, it checks the
repo's dependencies against the OSV vulnerability database and looks for committed
secrets. We're transparent about scope — if you scan a repo, we tell you exactly what was
and wasn't checked.

A few more things we shipped: a downloadable Markdown audit report, a README security
badge, and a CI/CD workflow generator so you can run AEGIS checks on every pull request."

**Show:** Quickly — repo scan result with the scope banner, the export/badge buttons.

---

## [9:30 – 10:00] Close

**Say:**
"To recap — AEGIS is a full security loop: it scans live URLs and GitHub repos, proves
vulnerabilities with a live attack simulation, explains them with AI, generates the exact
patch, and re-grades you so you can watch your security improve.

It's fully deployed and live — frontend on Vercel, backend on Render, MongoDB,
Gemini AI. Everything you saw is running in production right now.

Thanks for watching."

**Show:** End on the homepage / live URL.

---

## Recording Tips
- Warm the server first (hit /health) — don't let a cold start show on camera.
- Record at 1080p, browser zoomed slightly so text is readable.
- If the AI briefing hits a Gemini quota, skip it live and mention "AI briefing here" —
  don't let an error sit on screen.
- Keep each section tight; 10 min goes fast. Practice the Range → patch → A+ loop once
  before recording — it's the money shot.
- Have the patched tab (/range?safe=1) pre-loaded so the re-grade is instant.
