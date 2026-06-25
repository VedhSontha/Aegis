<div align="center">

# AEGIS

**Active Web Vulnerability Scanner & Posture Management**

Scan. Prove. Patch. Re-grade.

[![Stack](https://img.shields.io/badge/Next.js_|_Express_|_MongoDB-121817?style=flat-square&logo=nextdotjs&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)
[![Deploy](https://img.shields.io/badge/Vercel_+_Render-000?style=flat-square&logo=vercel&logoColor=white)](#)
[![License](https://img.shields.io/badge/Educational_Use-243029?style=flat-square)](#license)

*Built for Devlynix Buildathon 2.0 — Track 2: Cybersecurity Tooling*

</div>

---

## What is AEGIS?

Most vulnerability scanners dump a spreadsheet of findings and call it done. Developers ignore them.

AEGIS enforces a closed-loop workflow:

1. **Scan** — Paste a URL or GitHub repo. Checks stream in real-time through a monospace SSE Attack Console.
2. **Prove** — Inspect verified evidence (CORS wildcards, missing headers) and run the Active Exploit Simulator (clickjacking frames, XSS probes).
3. **Patch** — Download tailored, framework-specific Shield Middleware (`aegis-shield.js` / `middleware.ts`) and CI/CD PR blockers.
4. **Re-grade** — Deploy the middleware, re-scan, and watch the grade climb from F → A+.

---

## Screenshots

<div align="center">

**Landing — Scan Input**

<img src="docs/landing.png" width="720" alt="AEGIS landing page with scan input"/>

**Audit Dashboard — Before (F) vs After (A+)**

<p>
<img src="docs/scan-f.png" width="355" alt="Scan result showing F grade"/>
<img src="docs/scan-a.png" width="355" alt="Scan result showing A+ grade after patching"/>
</p>

**Security Posture Tree & AI Threat Briefing**

<img src="docs/dashboard.png" width="720" alt="3D security posture tree and AI analyst panel"/>

**Vulnerability Audit & Remediation Drawer**

<img src="docs/remediation.png" width="720" alt="Vulnerability list with fix recommendations"/>

</div>

---

## Architecture

```
┌──────────────────┐
│   Next.js App    │  (Vercel)
│   Bento Client   │
└────────┬─────────┘
         │ POST /scan  (SSE stream)
         ▼
┌──────────────────┐
│   Express API    │  (Render)
│   Checks Engine  │
└────────┬─────────┘
         │
    ┌────┼──────────────┐
    ▼    ▼              ▼
┌──────┐ ┌───────────┐ ┌──────────┐
│ SSRF │ │  checks/  │ │ MongoDB  │
│Guard │ │ registry  │ │  Atlas   │
└──────┘ └───────────┘ └──────────┘
```

- **`client/`** — Next.js App Router. Dark-themed Bento-grid dashboard with a procedural WebGL posture tree, category rings, and AI-powered threat briefings via Gemini.
- **`server/`** — Express + TypeScript. Manages scan orchestration, check modules, SSRF-safe DNS resolution, middleware generation, and MongoDB persistence.

---

## Check Library

AEGIS runs lightweight, non-intrusive checks across five disciplines:

| Discipline | Check | Severity |
|:---|:---|:---:|
| **Headers** | Content-Security-Policy (CSP) | High |
| | HTTP Strict-Transport-Security (HSTS) | High |
| | X-Frame-Options (clickjacking) | Medium |
| | X-Content-Type-Options (MIME sniffing) | Low |
| | Referrer-Policy | Low |
| | Permissions-Policy | Low |
| **Transport** | HTTPS availability | High |
| | HTTP→HTTPS redirect traversal | Medium |
| | Certificate validity & CA trust | Medium |
| | TLS version & cipher strength validation | Medium |
| **Cookies** | HttpOnly, Secure, SameSite attributes | Medium |
| **CORS** | Origin validation & wildcard probes | High |
| **Framing** | Clickjacking frame injection test | Medium |
| **XSS** | Reflected input parameter reflection probes | High |
| **Disclosure** | Server version header leakage | Low |
| **Dependencies** | GitHub package audit via OSV.dev API | High |

---

## SSRF Guard

The scanner itself can't be weaponized. All scan targets route through a custom DNS resolver (`ssrf.guard.ts`) that blocks:

- Loopback & Localhost: `127.0.0.0/8`, `0.0.0.0`, `localhost`, `::1`
- Private & CGNAT ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10`
- Cloud metadata: `169.254.169.254`

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Backend

```bash
cd server
cp .env.example .env    # fill in MONGODB_URI
npm install
npm run dev             # runs on :8080
```

### Frontend

```bash
cd client
npm install
npm run dev             # runs on :3000
```

Open `http://localhost:3000`. Hit **[AEGIS Range Target]** to run a live scan against the built-in vulnerable test page.

### Environment Variables

**`server/.env`**
```env
MONGODB_URI=mongodb://127.0.0.1:27017/aegis
PORT=8080
CLIENT_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your-key-here
AEGIS_AI_MODEL=gemini-2.0-flash
ALLOW_LOCAL_SCANS=true
```

**`client/.env.local`**
```env
NEXT_PUBLIC_API_BASE=http://localhost:8080/api
```

---

## Deployment

| Service | Platform | Config |
|:---|:---|:---|
| Frontend | Vercel | Auto-detected from `client/` |
| Backend | Render | Blueprint via `render.yaml` |
| Database | MongoDB Atlas | Free M0 cluster |

Set `ALLOW_LOCAL_SCANS=false` in production to enforce SSRF protection.

---

## Project Structure

```
Aegis/
├── client/                  # Next.js frontend
│   └── src/
│       ├── app/             # App Router pages (scan, report, simulate, range)
│       ├── components/      # UI (AttackConsole, ExploitSimulator, LivingTree3D, ...)
│       └── lib/             # API client utilities
├── server/                  # Express backend
│   └── src/
│       ├── checks/          # Security check modules (headers, tls, cors, xss, ...)
│       ├── controllers/     # Request handlers
│       ├── generators/      # Shield middleware & CI/CD config generators
│       ├── models/          # Mongoose schemas
│       ├── routes/          # API routes
│       ├── services/        # Scan orchestration & AI briefing
│       └── types/           # TypeScript type definitions
├── render.yaml              # Render deployment blueprint
└── README.md
```

---

## License

Built for security auditing and educational demonstration. All scans are non-intrusive. The platform includes loopback defenses and rate limiting to prevent abuse.
