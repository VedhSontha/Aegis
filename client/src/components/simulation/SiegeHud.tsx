'use client';

/**
 * DOM overlay listing each probe verdict.
 * Rebuilt from scratch with AEGIS instrument-panel chrome:
 * - .card-elevated .scanlines + hairline header rule
 * - Index label "01 ·" style, mono uppercase, live status dot
 * - Severity dots → --sev-* tokens
 * - Verdict pills → --sev-critical / --forest / --sev-medium
 * - WCAG-AA: text verdict, not color-only; role="region"
 * - soft-pulse animation for unresolved rows (added to globals.css)
 */

import { ATTACK_CLASS_LABELS, VERDICT_LABELS, type AttackClass } from '@/lib/simulateTypes';
import type { SimAttack, SimPhase, Verdict } from './siegeShared';
import type { BeamLane } from './useSiegeTimeline';

const SEV_VAR: Record<string, string> = {
  critical: 'var(--sev-critical)',
  high:     'var(--sev-high)',
  medium:   'var(--sev-medium)',
  low:      'var(--sev-low)',
  info:     'var(--text-faint)',
};

const VERDICT_VAR: Record<Verdict, string> = {
  vulnerable:   'var(--sev-critical)',
  defended:     'var(--forest)',
  inconclusive: 'var(--sev-medium)',
};

function classLabel(attackClass: string): string {
  return ATTACK_CLASS_LABELS[attackClass as AttackClass] ?? attackClass;
}

export function SiegeHud({
  attacks,
  lanes,
  phase,
}: {
  attacks: SimAttack[];
  lanes: BeamLane[];
  phase: SimPhase;
}) {
  const statusById = new Map<string, BeamLane['status']>();
  for (const lane of lanes) statusById.set(lane.attack.id, lane.status);

  const vulnCount = attacks.filter(a => a.verdict === 'vulnerable').length;
  const defendedCount = attacks.filter(a => a.verdict === 'defended').length;

  return (
    <div
      className="card-elevated scanlines w-full max-w-xs text-sm border border-border-dim rounded-2xl overflow-hidden"
      role="region"
      aria-label="Attack simulation results"
    >
      {/* Instrument-panel header */}
      <div className="border-b border-border-dim/40 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-faint">
            01 · PROBES
          </span>
          {/* Live status dot */}
          {phase !== 'complete' && phase !== 'idle' && (
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-forest"
              style={{ animation: 'soft-pulse 1.2s ease-in-out infinite' }}
            />
          )}
          {phase === 'complete' && vulnCount > 0 && (
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--sev-critical)' }}
            />
          )}
          {phase === 'complete' && vulnCount === 0 && (
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-forest" />
          )}
        </div>
        <span className="text-[10px] font-mono text-text-faint">
          {phase === 'complete'
            ? `${defendedCount}/${attacks.length} defended`
            : phase === 'resolving'
              ? 'Resolving probes…'
              : phase === 'scanning'
                ? 'Probing target…'
                : 'Attack suite'}
        </span>
      </div>

      {/* Probe list */}
      <ul className="flex flex-col divide-y divide-border-dim/20">
        {attacks.map((attack, idx) => {
          const status = statusById.get(attack.id) ?? 'pending';
          const resolved = status === 'resolved';
          const sevColor = SEV_VAR[attack.severity] ?? SEV_VAR.info;
          const verdictCss = VERDICT_VAR[attack.verdict];
          const pulsing = !resolved && (phase === 'resolving' || phase === 'scanning');

          return (
            <li
              key={attack.id}
              className="flex items-center gap-2.5 px-4 py-2.5 transition-opacity"
              style={{ opacity: pulsing ? 0.65 : 1 }}
            >
              {/* Index */}
              <span className="shrink-0 text-[10px] font-mono text-text-faint w-4 text-right">
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* Severity dot */}
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full motion-reduce:!animate-none"
                style={{
                  backgroundColor: sevColor,
                  animation: pulsing ? 'soft-pulse 1.2s ease-in-out infinite' : undefined,
                }}
              />

              {/* Label + class */}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs font-medium text-text-primary">
                  {attack.label}
                </span>
                <span className="block truncate text-[10px] text-text-faint">
                  {classLabel(attack.attackClass)}
                </span>
              </span>

              {/* Verdict pill (text, not color-only, for WCAG-AA) */}
              {resolved ? (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold"
                  style={{
                    color: verdictCss,
                    backgroundColor: `color-mix(in srgb, ${verdictCss} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${verdictCss} 30%, transparent)`,
                  }}
                >
                  {VERDICT_LABELS[attack.verdict]}
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-mono text-text-faint">
                  {phase === 'idle' ? 'queued' : '…'}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
