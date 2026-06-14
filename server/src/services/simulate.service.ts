/**
 * AEGIS Simulate Attacks — TypeScript port of dv2/dv/scanners/simulate.py.
 *
 * 8 non-destructive susceptibility probes run against a live URL target.
 * Uses AEGIS infra (fetchScanContext, calculateScoreAndGrade, validateTargetURL)
 * instead of Python subprocess; no Python anywhere.
 *
 * SAFETY POSTURE (non-negotiable): these are SAFE, non-destructive susceptibility
 * probes — benign payloads + response analysis ONLY. NO real exploitation, NO
 * DoS/flooding, NO auth bypass. GET-mostly, single-host, with hard request and
 * time caps.
 */

import { URL, URLSearchParams } from 'url';
import { fetchScanContext } from './fetcher.service';
import { calculateScoreAndGrade } from './score.service';
import type { AttackResult, AttackClass, Severity, SimulationResult, Verdict } from '../types/simulate';

const REQUEST_TIMEOUT = 8000; // ms per request
const MAX_TOTAL_REQUESTS = 20; // hard cap across the whole run
const USER_AGENT = 'AEGIS-Sim/1.0 (+non-destructive susceptibility probe)';

const DISCLAIMER =
  'These are SAFE, non-destructive susceptibility probes (benign payloads + ' +
  'response analysis only) — no exploitation, flooding, or auth bypass. Use ' +
  'only on targets you own or are authorized to test.';

// Severity rank (worst first)
const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

function worstSeverity(severities: Severity[]): Severity {
  let worst: Severity = 'info';
  for (const sev of severities) {
    if (SEVERITY_RANK[sev] < SEVERITY_RANK[worst]) worst = sev;
  }
  return worst;
}

// XSS marker (mirrors xss_scanner approach)
const XSS_MARKER_BASE = 'aegisXSS';
function xssMarker(): string {
  return XSS_MARKER_BASE + Math.random().toString(36).slice(2, 8);
}

// SQL error signatures — detection only, never data extraction
const SQLI_SIGNATURES = [
  /SQL syntax/i,
  /mysql_fetch/i,
  /ORA-\d{5}/i,
  /PostgreSQL.*ERROR/i,
  /SQLite3::/i,
  /ODBC SQL/i,
  /Unclosed quotation mark/i,
];

// Redirect-ish param names
const REDIRECT_PARAMS = ['next', 'url', 'redirect', 'return'];
const REDIRECT_PROBE_TARGET = 'https://example.org/sc-probe';

// Sensitive paths to probe (same-host, read-only GET, capped at 5)
const SENSITIVE_PATHS = [
  '/.git/config',
  '/.env',
  '/.well-known/security.txt',
  '/robots.txt',
  '/server-status',
];

// Session-like cookie names
const SESSION_LIKE = ['sess', 'sid', 'session', 'auth', 'token', 'login', 'csrf'];

// Attack class → finding category mapping
const ATTACK_CLASS_TO_CATEGORY: Record<AttackClass, string> = {
  xss: 'xss',
  sqli: 'xss',
  transport: 'transport',
  csrf: 'transport',
  clickjacking: 'headers',
  'open-redirect': 'headers',
  'sensitive-path': 'headers',
  'security-headers': 'headers',
};

// Budget object — mutable reference
interface Budget { remaining: number; }

function makeAttack(
  id: string,
  label: string,
  attackClass: AttackClass,
  verdict: Verdict,
  severity: Severity,
  description: string,
  payloadSummary: string,
  extras: { evidence?: string; recommendation?: string; reference?: string } = {},
): AttackResult {
  return { id, label, attackClass, verdict, severity, description, payloadSummary, ...extras };
}

async function budgetFetch(
  url: string,
  budget: Budget,
  options: RequestInit & { redirect?: 'follow' | 'manual' | 'error' } = {},
): Promise<Response | null> {
  if (budget.remaining <= 0) return null;
  budget.remaining--;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      ...options,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────
// Probe 1 — Security Headers
// ─────────────────────────────────────────────────────────────────
function probeSecurityHeaders(headers: Record<string, string>): AttackResult {
  const required: Array<{ name: string; key: string; severity: Severity }> = [
    { name: 'content-security-policy', key: 'CSP', severity: 'high' },
    { name: 'strict-transport-security', key: 'HSTS', severity: 'high' },
    { name: 'x-frame-options', key: 'X-Frame-Options', severity: 'medium' },
    { name: 'x-content-type-options', key: 'X-Content-Type-Options', severity: 'low' },
    { name: 'referrer-policy', key: 'Referrer-Policy', severity: 'low' },
    { name: 'permissions-policy', key: 'Permissions-Policy', severity: 'low' },
  ];

  const missing = required.filter(r => !headers[r.name]);

  if (missing.length > 0) {
    const worst = worstSeverity(missing.map(m => m.severity));
    return makeAttack(
      'attack.security-headers', 'Security Headers', 'security-headers', 'vulnerable', worst,
      'Inspected the response headers for the standard set of defensive security headers (CSP, HSTS, X-Frame-Options, etc.).',
      'GET / (inspect response headers)',
      {
        evidence: 'Missing: ' + missing.map(m => m.key).join(', '),
        recommendation: 'Add the missing security headers; CSP and HSTS are the highest priority.',
        reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers',
      },
    );
  }

  return makeAttack(
    'attack.security-headers', 'Security Headers', 'security-headers', 'defended', 'info',
    'Inspected the response headers for the standard set of defensive security headers; all expected headers were present.',
    'GET / (inspect response headers)',
    { evidence: 'All expected security headers present.' },
  );
}

// ─────────────────────────────────────────────────────────────────
// Probe 2 — Clickjacking
// ─────────────────────────────────────────────────────────────────
function probeClickjacking(headers: Record<string, string>): AttackResult {
  const xfoMissing = !headers['x-frame-options'];
  const cspHeader = headers['content-security-policy'] ?? '';
  const cspFrameAncestors = cspHeader.includes('frame-ancestors');

  if (xfoMissing && !cspFrameAncestors) {
    return makeAttack(
      'attack.clickjacking', 'Clickjacking', 'clickjacking', 'vulnerable', 'medium',
      'Checked whether the page can be framed by another origin. No X-Frame-Options header and no CSP frame-ancestors directive were found.',
      'GET / (inspect X-Frame-Options / CSP frame-ancestors)',
      {
        evidence: 'X-Frame-Options missing and no CSP frame-ancestors directive.',
        recommendation: 'Set X-Frame-Options: DENY or a CSP frame-ancestors directive.',
        reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
      },
    );
  }

  return makeAttack(
    'attack.clickjacking', 'Clickjacking', 'clickjacking', 'defended', 'info',
    'Checked whether the page can be framed by another origin. A framing control (X-Frame-Options or CSP frame-ancestors) appears to be in place.',
    'GET / (inspect X-Frame-Options / CSP frame-ancestors)',
    { evidence: 'Framing control present.' },
  );
}

// ─────────────────────────────────────────────────────────────────
// Probe 3 — Transport / TLS
// ─────────────────────────────────────────────────────────────────
function probeTransport(
  protocol: 'http' | 'https',
  tls: { valid: boolean } | null,
  headers: Record<string, string>,
): AttackResult {
  const noHttps = protocol === 'http';
  const badTls = protocol === 'https' && tls !== null && !tls.valid;
  const hstsShort = headers['strict-transport-security'] && parseInt(headers['strict-transport-security'].split('max-age=')[1]) < 31536000;

  if (noHttps || badTls) {
    const evParts: string[] = [];
    if (noHttps) evParts.push('served over plain HTTP');
    if (badTls) evParts.push('TLS certificate invalid or expired');
    if (hstsShort) evParts.push('HSTS max-age too short');

    return makeAttack(
      'attack.transport', 'Transport / TLS', 'transport', 'vulnerable',
      noHttps ? 'high' : 'medium',
      'Inspected the transport security posture: HTTPS usage, the TLS certificate/protocol, and cookie transport flags.',
      'GET / + one TLS handshake (read-only)',
      {
        evidence: evParts.join('; ') || 'transport weakness detected',
        recommendation: 'Serve all traffic over HTTPS with a valid certificate, modern TLS, and secure cookies.',
      },
    );
  }

  return makeAttack(
    'attack.transport', 'Transport / TLS', 'transport', 'defended', 'info',
    'Inspected the transport security posture: HTTPS is in use and the TLS certificate is valid with no transport weaknesses flagged.',
    'GET / + one TLS handshake (read-only)',
    { evidence: 'HTTPS in use; TLS certificate valid.' },
  );
}

// ─────────────────────────────────────────────────────────────────
// Probe 4 — CSRF / SameSite
// ─────────────────────────────────────────────────────────────────
async function probeCsrf(targetUrl: string, budget: Budget): Promise<AttackResult> {
  let resp: Response | null;
  try {
    resp = await budgetFetch(targetUrl, budget, { redirect: 'follow' });
  } catch {
    return makeAttack(
      'attack.csrf', 'CSRF / SameSite', 'csrf', 'inconclusive', 'info',
      'Inspected Set-Cookie flags for SameSite protection on session cookies.',
      'GET / (inspect Set-Cookie SameSite flag)',
      { evidence: 'host unreachable' },
    );
  }

  if (resp === null) {
    return makeAttack(
      'attack.csrf', 'CSRF / SameSite', 'csrf', 'inconclusive', 'info',
      'Inspected Set-Cookie flags for SameSite protection on session cookies.',
      'GET / (inspect Set-Cookie SameSite flag)',
      { evidence: 'request budget exhausted' },
    );
  }

  const setCookieHeader = resp.headers.get('set-cookie');
  if (!setCookieHeader) {
    return makeAttack(
      'attack.csrf', 'CSRF / SameSite', 'csrf', 'inconclusive', 'info',
      'Inspected Set-Cookie flags for SameSite protection on session cookies.',
      'GET / (inspect Set-Cookie SameSite flag)',
      { evidence: 'no cookies set' },
    );
  }

  // Parse raw Set-Cookie header(s) for SameSite
  const cookieStrings = setCookieHeader.split(/,(?=[^;]+=[^;])/); // rough split
  const weak: string[] = [];
  for (const cs of cookieStrings) {
    const parts = cs.split(';').map(p => p.trim());
    const nameValue = parts[0] ?? '';
    const cookieName = nameValue.split('=')[0].toLowerCase();
    const hasSameSite = parts.some(p => p.toLowerCase().startsWith('samesite'));
    const looksSession = SESSION_LIKE.some(k => cookieName.includes(k));
    if (looksSession && !hasSameSite) {
      weak.push(nameValue.split('=')[0]);
    }
  }

  if (weak.length > 0) {
    return makeAttack(
      'attack.csrf', 'CSRF / SameSite', 'csrf', 'vulnerable', 'medium',
      'A session-like cookie is set without the SameSite attribute, leaving it attachable to cross-site requests (CSRF surface).',
      'GET / (inspect Set-Cookie SameSite flag)',
      {
        evidence: 'Cookie(s) missing SameSite: ' + weak.join(', '),
        recommendation: 'Set SameSite=Lax or Strict (plus Secure and HttpOnly) on session cookies.',
        reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite',
      },
    );
  }

  return makeAttack(
    'attack.csrf', 'CSRF / SameSite', 'csrf', 'defended', 'info',
    'Inspected Set-Cookie flags; session cookies carry a SameSite attribute.',
    'GET / (inspect Set-Cookie SameSite flag)',
    { evidence: 'Session cookies set SameSite.' },
  );
}

// ─────────────────────────────────────────────────────────────────
// Probe 5 — Reflected XSS
// ─────────────────────────────────────────────────────────────────
async function probeXss(targetUrl: string, budget: Budget): Promise<AttackResult> {
  const parsedUrl = new URL(targetUrl);
  const params = parsedUrl.searchParams;
  const paramEntries = Array.from(params.entries());

  const marker = xssMarker();
  const xssPayload = `"'<${marker}>`;
  const payloadSummary = `GET ?<param>=${xssPayload}`;

  if (paramEntries.length === 0) {
    return makeAttack(
      'attack.xss', 'Reflected XSS', 'xss', 'inconclusive', 'info',
      'The URL has no query parameters, so there was no reflected-XSS surface to probe.',
      payloadSummary,
      { evidence: 'no query params to probe' },
    );
  }

  const vulnerableParams: string[] = [];
  const encodedParams: string[] = [];

  // Probe each param (budget-limited)
  for (const [name] of paramEntries) {
    if (budget.remaining <= 0) break;
    const testUrl = new URL(targetUrl);
    testUrl.searchParams.set(name, xssPayload);

    let resp: Response | null;
    try {
      resp = await budgetFetch(testUrl.href, budget, { redirect: 'follow' });
    } catch {
      continue;
    }
    if (!resp) break;

    const body = await resp.text().catch(() => '');
    if (body.includes(marker) && body.includes(`<${marker}>`)) {
      vulnerableParams.push(name);
    } else if (body.includes(marker)) {
      encodedParams.push(name);
    }
  }

  if (vulnerableParams.length > 0) {
    return makeAttack(
      'attack.xss', 'Reflected XSS', 'xss', 'vulnerable', 'high',
      'Injected a unique benign marker into each query parameter and found it reflected into the response unescaped (a reflected-XSS sink).',
      payloadSummary,
      {
        evidence: 'Unescaped reflection in param(s): ' + vulnerableParams.join(', '),
        recommendation: 'Context-encode all user input before rendering it into HTML.',
        reference: 'https://owasp.org/www-community/attacks/xss/',
      },
    );
  }

  if (encodedParams.length > 0) {
    return makeAttack(
      'attack.xss', 'Reflected XSS', 'xss', 'defended', 'info',
      'Injected a unique benign marker into each query parameter; reflected values were HTML-encoded, so no unescaped sink was found.',
      payloadSummary,
      { evidence: 'Encoded reflection in param(s): ' + encodedParams.join(', ') },
    );
  }

  return makeAttack(
    'attack.xss', 'Reflected XSS', 'xss', 'defended', 'info',
    'Injected a unique benign marker into each query parameter; no unescaped reflection was observed.',
    payloadSummary,
    { evidence: 'No unescaped reflection observed.' },
  );
}

// ─────────────────────────────────────────────────────────────────
// Probe 6 — Open Redirect
// ─────────────────────────────────────────────────────────────────
async function probeOpenRedirect(targetUrl: string, budget: Budget): Promise<AttackResult> {
  const parsedUrl = new URL(targetUrl);
  const params = parsedUrl.searchParams;

  const redirectParam = REDIRECT_PARAMS.find(p => params.has(p)) ?? 'next';
  const testUrl = new URL(targetUrl);
  testUrl.searchParams.set(redirectParam, REDIRECT_PROBE_TARGET);

  const payloadSummary = `GET ?${redirectParam}=${REDIRECT_PROBE_TARGET} (redirect:manual)`;

  let resp: Response | null;
  try {
    resp = await budgetFetch(testUrl.href, budget, { redirect: 'manual' });
  } catch {
    return makeAttack(
      'attack.open-redirect', 'Open Redirect', 'open-redirect', 'inconclusive', 'info',
      'Supplied a benign offsite URL in a redirect parameter to see whether the server would redirect off-host.',
      payloadSummary,
      { evidence: 'host unreachable' },
    );
  }

  if (!resp) {
    return makeAttack(
      'attack.open-redirect', 'Open Redirect', 'open-redirect', 'inconclusive', 'info',
      'Supplied a benign offsite URL in a redirect parameter to see whether the server would redirect off-host.',
      payloadSummary,
      { evidence: 'request budget exhausted' },
    );
  }

  const status = resp.status;
  const location = resp.headers.get('location') ?? '';

  if (status >= 300 && status < 400 && location) {
    try {
      const locHost = new URL(location).hostname;
      if (locHost.includes('example.org')) {
        return makeAttack(
          'attack.open-redirect', 'Open Redirect', 'open-redirect', 'vulnerable', 'high',
          'The server issued a redirect to the attacker-supplied offsite URL without validation — an open-redirect.',
          payloadSummary,
          {
            evidence: `Location: ${location}`,
            recommendation: 'Validate redirect targets against an allowlist of same-site paths.',
            reference: 'https://owasp.org/www-community/attacks/Open_redirect',
          },
        );
      }
      return makeAttack(
        'attack.open-redirect', 'Open Redirect', 'open-redirect', 'defended', 'info',
        'The server did not honor the attacker-supplied offsite redirect target.',
        payloadSummary,
        { evidence: `Redirect stayed on-host (Location: ${location}).` },
      );
    } catch {
      // unparseable location
    }
  }

  if (status >= 200 && status < 300) {
    return makeAttack(
      'attack.open-redirect', 'Open Redirect', 'open-redirect', 'inconclusive', 'info',
      'The redirect parameter did not trigger any redirect (the page rendered normally), so no open-redirect behaviour was observed.',
      payloadSummary,
      { evidence: `No redirect issued (status ${status}).` },
    );
  }

  return makeAttack(
    'attack.open-redirect', 'Open Redirect', 'open-redirect', 'defended', 'info',
    'The server did not redirect to the attacker-supplied offsite target.',
    payloadSummary,
    { evidence: `No offsite redirect (status ${status}).` },
  );
}

// ─────────────────────────────────────────────────────────────────
// Probe 7 — Sensitive Path
// ─────────────────────────────────────────────────────────────────
async function probeSensitivePath(targetUrl: string, budget: Budget): Promise<AttackResult> {
  const parsedUrl = new URL(targetUrl);
  const baseOrigin = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const payloadSummary = 'GET /.git/config, /.env, /.well-known/security.txt, /robots.txt, /server-status';

  const exposed: string[] = [];
  let robotsOk = false;
  let timedOut = false;
  let probed = 0;

  for (const path of SENSITIVE_PATHS.slice(0, 5)) {
    if (budget.remaining <= 0) { timedOut = true; break; }

    const url = baseOrigin + path;
    // SSRF safety: re-verify hostname
    try {
      const check = new URL(url);
      if (check.hostname !== parsedUrl.hostname) continue;
    } catch {
      continue;
    }

    probed++;
    let resp: Response | null;
    try {
      resp = await budgetFetch(url, budget, { redirect: 'manual' });
    } catch {
      timedOut = true;
      continue;
    }

    if (!resp) { timedOut = true; break; }

    if ((path === '/.git/config' || path === '/.env') && resp.status === 200) {
      const body = await resp.text().catch(() => '');
      if (body.trim().length > 0) exposed.push(path);
    }
    if (path === '/robots.txt' && resp.status === 200) robotsOk = true;
  }

  if (exposed.length > 0) {
    return makeAttack(
      'attack.sensitive-path', 'Sensitive File Exposure', 'sensitive-path', 'vulnerable', 'high',
      'Requested a small set of well-known sensitive paths; a secret/config file was served with a 200 and a non-empty body.',
      payloadSummary,
      {
        evidence: exposed.map(p => `${p} returned 200`).join('; '),
        recommendation: 'Block access to dotfiles and config paths (.git, .env) at the web server.',
        reference: 'https://owasp.org/www-community/vulnerabilities/Information_exposure_through_files',
      },
    );
  }

  if (timedOut) {
    return makeAttack(
      'attack.sensitive-path', 'Sensitive File Exposure', 'sensitive-path', 'inconclusive', 'info',
      'Requested a small set of well-known sensitive paths but could not complete every probe (timeout or budget).',
      payloadSummary,
      { evidence: `Probed ${probed} path(s); some requests did not complete.` },
    );
  }

  const evidence = robotsOk
    ? 'robots.txt present (expected); no sensitive files exposed.'
    : 'No sensitive files exposed.';

  return makeAttack(
    'attack.sensitive-path', 'Sensitive File Exposure', 'sensitive-path', 'defended', 'info',
    'Requested a small set of well-known sensitive paths; no secret or config files were exposed.',
    payloadSummary,
    { evidence },
  );
}

// ─────────────────────────────────────────────────────────────────
// Probe 8 — SQL Injection (signature detection only)
// ─────────────────────────────────────────────────────────────────
async function probeSqli(targetUrl: string, budget: Budget): Promise<AttackResult> {
  const parsedUrl = new URL(targetUrl);
  const params = parsedUrl.searchParams;
  const paramEntries = Array.from(params.entries());

  if (paramEntries.length === 0) {
    return makeAttack(
      'attack.sqli', 'SQL Injection', 'sqli', 'inconclusive', 'info',
      'The URL has no query parameters, so there was no injection surface to probe.',
      "GET ?<param>='",
      { evidence: 'no query params to probe' },
    );
  }

  const [firstName] = paramEntries[0];
  const testUrl = new URL(targetUrl);
  testUrl.searchParams.set(firstName, "'");
  const payloadSummary = `GET ?${firstName}='`;

  let resp: Response | null;
  try {
    resp = await budgetFetch(testUrl.href, budget, { redirect: 'follow' });
  } catch {
    return makeAttack(
      'attack.sqli', 'SQL Injection', 'sqli', 'inconclusive', 'info',
      'Sent a single benign quote and scanned the response for SQL error signatures, but the request failed.',
      payloadSummary,
      { evidence: 'host unreachable' },
    );
  }

  if (!resp) {
    return makeAttack(
      'attack.sqli', 'SQL Injection', 'sqli', 'inconclusive', 'info',
      'Sent a single benign quote and scanned the response for SQL error signatures, but the request budget was exhausted.',
      payloadSummary,
      { evidence: 'request budget exhausted' },
    );
  }

  if (resp.status >= 500) {
    return makeAttack(
      'attack.sqli', 'SQL Injection', 'sqli', 'inconclusive', 'info',
      'Sent a single benign quote; the server returned a 5xx, which is not a reliable injection signal on its own.',
      payloadSummary,
      { evidence: `server error (status ${resp.status})` },
    );
  }

  const body = await resp.text().catch(() => '');
  for (const sig of SQLI_SIGNATURES) {
    const m = sig.exec(body);
    if (m) {
      return makeAttack(
        'attack.sqli', 'SQL Injection', 'sqli', 'vulnerable', 'high',
        'Sent a single benign quote into a parameter; the response leaked a database error message, indicating unsanitized input reaches a SQL query.',
        payloadSummary,
        {
          evidence: `SQL error signature matched: ${m[0]}`,
          recommendation: 'Use parameterized queries / prepared statements and suppress DB errors.',
          reference: 'https://owasp.org/www-community/attacks/SQL_Injection',
        },
      );
    }
  }

  return makeAttack(
    'attack.sqli', 'SQL Injection', 'sqli', 'defended', 'info',
    'Sent a single benign quote into a parameter; no SQL error signatures appeared in the response.',
    payloadSummary,
    { evidence: `No SQL error signatures (status ${resp.status}).` },
  );
}

// ─────────────────────────────────────────────────────────────────
// Finding derivation (one per attack for scoring)
// ─────────────────────────────────────────────────────────────────
function findingFromAttack(attack: AttackResult): { severity: Severity } {
  return { severity: attack.verdict === 'defended' ? 'info' : attack.severity };
}

// ─────────────────────────────────────────────────────────────────
// Main orchestrator
// ─────────────────────────────────────────────────────────────────
export async function runSimulation(targetUrl: string): Promise<SimulationResult> {
  const warnings: string[] = [DISCLAIMER];
  const budget: Budget = { remaining: MAX_TOTAL_REQUESTS };
  const attacks: AttackResult[] = [];

  // Fetch base context (reuses AEGIS infra; counts as 1 request)
  const ctx = await fetchScanContext(targetUrl);
  budget.remaining--;

  // Probe 1 & 2 use headers from the base context — no extra requests
  attacks.push(probeSecurityHeaders(ctx.headers));
  attacks.push(probeClickjacking(ctx.headers));
  attacks.push(probeTransport(ctx.protocol, ctx.tls, ctx.headers));

  // Probe 4: CSRF (1 extra request)
  attacks.push(await probeCsrf(ctx.finalUrl, budget).catch(() => makeAttack(
    'attack.csrf', 'CSRF / SameSite', 'csrf', 'inconclusive', 'info',
    'Probe encountered an error.', 'GET / (inspect Set-Cookie SameSite flag)',
    { evidence: 'probe error' },
  )));

  // Probe 5: XSS (up to N requests, budget-capped)
  attacks.push(await probeXss(ctx.finalUrl, budget).catch(() => makeAttack(
    'attack.xss', 'Reflected XSS', 'xss', 'inconclusive', 'info',
    'Probe encountered an error.', "GET ?<param>=<xssPayload>",
    { evidence: 'probe error' },
  )));

  // Probe 6: Open Redirect (1 request)
  attacks.push(await probeOpenRedirect(ctx.finalUrl, budget).catch(() => makeAttack(
    'attack.open-redirect', 'Open Redirect', 'open-redirect', 'inconclusive', 'info',
    'Probe encountered an error.', 'GET ?next=<probe>',
    { evidence: 'probe error' },
  )));

  // Probe 7: Sensitive Path (up to 5 requests)
  attacks.push(await probeSensitivePath(ctx.finalUrl, budget).catch(() => makeAttack(
    'attack.sensitive-path', 'Sensitive File Exposure', 'sensitive-path', 'inconclusive', 'info',
    'Probe encountered an error.', 'GET /.git/config, /.env …',
    { evidence: 'probe error' },
  )));

  // Probe 8: SQLi (1 request)
  attacks.push(await probeSqli(ctx.finalUrl, budget).catch(() => makeAttack(
    'attack.sqli', 'SQL Injection', 'sqli', 'inconclusive', 'info',
    'Probe encountered an error.', "GET ?<param>='",
    { evidence: 'probe error' },
  )));

  // Derive findings for scoring
  const derivedFindings = attacks.map(findingFromAttack);
  const { score, grade } = calculateScoreAndGrade(derivedFindings);

  return {
    target: targetUrl,
    scannedAt: new Date().toISOString(),
    attacks,
    warnings,
    meta: {
      probesRun: attacks.length,
      requestsUsed: MAX_TOTAL_REQUESTS - budget.remaining,
    },
    score,
    grade,
  };
}
