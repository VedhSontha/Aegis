'use client';

import React, { useState } from 'react';
import { analyzeScan, AiAnalysis } from '../lib/api';
import { Sparkles, Loader, ShieldAlert, Swords, Crosshair, Wrench, AlertTriangle } from 'lucide-react';

interface AiBriefingProps {
  scanId: string;
  disabled?: boolean;
}

function riskColor(level: string): string {
  switch (level) {
    case 'Critical': return 'text-sev-critical border-sev-critical/40 bg-sev-critical/10';
    case 'High': return 'text-sev-high border-sev-high/40 bg-sev-high/10';
    case 'Moderate': return 'text-sev-medium border-sev-medium/40 bg-sev-medium/10';
    default: return 'text-forest border-forest/40 bg-forest/10';
  }
}

function sevDot(sev: string): string {
  const s = sev.toLowerCase();
  if (s.includes('crit')) return 'bg-sev-critical';
  if (s.includes('high')) return 'bg-sev-high';
  if (s.includes('med')) return 'bg-sev-medium';
  return 'bg-sev-low';
}

export default function AiBriefing({ scanId, disabled }: AiBriefingProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeScan(scanId);
      setAnalysis(result);
    } catch (e: any) {
      setError(e.message || 'AI analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-elevated brackets border border-border-dim rounded-2xl p-5 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-forest/10 border border-forest/30 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-forest" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary leading-tight">AI Security Analyst</h3>
            <span className="text-[10px] font-mono text-text-faint uppercase tracking-wider">
              Claude-powered threat briefing
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={loading || disabled}
          className="px-3.5 py-2 bg-forest hover:bg-forest-soft disabled:bg-surface-2 disabled:text-text-faint text-bg font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
        >
          {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Generate Briefing'}
        </button>
      </div>

      {/* Idle hint */}
      {!analysis && !loading && !error && (
        <p className="text-xs text-text-faint leading-relaxed">
          Generate an executive threat briefing: Claude reviews every finding from this scan and returns a
          prioritized, plain-English breakdown of how an attacker would exploit each gap, the business impact,
          and what to fix first.
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          <div className="h-4 w-2/3 rounded animate-shimmer" />
          <div className="h-3 w-full rounded animate-shimmer" />
          <div className="h-3 w-5/6 rounded animate-shimmer" />
          <div className="h-16 w-full rounded-xl animate-shimmer mt-1" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-3 bg-bg border border-sev-critical/40 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-sev-critical shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-sev-critical font-semibold">AI analysis unavailable</p>
            <p className="text-[11px] text-text-dim mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {analysis && !loading && (
        <div className="flex flex-col gap-4 animate-[fadeIn_0.4s_ease-out]">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded border ${riskColor(analysis.riskLevel)}`}>
              {analysis.riskLevel} risk
            </span>
            <p className="text-sm font-semibold text-text-primary flex-1 min-w-[200px]">{analysis.headline}</p>
          </div>

          <p className="text-xs text-text-dim leading-relaxed border-l-2 border-forest/40 pl-3">
            {analysis.summary}
          </p>

          {analysis.priorities.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Remediation priorities
              </span>
              {analysis.priorities.map((p, i) => (
                <div key={i} className="p-3.5 bg-bg border border-border-dim rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-text-faint">#{i + 1}</span>
                    <span className={`w-2 h-2 rounded-full ${sevDot(p.severity)}`} />
                    <span className="text-xs font-semibold text-text-primary">{p.title}</span>
                  </div>
                  <div className="grid gap-2 text-[11px] leading-relaxed pl-1">
                    <div className="flex gap-2">
                      <Swords className="w-3.5 h-3.5 text-sev-high shrink-0 mt-0.5" />
                      <span className="text-text-dim"><span className="text-text-faint">Attack — </span>{p.attack}</span>
                    </div>
                    <div className="flex gap-2">
                      <Crosshair className="w-3.5 h-3.5 text-sev-critical shrink-0 mt-0.5" />
                      <span className="text-text-dim"><span className="text-text-faint">Impact — </span>{p.impact}</span>
                    </div>
                    <div className="flex gap-2">
                      <Wrench className="w-3.5 h-3.5 text-forest shrink-0 mt-0.5" />
                      <span className="text-text-dim"><span className="text-text-faint">Fix — </span>{p.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <span className="text-[9px] text-text-faint font-mono">
            Generated by Claude from this scan&apos;s real findings.
          </span>
        </div>
      )}
    </div>
  );
}
