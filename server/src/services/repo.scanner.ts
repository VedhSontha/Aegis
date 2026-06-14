import type { FindingCategory, FixLang } from '../checks';

/** A normalized finding the scan controller can persist directly. */
export interface ScanFinding {
  checkId: string;
  category: FindingCategory;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  passed: boolean;
  evidence: string;
  description: string;
  fix: { text: string; code: string; lang: FixLang };
  weight: number;
}

type Severity = ScanFinding['severity'];

const GITHUB_API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const UA = 'AEGIS-Security-Scanner/1.0';
const REQ_TIMEOUT = 12000;
const MAX_CODE_FILES = 40;
const MAX_FILE_BYTES = 160000;
const MAX_FINDINGS_PER_RULE = 6;
const MAX_LINE_LEN = 600; // skip minified/bundled lines

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQ_TIMEOUT);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: controller.signal });
    const text = res.ok ? await res.text() : '';
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0, text: '' };
  } finally {
    clearTimeout(t);
  }
}

function mk(
  partial: Omit<ScanFinding, 'passed' | 'description' | 'weight'> & { passed?: boolean; description?: string; weight?: number }
): ScanFinding {
  return {
    passed: false,
    description: partial.title,
    weight: 1,
    ...partial
  };
}

function parseOwnerRepo(target: string): { owner: string; repo: string } | null {
  let path = target;
  if (target.startsWith('github:')) path = target.slice('github:'.length);
  else {
    try {
      path = new URL(target).pathname;
    } catch {
      /* fall through */
    }
  }
  const seg = path.split('/').filter(Boolean);
  if (seg.length < 2) return null;
  return { owner: seg[0], repo: seg[1].replace(/\.git$/i, '') };
}

// ---- Dependency parsing ----
interface Dep { name: string; version: string; ecosystem: 'npm' | 'PyPI'; }

function cleanNpmVersion(spec: string): string | null {
  const s = spec.trim();
  if (['git', 'file:', 'link:', 'workspace:', 'http', 'npm:'].some((p) => s.startsWith(p))) return null;
  const cleaned = s.replace(/^[\^~>=< v]+/, '').split(' ')[0];
  return /^\d+\.\d+/.test(cleaned) ? cleaned : null;
}

function parseRequirements(text: string): Dep[] {
  const deps: Dep[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.split('#')[0].trim();
    if (!line || line.startsWith('-')) continue;
    const m = line.match(/^([A-Za-z0-9_.\-]+)\s*==\s*([A-Za-z0-9_.\-]+)/);
    if (m) deps.push({ name: m[1], version: m[2], ecosystem: 'PyPI' });
  }
  return deps;
}

// ---- OSV ----
async function osvBatch(deps: Dep[]): Promise<Array<Array<{ id: string; summary: string; severity: Severity }>>> {
  if (deps.length === 0) return [];
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQ_TIMEOUT);
  let results: any[] = [];
  try {
    const res = await fetch('https://api.osv.dev/v1/querybatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      signal: controller.signal,
      body: JSON.stringify({ queries: deps.map((d) => ({ version: d.version, package: { name: d.name, ecosystem: d.ecosystem } })) })
    });
    if (res.ok) results = (await res.json()).results || [];
  } catch {
    /* ignore */
  } finally {
    clearTimeout(t);
  }

  const detailCache = new Map<string, Severity>();
  let budget = 25;
  const out: Array<Array<{ id: string; summary: string; severity: Severity }>> = [];

  for (const entry of results) {
    const vulns = (entry && entry.vulns) || [];
    const mapped: Array<{ id: string; summary: string; severity: Severity }> = [];
    for (const v of vulns) {
      const id = v.id as string;
      if (!id) continue;
      let severity: Severity = 'high';
      let summary = '';
      if (!detailCache.has(id) && budget > 0) {
        budget--;
        const d = await fetchText(`https://api.osv.dev/v1/vulns/${id}`);
        if (d.ok) {
          try {
            const detail = JSON.parse(d.text);
            summary = detail.summary || (detail.details ? String(detail.details).slice(0, 160) : '');
            severity = severityFromOsv(detail);
          } catch {
            /* ignore */
          }
        }
        detailCache.set(id, severity);
      } else {
        severity = detailCache.get(id) ?? 'high';
      }
      mapped.push({ id, summary, severity });
    }
    out.push(mapped);
  }
  return out;
}

function severityFromOsv(detail: any): Severity {
  const dbSev = (detail.database_specific || {}).severity;
  if (typeof dbSev === 'string') {
    const s = dbSev.toLowerCase();
    if (s === 'critical') return 'critical';
    if (s === 'high') return 'high';
    if (s === 'moderate' || s === 'medium') return 'medium';
    if (s === 'low') return 'low';
  }
  // CVSS vector → rough bucket
  const sevArr = detail.severity;
  if (Array.isArray(sevArr) && sevArr[0]?.score) {
    const score = String(sevArr[0].score);
    const m = score.match(/(\d+\.\d+)/);
    if (m) {
      const n = parseFloat(m[1]);
      if (n >= 9) return 'critical';
      if (n >= 7) return 'high';
      if (n >= 4) return 'medium';
      return 'low';
    }
  }
  return 'high';
}

// ---- Sensitive committed files (by path) ----
function classifySensitiveFile(path: string): { severity: Severity; what: string } | null {
  const base = path.split('/').pop()!.toLowerCase();
  if (/^\.env(\.|$)/.test(base) && !/\.(example|sample|template|dist)$/.test(base)) {
    return { severity: 'high', what: 'environment file (.env) — likely contains secrets' };
  }
  if (/\.(pem|key|pfx|p12|keystore|jks)$/.test(base)) return { severity: 'high', what: 'private key / keystore material' };
  if (/^id_(rsa|dsa|ecdsa|ed25519)$/.test(base)) return { severity: 'critical', what: 'SSH private key' };
  if (base === 'credentials.json' || base === 'serviceaccount.json' || base === '.pypirc') {
    return { severity: 'high', what: 'cloud/service credentials file' };
  }
  if (base === '.npmrc' || base === '.netrc') return { severity: 'low', what: 'config file that can hold auth tokens — verify it has none' };
  return null;
}

// ---- Secret + dangerous-pattern rules (content) ----
interface ContentRule {
  re: RegExp;
  category: FindingCategory;
  severity: Severity;
  title: string;
  fixText: string;
  lang: FixLang;
}

const SECRET_RULES: ContentRule[] = [
  { re: /AKIA[0-9A-Z]{16}/, category: 'secrets', severity: 'critical', title: 'Hardcoded AWS access key ID', fixText: 'Revoke the key immediately and load credentials from environment/secret manager.', lang: 'text' },
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, category: 'secrets', severity: 'critical', title: 'Private key committed in source', fixText: 'Remove the key, rotate it, and keep keys out of the repo (use a secret store).', lang: 'text' },
  { re: /AIza[0-9A-Za-z\-_]{35}/, category: 'secrets', severity: 'high', title: 'Hardcoded Google API key', fixText: 'Revoke and move to an environment variable; restrict the key by referrer/IP.', lang: 'text' },
  { re: /ghp_[0-9A-Za-z]{36}/, category: 'secrets', severity: 'high', title: 'Hardcoded GitHub personal access token', fixText: 'Revoke the token in GitHub settings and use a secret instead.', lang: 'text' },
  { re: /xox[baprs]-[0-9A-Za-z-]{10,}/, category: 'secrets', severity: 'high', title: 'Hardcoded Slack token', fixText: 'Revoke the token and load it from the environment.', lang: 'text' },
  { re: /sk_live_[0-9a-zA-Z]{24}/, category: 'secrets', severity: 'critical', title: 'Hardcoded Stripe live secret key', fixText: 'Roll the key in the Stripe dashboard and store it in a secret manager.', lang: 'text' },
  { re: /(?:api[_-]?key|secret|password|passwd|access[_-]?token|auth[_-]?token)["'\s]*[:=]\s*["'][^"']{8,}["']/i, category: 'secrets', severity: 'medium', title: 'Possible hardcoded credential', fixText: 'Move secrets to environment variables / a secret manager; never commit them.', lang: 'text' }
];

const CODE_RULES: ContentRule[] = [
  { re: /\beval\s*\(/, category: 'code', severity: 'high', title: 'Use of eval() (code injection risk)', fixText: 'Avoid eval; parse data explicitly (JSON.parse) or use a safe interpreter.', lang: 'javascript' },
  { re: /\bexec(?:Sync)?\s*\([^)]*(?:\$\{|`|\+)/, category: 'code', severity: 'high', title: 'Shell command built from variables (command injection)', fixText: 'Use execFile with an args array; never interpolate user input into a shell string.', lang: 'javascript' },
  { re: /dangerouslySetInnerHTML/, category: 'code', severity: 'medium', title: 'React dangerouslySetInnerHTML (XSS risk)', fixText: 'Sanitize HTML (e.g. DOMPurify) before injecting, or render as text.', lang: 'javascript' },
  { re: /\bos\.system\s*\(/, category: 'code', severity: 'high', title: 'Python os.system() (command injection risk)', fixText: 'Use subprocess.run([...]) with a list of args and shell=False.', lang: 'python' },
  { re: /subprocess\.[A-Za-z_]+\([^)]*shell\s*=\s*True/, category: 'code', severity: 'high', title: 'subprocess with shell=True (command injection risk)', fixText: 'Pass args as a list and avoid shell=True with untrusted input.', lang: 'python' },
  { re: /yaml\.load\s*\((?![^)]*Loader)/, category: 'code', severity: 'medium', title: 'yaml.load without SafeLoader (deserialization risk)', fixText: 'Use yaml.safe_load() to avoid arbitrary object construction.', lang: 'python' },
  { re: /pickle\.loads?\s*\(/, category: 'code', severity: 'medium', title: 'pickle deserialization (RCE risk on untrusted data)', fixText: 'Never unpickle untrusted data; use JSON or a safe format.', lang: 'python' },
  { re: /(?<![.\w])(?:INSERT\s+INTO|UPDATE\s+[\w.]+\s+SET|DELETE\s+FROM|DROP\s+TABLE|SELECT\b[^;]{0,120}\bFROM\b)[^;\n]{0,100}(?:["'`]\s*\+|\+\s*["'`]|\$\{|%s|%\()/i, category: 'code', severity: 'high', title: 'SQL query built by string concatenation (SQL injection)', fixText: 'Use parameterized queries / prepared statements instead of string building.', lang: 'sql' }
];

const CODE_EXT = /\.(js|jsx|ts|tsx|py|rb|go|php|java|env|yml|yaml|json|sh|cfg|ini|properties|xml|txt)$/i;
const SKIP_PATH = /(?:^|\/)(?:node_modules|vendor|dist|build|\.next|\.git|test|tests|__tests__|fixtures|examples?)\//i;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function scanRepo(
  target: string,
  onFinding: (f: ScanFinding) => void
): Promise<{ findings: ScanFinding[]; meta: Record<string, unknown> }> {
  const findings: ScanFinding[] = [];
  const meta: Record<string, unknown> = {};
  const emit = (f: ScanFinding) => {
    findings.push(f);
    onFinding(f);
  };

  const parsed = parseOwnerRepo(target);
  if (!parsed) {
    emit(mk({ checkId: 'repo.invalid', category: 'dependencies', severity: 'info', title: 'Could not parse owner/repo', evidence: target, passed: true, fix: { text: 'Use github:owner/repo or a github.com URL.', code: '', lang: 'text' } }));
    return { findings, meta };
  }
  const { owner, repo } = parsed;
  meta.owner = owner;
  meta.repo = repo;

  // 1) default branch
  let branch = 'main';
  const metaRes = await fetchText(`${GITHUB_API}/repos/${owner}/${repo}`, ghHeaders());
  if (metaRes.ok) {
    try { branch = JSON.parse(metaRes.text).default_branch || 'main'; } catch { /* keep main */ }
  } else if (metaRes.status === 404) {
    emit(mk({ checkId: 'repo.notfound', category: 'dependencies', severity: 'info', title: 'Repository not found or private', evidence: `${owner}/${repo}`, passed: true, fix: { text: 'Make sure the repo is public.', code: '', lang: 'text' } }));
    return { findings, meta };
  }
  meta.defaultBranch = branch;

  // 2) dependency manifests → OSV
  const deps: Dep[] = [];
  const manifestsFound: string[] = [];
  const pkgRes = await fetchText(`${RAW}/${owner}/${repo}/${branch}/package.json`);
  if (pkgRes.ok) {
    manifestsFound.push('package.json');
    try {
      const pkg = JSON.parse(pkgRes.text);
      for (const section of ['dependencies', 'devDependencies']) {
        for (const [name, spec] of Object.entries(pkg[section] || {})) {
          const version = cleanNpmVersion(String(spec));
          if (version) deps.push({ name, version, ecosystem: 'npm' });
        }
      }
    } catch { /* ignore */ }
  }
  const reqRes = await fetchText(`${RAW}/${owner}/${repo}/${branch}/requirements.txt`);
  if (reqRes.ok) {
    manifestsFound.push('requirements.txt');
    deps.push(...parseRequirements(reqRes.text));
  }
  meta.manifestsFound = manifestsFound.join(', ') || 'none';
  meta.dependenciesChecked = deps.length;

  const osvResults = await osvBatch(deps);
  let vulnCount = 0;
  osvResults.forEach((vulns, idx) => {
    const dep = deps[idx];
    for (const v of vulns) {
      vulnCount++;
      emit(mk({
        checkId: `dep.vuln.${dep.name}.${v.id}`,
        category: 'dependencies',
        severity: v.severity,
        title: `${dep.name}@${dep.version} — ${v.id}`,
        evidence: v.summary || `Known advisory ${v.id} affects ${dep.name}@${dep.version} (${dep.ecosystem}).`,
        description: `Vulnerable dependency ${dep.name}@${dep.version}.`,
        weight: 1,
        fix: { text: `Upgrade ${dep.name} to a patched version. Ref: https://osv.dev/vulnerability/${v.id}`, code: dep.ecosystem === 'npm' ? `npm install ${dep.name}@latest` : `pip install -U ${dep.name}`, lang: 'bash' }
      }));
    }
  });
  meta.vulnerabilitiesFound = vulnCount;

  // 3) repo file tree → sensitive files + content scanning
  let sensitiveCount = 0;
  let codeIssueCount = 0;
  const treeRes = await fetchText(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, ghHeaders());
  if (treeRes.ok) {
    let tree: any[] = [];
    try { tree = JSON.parse(treeRes.text).tree || []; } catch { /* ignore */ }
    const blobs = tree.filter((n) => n.type === 'blob' && typeof n.path === 'string');

    // 3a) sensitive committed files (no content fetch needed)
    for (const node of blobs) {
      const cls = classifySensitiveFile(node.path);
      if (cls) {
        sensitiveCount++;
        emit(mk({
          checkId: `secret.file.${node.path}`,
          category: 'secrets',
          severity: cls.severity,
          title: `Sensitive file committed: ${node.path.split('/').pop()}`,
          evidence: `${node.path} — ${cls.what}`,
          description: `A ${cls.what} is tracked in the repository.`,
          fix: { text: 'Remove the file from history (git filter-repo / BFG), rotate any exposed secrets, and add it to .gitignore.', code: `git rm --cached ${node.path}\necho "${node.path}" >> .gitignore`, lang: 'bash' }
        }));
      }
    }

    // 3b) content scan a capped set of code/config files
    const candidates = blobs
      .filter((n) => CODE_EXT.test(n.path) && !SKIP_PATH.test('/' + n.path) && (typeof n.size !== 'number' || n.size < MAX_FILE_BYTES))
      .slice(0, MAX_CODE_FILES);
    meta.filesScanned = candidates.length;

    const ruleHits = new Map<string, number>();
    await mapLimit(candidates, 6, async (node) => {
      const fileRes = await fetchText(`${RAW}/${owner}/${repo}/${branch}/${node.path}`);
      if (!fileRes.ok) return;
      const lines = fileRes.text.split('\n');
      for (const rule of [...SECRET_RULES, ...CODE_RULES]) {
        const key = rule.title;
        for (let ln = 0; ln < lines.length; ln++) {
          const line = lines[ln];
          if (line.length > MAX_LINE_LEN) continue;
          if (rule.re.test(line)) {
            const count = ruleHits.get(key) || 0;
            if (count >= MAX_FINDINGS_PER_RULE) break;
            ruleHits.set(key, count + 1);
            if (rule.category === 'secrets') sensitiveCount++; else codeIssueCount++;
            emit(mk({
              checkId: `${rule.category}.${key.replace(/\W+/g, '_')}.${node.path}.${ln + 1}`,
              category: rule.category,
              severity: rule.severity,
              title: rule.title,
              evidence: `${node.path}:${ln + 1}  ${line.trim().slice(0, 120)}`,
              description: rule.title,
              fix: { text: rule.fixText, code: '', lang: rule.lang }
            }));
          }
        }
      }
    });
  } else {
    meta.treeError = `GitHub tree unavailable (status ${treeRes.status})`;
  }
  meta.sensitiveFindings = sensitiveCount;
  meta.codeFindings = codeIssueCount;

  // 4) clean summary
  if (findings.length === 0) {
    emit(mk({
      checkId: 'repo.clean',
      category: 'dependencies',
      severity: 'info',
      title: 'No issues detected',
      evidence: `Checked ${deps.length} dependencies and scanned source for secrets and dangerous patterns.`,
      passed: true,
      fix: { text: '', code: '', lang: 'text' }
    }));
  }

  return { findings, meta };
}
