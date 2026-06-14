/**
 * Shared palette, types, helpers, and geometry constants for the AEGIS orbital-siege scene.
 * Re-mapped from dv2/dv/components/simulation/siegeShared.ts to AEGIS dark tokens.
 *
 * WebGL can't read CSS vars, so the palette below mirrors the @theme tokens in
 * globals.css as literal hexes — keep them in sync with that file and with
 * VERDICT_HEX in lib/simulateTypes.ts.
 *
 * §1 Color Re-map (dv2 light/mint → AEGIS dark/forest):
 *   FOREST      #15803d → #2D6A4F  (--forest-soft)
 *   FOREST_BRIGHT #22c55e → #3FB950 (--forest)
 *   ACCENT      #d97706 → #B59A3E  (--sev-medium)
 *   BG_GLOW     #f0fdf4 → #0A0E0D  (--bg)
 *   SHIELD_TINT #22c55e → #3FB950  (--forest)
 *   SEV.critical #dc2626 → #D5453B (--sev-critical)
 *   SEV.high    #ea580c → #C6803C  (--sev-high)
 *   SEV.medium  #ca8a04 → #B59A3E  (--sev-medium)
 *   SEV.low     #16a34a → #5E7C9E  (--sev-low)
 *   SEV.info    #64748b → #5A6863  (--text-faint)
 *   TargetSphere core #ffffff → #121817 (--surface)
 */

import { Vector3 } from 'three';
import type { Severity, Verdict } from '@/lib/simulateTypes';

export type { Verdict };

/** Scene lifecycle. */
export type SimPhase = 'idle' | 'scanning' | 'resolving' | 'complete';

/** Minimal attack shape the scene consumes (subset of AttackResult). */
export interface SimAttack {
  id: string;
  label: string;
  attackClass: string;
  verdict: Verdict;
  severity: Severity;
}

// --- AEGIS dark palette (§1 re-map from dv2) ---
export const FOREST = '#2D6A4F';          // --forest-soft
export const FOREST_DIM = '#1B4332';      // --forest-deep
export const FOREST_BRIGHT = '#3FB950';   // --forest (THE bright accent)
export const ACCENT = '#B59A3E';          // --sev-medium
export const BG_GLOW = '#0A0E0D';         // --bg
export const SHIELD_TINT = '#3FB950';     // --forest

export const SEV: Record<Severity, string> = {
  critical: '#D5453B',  // --sev-critical
  high:     '#C6803C',  // --sev-high
  medium:   '#B59A3E',  // --sev-medium
  low:      '#5E7C9E',  // --sev-low
  info:     '#5A6863',  // --text-faint
};

/** Verdict → hex. Mirrors VERDICT_HEX in lib/simulateTypes.ts. */
export function verdictColor(v: Verdict): string {
  if (v === 'defended') return FOREST_BRIGHT;
  if (v === 'inconclusive') return ACCENT;
  return SEV.critical; // vulnerable
}

export function severityColor(s: Severity): string {
  return SEV[s] ?? SEV.info;
}

/**
 * Beam tint: vulnerable beams pierce in severity color (deep red / orange-red),
 * defended ricochet green, inconclusive glance amber.
 */
export function beamColor(a: SimAttack): string {
  return a.verdict === 'vulnerable' ? severityColor(a.severity) : verdictColor(a.verdict);
}

// --- Geometry / timing constants (kept identical to dv2 — theme-agnostic) ---
export const ORBIT_RADIUS = 6;
export const TARGET_RADIUS = 1.4;
export const SHIELD_RADIUS = 2.0;
export const BEAM_STAGGER_MS = 700;
export const BEAM_TRAVEL_MS = 900;
export const IMPACT_MS = 850;
export const MOTE_COUNT = 80;
export const RING_POOL = 6;

/** Frame-rate-independent lerp factor. */
export function damp(current: number, target: number, k: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-k * dt));
}

export interface OrbitSlot {
  theta: number; // azimuth
  phi: number;   // polar
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Fibonacci spiral distribution so beam origins never overlap. */
export function orbitSlot(index: number, total: number): OrbitSlot {
  const n = Math.max(1, total);
  const y = n === 1 ? 0 : (1 - (index / (n - 1)) * 2) * 0.9;
  const phi = Math.acos(Math.min(1, Math.max(-1, y)));
  const theta = GOLDEN_ANGLE * index;
  return { theta, phi };
}

/** Convert an OrbitSlot into a world position. */
export function slotToPosition(slot: OrbitSlot, radius: number, out: Vector3): Vector3 {
  const sinPhi = Math.sin(slot.phi);
  return out.set(
    radius * sinPhi * Math.cos(slot.theta),
    radius * Math.cos(slot.phi),
    radius * sinPhi * Math.sin(slot.theta),
  );
}
