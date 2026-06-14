'use client';

import React from 'react';
import { Finding } from '../lib/types';

interface CategoryRingsProps {
  findings: Finding[];
  scanning: boolean;
}

// Friendly labels for every category the engine can emit (web + repo).
const LABELS: Record<string, string> = {
  headers: 'Headers',
  transport: 'Transport',
  cookies: 'Cookies',
  cors: 'CORS',
  clickjacking: 'Framing',
  disclosure: 'Disclosure',
  xss: 'XSS',
  dependencies: 'Deps',
  secrets: 'Secrets',
  code: 'Code'
};

// Stable display order; only categories actually present are rendered.
const ORDER = ['headers', 'transport', 'cookies', 'cors', 'clickjacking', 'disclosure', 'xss', 'dependencies', 'secrets', 'code'];

export default function CategoryRings({ findings, scanning }: CategoryRingsProps) {
  // Derive which categories to show from the findings present in this scan.
  const present = ORDER.filter((cat) => findings.some((f) => f.category === cat)).slice(0, 6);

  // Before any findings arrive, show a neutral placeholder set.
  const categories = present.length > 0 ? present : ['headers', 'transport', 'cors'];
  const cols = Math.min(Math.max(categories.length, 3), 6);

  const renderRing = (categoryKey: string) => {
    const catFindings = findings.filter((f) => f.category === categoryKey);
    const total = catFindings.length;
    const passed = catFindings.filter((f) => f.passed).length;
    const percent = total > 0 ? Math.round((passed / total) * 100) : 100;

    const radius = 16;
    const strokeWidth = 3.5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    let ringColor = 'stroke-sev-critical';
    if (percent === 100) ringColor = 'stroke-forest';
    else if (percent >= 70) ringColor = 'stroke-forest-soft';
    else if (percent >= 40) ringColor = 'stroke-sev-medium';

    return (
      <div key={categoryKey} className="flex flex-col items-center justify-center p-3 bg-bg border border-border-dim rounded-xl">
        <span className="text-[10px] font-mono text-text-faint uppercase mb-2 text-center leading-tight">
          {LABELS[categoryKey] || categoryKey}
        </span>

        <div className="relative w-12 h-12 flex items-center justify-center">
          {scanning ? (
            <div className="w-1.5 h-1.5 rounded-full bg-forest animate-ping" />
          ) : (
            <span className="text-[10px] font-mono text-text-primary font-bold">{percent}%</span>
          )}

          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle cx="24" cy="24" r={radius} strokeWidth={strokeWidth} className="stroke-surface fill-none" />
            {!scanning && (
              <circle
                cx="24"
                cy="24"
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`fill-none transition-all duration-500 ${ringColor}`}
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 bg-surface border border-border-dim rounded-2xl flex flex-col justify-between gap-4 h-full">
      <div className="flex items-center justify-between border-b border-border-dim/40 pb-2.5">
        <span className="text-text-dim text-[11px] font-semibold uppercase tracking-[0.2em]">Category Postures</span>
        <span className="w-1.5 h-1.5 rounded-full bg-forest/60" />
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {categories.map((c) => renderRing(c))}
      </div>
    </div>
  );
}
