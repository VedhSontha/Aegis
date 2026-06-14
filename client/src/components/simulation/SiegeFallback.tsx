'use client';

/**
 * Non-WebGL fallback for the orbital-siege scene.
 * Restyled with AEGIS classes: .card-elevated, mono text, text-text-faint.
 * Concentric target rings use AEGIS forest tokens.
 */

import { useMemo } from 'react';
import type { SimAttack, SimPhase } from './siegeShared';

export function SiegeFallback({
  attacks,
  phase,
}: {
  attacks: SimAttack[];
  phase: SimPhase;
}) {
  const counts = useMemo(() => {
    let defended = 0, vulnerable = 0, inconclusive = 0;
    for (const a of attacks) {
      if (a.verdict === 'defended') defended++;
      else if (a.verdict === 'vulnerable') vulnerable++;
      else inconclusive++;
    }
    return { defended, vulnerable, inconclusive };
  }, [attacks]);

  return (
    <div className="card-elevated scanlines relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-border-dim gap-6 p-8">
      <p className="text-xs font-mono text-text-faint uppercase tracking-[0.2em]">
        3D siege unavailable — results shown below
      </p>

      {/* Concentric AEGIS forest target rings */}
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 'min(60%, 200px)',
          aspectRatio: '1 / 1',
          border: '2px solid color-mix(in srgb, var(--forest) 55%, transparent)',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            inset: '16%',
            border: '1.5px solid color-mix(in srgb, var(--forest-soft) 45%, transparent)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            inset: '34%',
            border: '1.5px solid color-mix(in srgb, var(--forest) 50%, transparent)',
          }}
        />
        <div
          className="rounded-full"
          style={{
            width: '20%',
            aspectRatio: '1 / 1',
            backgroundColor: 'color-mix(in srgb, var(--forest) 70%, transparent)',
          }}
        />
      </div>

      {/* Phase status */}
      <div className="flex justify-center">
        {phase === 'scanning' && (
          <span className="flex items-center gap-2 text-xs font-mono text-text-faint">
            <span className="flex gap-1" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-forest" style={{ animation: 'soft-pulse 1.2s ease-in-out infinite' }} />
              <span className="h-2 w-2 rounded-full bg-forest" style={{ animation: 'soft-pulse 1.2s ease-in-out infinite 0.2s' }} />
              <span className="h-2 w-2 rounded-full bg-forest" style={{ animation: 'soft-pulse 1.2s ease-in-out infinite 0.4s' }} />
            </span>
            Probing target…
          </span>
        )}

        {phase === 'complete' && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono font-medium">
            <span
              className="rounded-full px-2.5 py-1"
              style={{
                color: 'var(--forest)',
                backgroundColor: 'color-mix(in srgb, var(--forest) 14%, transparent)',
                border: '1px solid color-mix(in srgb, var(--forest) 30%, transparent)',
              }}
            >
              {counts.defended} defended
            </span>
            <span
              className="rounded-full px-2.5 py-1"
              style={{
                color: 'var(--sev-critical)',
                backgroundColor: 'color-mix(in srgb, var(--sev-critical) 14%, transparent)',
                border: '1px solid color-mix(in srgb, var(--sev-critical) 30%, transparent)',
              }}
            >
              {counts.vulnerable} vulnerable
            </span>
            <span
              className="rounded-full px-2.5 py-1"
              style={{
                color: 'var(--sev-medium)',
                backgroundColor: 'color-mix(in srgb, var(--sev-medium) 14%, transparent)',
                border: '1px solid color-mix(in srgb, var(--sev-medium) 30%, transparent)',
              }}
            >
              {counts.inconclusive} inconclusive
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
