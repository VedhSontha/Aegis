'use client';

import type { Verdict, Severity } from '@/lib/simulateTypes';

const VERDICT_STYLES: Record<Verdict, { color: string; bg: string; border: string }> = {
  vulnerable:   { color: 'var(--sev-critical)', bg: 'color-mix(in srgb, var(--sev-critical) 14%, transparent)', border: 'color-mix(in srgb, var(--sev-critical) 30%, transparent)' },
  defended:     { color: 'var(--forest)',        bg: 'color-mix(in srgb, var(--forest) 14%, transparent)',        border: 'color-mix(in srgb, var(--forest) 30%, transparent)' },
  inconclusive: { color: 'var(--sev-medium)',    bg: 'color-mix(in srgb, var(--sev-medium) 14%, transparent)',    border: 'color-mix(in srgb, var(--sev-medium) 30%, transparent)' },
};

const VERDICT_LABELS: Record<Verdict, string> = {
  vulnerable: 'Vulnerable', defended: 'Defended', inconclusive: 'Inconclusive',
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLES[verdict];
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold"
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  );
}
