export interface ScoreResult {
  score: number;
  grade: string;
}

// Cumulative severity weights — every failed finding adds to the penalty, so the
// grade tracks the real number/severity of problems (not a single pass/fail check).
const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
  info: 0
};

/**
 * Diminishing-returns curve: the first serious findings move the needle a lot,
 * while a long tail of low/info noise can't drive the score below 0.
 *   score = 100 * (1 - penalty / (penalty + K))
 */
export function calculateScoreAndGrade(failedFindings: Array<{ severity: string; weight?: number }>): ScoreResult {
  let penalty = 0;
  for (const f of failedFindings) {
    penalty += (SEVERITY_WEIGHT[f.severity] ?? 0) * (f.weight ?? 1);
  }

  const K = 14;
  const score = penalty === 0 ? 100 : Math.max(0, Math.min(100, Math.round(100 * (1 - penalty / (penalty + K)))));

  let grade = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 78) grade = 'A-';
  else if (score >= 68) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';

  return { score, grade };
}
