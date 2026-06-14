/**
 * Shared types for the AEGIS "Simulate Attacks" feature.
 * Mirrors the SimulatorOutput contract from dv2/dv/scanners/simulate.py
 * but ported to TypeScript and aligned to AEGIS's stack.
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
  score: number;
  grade: string;
}
