# AEGIS Client (Bento Dashboard)

This is the Next.js App Router client frontend for AEGIS. It provides a real-time, interactive dashboard for vulnerability scanning, posture visualization, and active exploit simulations.

## Key Features

- **Procedural 3D Posture Tree** — Visualizes the security posture of target domains/repos using three-dimensional WebGL rendering.
- **Monospace SSE Attack Console** — Streams check results in real-time as the backend performs the audits.
- **Active Exploit Simulator** — Provides interactive, sandboxed simulations (such as clickjacking frames and XSS reflection probes).
- **AI Threat Briefings** — Generates natural language risk summaries and mitigation advice via Gemini.
- **Bento Grid Layout** — Fully responsive, dark-themed dashboard built with custom styling.

## Getting Started

First, ensure you have the AEGIS backend server running on port `8080` (or configure your base URL).

### Environment Configuration
Create a `.env.local` file in this directory:
```env
NEXT_PUBLIC_API_BASE=http://localhost:8080/api
```

### Installation & Development Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the client.
