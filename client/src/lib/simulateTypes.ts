/**
 * Client-side types for the AEGIS "Simulate Attacks" feature.
 * Mirrors server/src/types/simulate.ts — keep in sync.
 *
 * WebGL palette (VERDICT_HEX) uses AEGIS dark tokens; these are the only literal
 * hex values allowed on the client (WebGL can't read CSS vars).
 */

export type Verdict = 'defended' | 'vulnerable' | 'inconclusive';

export type AttackClass =
  | 'xss'
  | 'sqli'
  | 'clickjacking'
  | 'open-redirect'
  | 'sensitive-path'
  | 'csrf'
  | 'security-headers'
  | 'transport';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AttackResult {
  id: string;
  label: string;
  attackClass: AttackClass;
  verdict: Verdict;
  severity: Severity;
  description: string;
  payloadSummary: string;
  evidence?: string;
  recommendation?: string;
  reference?: string;
  durationMs?: number;
}

export interface SimulationResult {
  target: string;
  scannedAt: string;
  attacks: AttackResult[];
  warnings: string[];
  meta: Record<string, string | number>;
  score: number;
  grade: string;
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  vulnerable: 'Vulnerable',
  defended: 'Defended',
  inconclusive: 'Inconclusive',
};

export const VERDICT_ORDER: Verdict[] = ['vulnerable', 'inconclusive', 'defended'];

export const ATTACK_CLASS_LABELS: Record<AttackClass, string> = {
  xss: 'Cross-Site Scripting',
  sqli: 'SQL Injection',
  clickjacking: 'Clickjacking',
  'open-redirect': 'Open Redirect',
  'sensitive-path': 'Sensitive File Exposure',
  csrf: 'CSRF / SameSite',
  'security-headers': 'Security Headers',
  transport: 'Transport / TLS',
};

/** AEGIS dark-theme hex for verdicts (for WebGL — cannot use CSS vars). */
export const VERDICT_HEX: Record<Verdict, string> = {
  vulnerable: '#D5453B',   // --sev-critical
  defended: '#3FB950',     // --forest
  inconclusive: '#B59A3E', // --sev-medium
};
