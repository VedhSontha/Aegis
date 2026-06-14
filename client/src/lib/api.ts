import { Scan, Finding, Stats } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080/api';

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) {
    throw new Error('Failed to fetch statistics.');
  }
  return res.json();
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return {};
  return res.json().catch(() => ({}));
}

export async function triggerScan(target: string): Promise<{ scanId: string; target: string; type: 'url' | 'repo' }> {
  const res = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target })
  });

  if (!res.ok) {
    if (res.status >= 500 || res.status === 0) {
      throw new Error('AEGIS server is warming up — please wait a few seconds and try again.');
    }
    const errData = await safeJson(res);
    throw new Error((errData.error as string) || 'Failed to initialize scan.');
  }

  return res.json();
}

export async function getReport(scanId: string): Promise<{ scan: Scan; findings: Finding[] }> {
  const res = await fetch(`${API_BASE}/scan/${scanId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch scan report.');
  }
  return res.json();
}

export async function generateShield(scanId: string, framework: 'express' | 'next'): Promise<{ filename: string; content: string }> {
  const res = await fetch(`${API_BASE}/generate/shield`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanId, framework })
  });

  if (!res.ok) {
    throw new Error('Failed to generate security shield middleware.');
  }

  return res.json();
}

export async function generateCiCd(scanId: string, platform: 'github' | 'gitlab'): Promise<{ filename: string; content: string }> {
  const res = await fetch(`${API_BASE}/generate/cicd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanId, platform })
  });

  if (!res.ok) {
    throw new Error('Failed to generate CI/CD integration.');
  }

  return res.json();
}

export function getExportUrl(scanId: string): string {
  return `${API_BASE}/report/${scanId}/export.md`;
}

export function getBadgeMarkdown(scanId: string): string {
  const badgeUrl = `${API_BASE}/report/badge/${scanId}.svg`;
  const reportUrl = `${window.location.origin}/report/${scanId}`;
  return `[![AEGIS Security Rating](${badgeUrl})](${reportUrl})`;
}

export function getStreamUrl(scanId: string): string {
  return `${API_BASE}/scan/${scanId}/stream`;
}

export interface AiPriority {
  title: string;
  severity: string;
  attack: string;
  impact: string;
  action: string;
}

export interface AiAnalysis {
  headline: string;
  riskLevel: 'Critical' | 'High' | 'Moderate' | 'Low' | string;
  summary: string;
  priorities: AiPriority[];
}

export async function analyzeScan(scanId: string): Promise<AiAnalysis> {
  const res = await fetch(`${API_BASE}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI analysis failed.');
  }

  const data = await res.json();
  return data.analysis as AiAnalysis;
}

import type { SimulationResult } from './simulateTypes';

export async function simulateAttacks(target: string): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || 'Simulation failed.');
  }
  return res.json();
}
