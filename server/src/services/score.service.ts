import { Check } from '../checks';

export interface ScoreResult {
  score: number;
  grade: string;
}

export function calculateScoreAndGrade(failedChecks: Array<{ severity: string; weight: number }>): ScoreResult {
  let score = 100;

  for (const item of failedChecks) {
    let penalty = 0;
    switch (item.severity) {
      case 'critical':
        penalty = 25;
        break;
      case 'high':
        penalty = 15;
        break;
      case 'medium':
        penalty = 8;
        break;
      case 'low':
        penalty = 3;
        break;
      default:
        penalty = 0;
    }
    score -= penalty * (item.weight ?? 1.0);
  }

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade = 'F';
  if (score >= 97) {
    grade = 'A+';
  } else if (score >= 93) {
    grade = 'A';
  } else if (score >= 90) {
    grade = 'A-';
  } else if (score >= 80) {
    grade = 'B';
  } else if (score >= 70) {
    grade = 'C';
  } else if (score >= 55) {
    grade = 'D';
  } else {
    grade = 'F';
  }

  return { score, grade };
}
