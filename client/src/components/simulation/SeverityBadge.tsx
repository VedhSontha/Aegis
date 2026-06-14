'use client';

import type { Severity } from '@/lib/simulateTypes';

const SEV_STYLES: Record<Severity, { color: string; label: string }> = {
  critical: { color: 'var(--sev-critical)', label: 'Critical' },
  high:     { color: 'var(--sev-high)',     label: 'High' },
  medium:   { color: 'var(--sev-medium)',   label: 'Medium' },
  low:      { color: 'var(--sev-low)',      label: 'Low' },
  info:     { color: 'var(--text-faint)',   label: 'Info' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEV_STYLES[severity] ?? SEV_STYLES.info;
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold"
      style={{
        color: s.color,
        backgroundColor: `color-mix(in srgb, ${s.color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${s.color} 25%, transparent)`,
      }}
    >
      {s.label}
    </span>
  );
}
