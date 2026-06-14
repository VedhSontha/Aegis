'use client';

/**
 * /simulate — AEGIS Attack Simulation page.
 *
 * Phase machine: idle → scanning (POST in flight, charging sphere) →
 *   resolving (beams fire on timeline) → complete (settled).
 *
 * SiegeScene is dynamically imported (R3F client-only), wrapped in SiegeErrorBoundary.
 * HUD is absolute-positioned over canvas; result list below.
 * Safety disclaimer from warnings[0] shown prominently under header.
 *
 * NOTE: SimulatePage uses useSearchParams(), which Next.js App Router requires
 * to be wrapped in a Suspense boundary. The default export wraps it.
 */

import { useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Shield, Swords, Search } from 'lucide-react';


import { simulateAttacks as runSimulation } from '@/lib/api';
import type { SimulationResult } from '@/lib/simulateTypes';
import type { SimAttack, SimPhase } from '@/components/simulation/siegeShared';
import { SiegeErrorBoundary } from '@/components/simulation/SiegeErrorBoundary';
import { SiegeFallback } from '@/components/simulation/SiegeFallback';
import { SiegeHud } from '@/components/simulation/SiegeHud';
import { AttackResultRow } from '@/components/simulation/AttackResultRow';
import type { BeamLane } from '@/components/simulation/useSiegeTimeline';

// Dynamic import — R3F is client-only and runs a requestAnimationFrame loop
const SiegeScene = dynamic(
  () => import('@/components/simulation/SiegeScene'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full">
        <span className="text-xs font-mono text-text-faint animate-pulse">
          Loading 3D siege scene…
        </span>
      </div>
    ),
  },
);

function AegisSpinner() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="w-8 h-8 rounded-full border-2 border-border-dim border-t-forest animate-spin" />
    </div>
  );
}

function SimulatePage() {
  const searchParams = useSearchParams();

  const initialTarget = searchParams.get('target') ?? '';

  const [target, setTarget] = useState(initialTarget);
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The live lanes from the canvas, fed to the HUD
  const [lanes, setLanes] = useState<BeamLane[]>([]);
  const onLanes = useCallback((l: BeamLane[]) => setLanes(l), []);

  // Derive SimAttack[] (subset of AttackResult)
  const attacks: SimAttack[] = (result?.attacks ?? []).map(a => ({
    id: a.id,
    label: a.label,
    attackClass: a.attackClass,
    verdict: a.verdict,
    severity: a.severity,
  }));

  const handleSimulate = async () => {
    if (!target.trim() || phase === 'scanning' || phase === 'resolving') return;

    setError(null);
    setResult(null);
    setPhase('scanning');

    try {
      const res = await runSimulation(target.trim());
      setResult(res);
      setPhase('resolving');
      // Transition to complete after beams finish (~BEAM_STAGGER_MS * attacks + BEAM_TRAVEL_MS)
      const duration = Math.min(12000, res.attacks.length * 700) + 1200;
      setTimeout(() => setPhase('complete'), duration);
    } catch (err: any) {
      setError(err?.message ?? 'Simulation failed.');
      setPhase('idle');
    }
  };

  const busy = phase === 'scanning' || phase === 'resolving';
  const disclaimer = result?.warnings[0] ?? '';

  return (
    <main className="min-h-screen text-text-primary px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col gap-6">

      {/* ── Header ── */}
      <section className="flex flex-col md:flex-row md:items-start justify-between border-b border-border-dim/30 pb-5 gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="p-2 bg-surface hover:bg-surface-2 border border-border-dim rounded-lg text-text-dim hover:text-text-primary transition-all mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 select-none">
              <Swords className="w-4 h-4 text-forest" />
              <span className="font-mono text-xs uppercase text-text-faint tracking-[0.15em]">
                AEGIS · Attack Simulation
              </span>
            </div>
            <h1 className="text-sm font-mono font-bold text-text-primary mt-0.5 truncate max-w-[340px] md:max-w-[480px]">
              {target || 'No target selected'}
            </h1>
            {disclaimer && (
              <p className="text-[11px] text-text-faint font-mono mt-1 max-w-xl leading-relaxed">
                ⚠ {disclaimer}
              </p>
            )}
          </div>
        </div>

        {/* Score pill when complete */}
        {result && phase === 'complete' && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="card-elevated px-4 py-2 border border-border-dim rounded-xl text-center">
              <div className="text-xs font-mono text-text-faint uppercase tracking-widest">Sim Score</div>
              <div
                className="text-2xl font-mono font-bold mt-0.5"
                style={{ color: result.score >= 68 ? 'var(--forest)' : result.score >= 40 ? 'var(--sev-medium)' : 'var(--sev-critical)' }}
              >
                {result.grade}
              </div>
              <div className="text-xs font-mono text-text-faint">{result.score}/100</div>
            </div>
          </div>
        )}
      </section>

      {/* ── Input bar (shown when idle or after complete) ── */}
      {(phase === 'idle' || phase === 'complete') && (
        <section className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint pointer-events-none" />
            <input
              type="url"
              value={target}
              onChange={e => setTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSimulate()}
              placeholder="https://example.com (live URL, not repo)"
              className="w-full bg-surface border border-border-dim text-text-primary placeholder-text-faint font-mono text-sm px-4 py-2.5 pl-9 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest/40 transition-all"
              id="simulate-target-input"
            />
          </div>
          <button
            type="button"
            onClick={handleSimulate}
            disabled={!target.trim() || busy}
            className="px-4 py-2.5 bg-forest/10 hover:bg-forest/20 border border-forest/30 hover:border-forest/50 text-forest font-mono text-xs rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            id="simulate-launch-btn"
          >
            <Swords className="w-3.5 h-3.5" />
            {phase === 'complete' ? 'Re-simulate' : 'Launch Siege'}
          </button>
        </section>
      )}

      {error && (
        <div className="border border-sev-critical/30 bg-sev-critical/5 rounded-xl px-4 py-3 font-mono text-xs text-sev-critical" style={{ color: 'var(--sev-critical)' }}>
          {error}
        </div>
      )}

      {/* ── 3D Siege Canvas + HUD ── */}
      {phase !== 'idle' && (
        <section className="relative w-full h-[60vh] rounded-2xl overflow-hidden border border-border-dim scanlines brackets">
          <SiegeErrorBoundary fallback={<SiegeFallback attacks={attacks} phase={phase} />}>
            <Suspense fallback={<AegisSpinner />}>
              <SiegeScene attacks={attacks} phase={phase} onLanes={onLanes} />
            </Suspense>
          </SiegeErrorBoundary>

          {/* HUD overlay — top-right on desktop, full-width on mobile */}
          {attacks.length > 0 && (
            <div className="absolute top-3 right-3 z-10 w-64 hidden md:block">
              <SiegeHud attacks={attacks} lanes={lanes} phase={phase} />
            </div>
          )}

          {/* Phase label overlay — bottom-left */}
          <div className="absolute bottom-3 left-3 z-10">
            <span
              className="text-[10px] font-mono uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border"
              style={{
                color: phase === 'complete'
                  ? 'var(--forest)'
                  : phase === 'resolving'
                    ? 'var(--sev-medium)'
                    : 'var(--text-faint)',
                borderColor: `color-mix(in srgb, ${
                  phase === 'complete' ? 'var(--forest)' : phase === 'resolving' ? 'var(--sev-medium)' : 'var(--border)'
                } 40%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${
                  phase === 'complete' ? 'var(--forest)' : phase === 'resolving' ? 'var(--sev-medium)' : 'var(--surface)'
                } 12%, transparent)`,
              }}
            >
              {phase === 'complete' ? '● Complete' : phase === 'resolving' ? '● Resolving' : '● Scanning'}
            </span>
          </div>
        </section>
      )}

      {/* Mobile HUD (below canvas) */}
      {attacks.length > 0 && phase !== 'idle' && (
        <section className="md:hidden">
          <SiegeHud attacks={attacks} lanes={lanes} phase={phase} />
        </section>
      )}

      {/* ── Results list ── */}
      {result && (result.attacks.length > 0) && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-border-dim/30 pb-3">
            <Shield className="w-3.5 h-3.5 text-forest" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-text-faint">
              02 · Probe Results
            </span>
            <span className="ml-auto font-mono text-[10px] text-text-faint">
              {result.meta.probesRun ?? result.attacks.length} probes · {result.meta.requestsUsed ?? '?'} requests
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {result.attacks
              .slice()
              .sort((a, b) => {
                const order = { vulnerable: 0, inconclusive: 1, defended: 2 };
                return (order[a.verdict] ?? 3) - (order[b.verdict] ?? 3);
              })
              .map(attack => (
                <AttackResultRow
                  key={attack.id}
                  attack={attack}
                  defaultOpen={attack.verdict === 'vulnerable'}
                />
              ))}
          </div>
        </section>
      )}

      {/* Scanning placeholder */}
      {phase === 'scanning' && !result && (
        <section className="card-elevated border border-border-dim/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-forest/20 border-t-forest animate-spin" />
          <div>
            <p className="font-mono text-sm text-text-primary">Running 8 susceptibility probes…</p>
            <p className="font-mono text-xs text-text-faint mt-1">
              Safe, non-destructive analysis only. Results appear in seconds.
            </p>
          </div>
        </section>
      )}

    </main>
  );
}

/** Exported default — wraps SimulatePage in a Suspense boundary for useSearchParams. */
export default function SimulatePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-border-dim border-t-forest animate-spin" />
      </div>
    }>
      <SimulatePage />
    </Suspense>
  );
}
