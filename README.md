<div align="center">
  
  # 🛡️ AEGIS
  ### Active Web Vulnerability Scanner & Posture Management
  **Scan. Prove. Patch. Re-grade.**

  *Built for Devlynix Buildathon 2.0 (Track 2: Cybersecurity Tooling)*

  [![AEGIS Grade](https://img.shields.io/badge/Security-A%2B-3FB950?style=for-the-badge&logo=shield)](file:///c:/Users/vedhr/CODES/Devlynix)
  [![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Express%20%7C%20MongoDB-121817?style=for-the-badge&logo=nextdotjs&logoColor=white)](file:///c:/Users/vedhr/CODES/Devlynix)
  [![Theme](https://img.shields.io/badge/Theme-Silent%20Coder-243029?style=for-the-badge)](file:///c:/Users/vedhr/CODES/Devlynix)

  [**Explore AEGIS Range**](file:///c:/Users/vedhr/CODES/Devlynix/client/src/app/range/route.ts) • [**Check the Walkthrough**](file:///C:/Users/vedhr/.gemini/antigravity/brain/6351111f-8013-498a-bca5-7849df466adf/walkthrough.md)

</div>

---

## 🎯 The Vision
AEGIS is an automated web scanner and security dashboard designed to close the gap between **vulnerability reporting** and **remediation**. 

Traditional scanners output cluttered spreadsheets that developers ignore. AEGIS enforces a **Diagnose → Prove → Cure → Prove Cured** loop:
1. **Scan:** Paste a URL or GitHub repo to stream passive/active checks via a monospace **SSE Attack Console**.
2. **Prove:** Inspect verified evidence (CORS wildcards, missing headers) and run the **Active Exploit Simulator** (loads clickjacking targets in a sandboxed frame, fires local XSS probes).
3. **Patch:** Download tailored, framework-specific **Aegis Shield Middleware** (`aegis-shield.js` / `middleware.ts`) and CI/CD PR blockers.
4. **Re-grade:** Deploy the middleware, hit re-scan, watch your grade climb from **F → A+**, and verify that the exploits are now blocked.

---

## 🏗️ Monorepo Architecture

```
                                 ┌─────────────────┐
                                 │  Next.js App    │ (Vercel)
                                 │  (Bento Client) │
                                 └────────┬────────┘
                                          │ POST /scan (SSE Stream)
                                          ▼
                                 ┌─────────────────┐
                                 │   Express API   │ (Render)
                                 │ (Checks Engine) │
                                 └────────┬────────┘
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
         ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
         │   SSRF Guard    │     │   checks/ registry│   │ MongoDB Atlas   │
         │ (DNS resolver)  │     │  (OSV.dev, TLS) │     │ (Scans/Findings)│
         └─────────────────┘     └─────────────────┘     └─────────────────┘
```

* **`client/` (Next.js App Router):** A modern, dark-themed Bento-grid dashboard designed under the **Silent Coder** aesthetic (deep space charcoal `#0A0E0D`, forest-green highlights, zero neon/hyper-bright colors). Features a **3D procedural WebGL posture tree** representing your target's health.
* **`server/` (Node + Express + Mongoose):** A persistent, high-performance API service managing timeouts, DNS security resolution, check modules, and middleware generation.

---

## ⚔️ Shield checks Library

AEGIS executes lightweight, non-intrusive checks grouped into five core disciplines:

| Discipline | Check ID | Description | Severity |
|:---|:---|:---|:---|
| **Headers** | `csp` | Content-Security-Policy integrity & script-src filters | High |
| | `hsts` | HTTP Strict-Transport-Security min max-age verification | High |
| | `xfo` | Clickjacking protections via X-Frame-Options policies | Medium |
| | `xcto` | MIME sniffing disablement (nosniff directive) | Low |
| **Transport** | `https-present` | SSL/TLS protocol availability | High |
| | `cert-valid` | Expiry boundaries and trusted Certificate Authority (CA) check | Medium |
| **Cookies** | `cookie-security` | HttpOnly, Secure, and SameSite attribute verification | Medium |
| **CORS** | `cors` | Origin validation and wildcard configuration probes | High |
| **Dependencies**| `dependencies` | GitHub package parsing checked against **OSV.dev API** | High |

---

## 🛡️ SSRF Guard (Security Flagship)
To ensure the scanner itself cannot be exploited as an attack vector (Server-Side Request Forgery), all scan requests route through our custom `ssrf.guard.ts` DNS resolver. It resolves target domains and immediately rejects loopbacks, private networks, and cloud metadata endpoints:
- `127.0.0.0/8`, `localhost`, `::1`
- `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`
- `169.254.169.254` (AWS Metadata)

---

## 🛠️ Getting Started (Local Development)

### 1. Prerequisites
Ensure you have **Node.js v18+** and a running **MongoDB** database.

### 2. Configure Environment
Create a `.env` file in the `server/` directory:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/aegis
PORT=8080
CLIENT_ORIGIN=http://localhost:3000
ALLOW_LOCAL_SCANS=true
```

Create a `.env.local` file in the `client/` directory:
```env
NEXT_PUBLIC_API_BASE=http://localhost:8080/api
```

### 3. Spin up the backend
```bash
cd server
npm install
npm run dev
```

### 4. Spin up the frontend
```bash
cd client
npm install
npm run dev
```
Open **`http://localhost:3000`** to access the dashboard. Click the **`[AEGIS Range Target]`** button to execute a live local scan.

---

## ⚖️ License & Compliance
This software is built for security auditing and educational demonstration. Scans run strictly non-intrusive audits. The platform includes loopback defenses to prevent abuse.
