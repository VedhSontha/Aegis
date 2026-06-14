'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, CheckCircle2, X } from 'lucide-react';

export interface GradeSnap {
  score: number;
  grade: string;
  failed: number;
}

interface RescanRevealProps {
  prev: GradeSnap;
  current: GradeSnap;
  onDismiss: () => void;
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-forest';
  if (grade.startsWith('B')) return 'text-forest-soft';
  if (grade.startsWith('C')) return 'text-sev-medium';
  if (grade.startsWith('D')) return 'text-sev-high';
  return 'text-sev-critical';
}

export default function RescanReveal({ prev, current, onDismiss }: RescanRevealProps) {
  const delta = current.score - prev.score;
  const improved = delta >= 0;
  const fixed = Math.max(0, prev.failed - current.failed);
  const [shown, setShown] = useState(0);

  // count up the point delta
  useEffect(() => {
    const target = Math.abs(delta);
    if (target === 0) { setShown(0); return; }
    let v = 0;
    const step = Math.max(1, Math.round(target / 28));
    const id = setInterval(() => {
      v += step;
      if (v >= target) { v = target; clearInterval(id); }
      setShown(v);
    }, 28);
    return () => clearInterval(id);
  }, [delta]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-[fadeIn_0.5s_ease-out] ${
        improved ? 'border-forest/50' : 'border-sev-critical/50'
      }`}
      style={{
        background: improved
          ? 'linear-gradient(100deg, rgba(63,185,80,0.14), rgba(18,24,23,0.6) 60%)'
          : 'linear-gradient(100deg, rgba(213,69,59,0.14), rgba(18,24,23,0.6) 60%)'
      }}
    >
      {/* glow accent */}
      <div
        className="absolute -top-16 -left-10 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: improved ? 'rgba(63,185,80,0.18)' : 'rgba(213,69,59,0.18)' }}
      />

      <div className="relative flex items-center gap-5">
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl border ${improved ? 'border-forest/40 bg-forest/10' : 'border-sev-critical/40 bg-sev-critical/10'}`}>
          {improved ? <TrendingUp className="w-5 h-5 text-forest" /> : <TrendingDown className="w-5 h-5 text-sev-critical" />}
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint block">
            {improved ? 'Re-scan complete — posture improved' : 'Re-scan complete — posture regressed'}
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`text-2xl font-extrabold ${gradeColor(prev.grade)} opacity-50 line-through decoration-2`}>{prev.grade}</span>
            <ArrowRight className="w-4 h-4 text-text-faint" />
            <span className={`text-3xl font-extrabold ${gradeColor(current.grade)}`} style={{ filter: 'drop-shadow(0 0 10px currentColor)' }}>
              {current.grade}
            </span>
            <span className="text-xs font-mono text-text-faint ml-1">{prev.score} → {current.score}/100</span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-6">
        <div className="text-center">
          <span className={`block text-3xl font-extrabold font-mono ${improved ? 'text-forest' : 'text-sev-critical'}`}>
            {improved ? '+' : '-'}{shown}
          </span>
          <span className="text-[10px] font-mono uppercase text-text-faint">points</span>
        </div>
        {fixed > 0 && (
          <div className="text-center flex flex-col items-center">
            <span className="flex items-center gap-1 text-3xl font-extrabold font-mono text-forest">
              <CheckCircle2 className="w-5 h-5" />{fixed}
            </span>
            <span className="text-[10px] font-mono uppercase text-text-faint">issues fixed</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-3 right-3 text-text-faint hover:text-text-dim transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
