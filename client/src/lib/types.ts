export interface Scan {
  _id: string;
  target: string;
  targetType: 'url' | 'repo';
  status: 'pending' | 'scanning' | 'complete' | 'error';
  score: number;
  grade: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    passed: number;
  };
  createdAt: string;
  completedAt: string | null;
}

export interface Finding {
  _id: string;
  scanId: string;
  checkId: string;
  category: 'headers' | 'transport' | 'cookies' | 'cors' | 'disclosure' | 'clickjacking' | 'dependencies' | 'xss' | 'secrets' | 'code';
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  passed: boolean;
  evidence: string;
  description: string;
  fix: {
    text: string;
    code: string;
    lang: 'http' | 'javascript' | 'bash' | 'yaml' | 'python' | 'sql' | 'text';
  };
  weight: number;
}

export interface Stats {
  totalScans: number;
  totalFindings: number;
  mostCommonVuln: string;
  recent: Array<{
    targetMasked: string;
    grade: string;
    score: number;
    createdAt: string;
  }>;
}

export interface StreamEvent {
  checkId: string;
  title: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: Finding['category'];
  evidence: string;
}
