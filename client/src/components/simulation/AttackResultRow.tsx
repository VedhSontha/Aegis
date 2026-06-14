'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AttackResult } from '@/lib/simulateTypes';
import { ATTACK_CLASS_LABELS } from '@/lib/simulateTypes';
import { VerdictBadge } from './VerdictBadge';
import { SeverityBadge } from './SeverityBadge';

export function AttackResultRow({
  attack,
  defaultOpen,
}: {
  attack: AttackResult;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="border border-border-dim/40 rounded-xl overflow-hidden transition-all">
      {/* Row header — always visible */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-2 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <VerdictBadge verdict={attack.verdict} />
        <span className="flex-1 min-w-0">
          <span className="block font-mono text-sm font-medium text-text-primary truncate">
            {attack.label}
          </span>
          <span className="block text-[11px] text-text-faint font-mono">
            {ATTACK_CLASS_LABELS[attack.attackClass] ?? attack.attackClass}
          </span>
        </span>
        {attack.verdict !== 'defended' && (
          <SeverityBadge severity={attack.severity} />
        )}
        <span className="text-text-faint ml-1 shrink-0">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 pt-2 bg-bg border-t border-border-dim/30 flex flex-col gap-2 text-xs font-mono">
          <p className="text-text-dim leading-relaxed">{attack.description}</p>

          {attack.payloadSummary && (
            <div>
              <span className="text-text-faint uppercase tracking-wider text-[10px]">Probe</span>
              <code className="block mt-1 text-forest-soft bg-surface px-2 py-1 rounded text-[11px]">
                {attack.payloadSummary}
              </code>
            </div>
          )}

          {attack.evidence && (
            <div>
              <span className="text-text-faint uppercase tracking-wider text-[10px]">Evidence</span>
              <p className="mt-0.5 text-sev-critical font-mono text-[11px] break-words"
                 style={{ color: attack.verdict === 'vulnerable' ? 'var(--sev-critical)' : attack.verdict === 'inconclusive' ? 'var(--sev-medium)' : 'var(--forest)' }}>
                {attack.evidence}
              </p>
            </div>
          )}

          {attack.recommendation && (
            <div>
              <span className="text-text-faint uppercase tracking-wider text-[10px]">Fix</span>
              <p className="mt-0.5 text-text-dim">{attack.recommendation}</p>
            </div>
          )}

          {attack.reference && (
            <a
              href={attack.reference}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest underline underline-offset-2 text-[11px] hover:text-forest-soft transition-colors"
            >
              {attack.reference}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
