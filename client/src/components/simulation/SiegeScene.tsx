'use client';

/**
 * The orbital-siege 3D scene — visual centerpiece of "Simulate Attacks".
 *
 * Re-skinned from dv2 to AEGIS dark theme:
 * - Lighting: cool/dark hemisphere ["#1a2420","#0A0E0D"], dir #cfe9d6 low intensity
 *   (vs dv2's warm/white mint)
 * - Colors: all via AEGIS-remapped siegeShared (dark void, forest glow)
 * - Single master useFrame — no setInterval, no extra rAF
 * - Canvas: alpha:true so the dark page bg bleeds through
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type RootState } from '@react-three/fiber';
import { Color, Group, Vector3 } from 'three';

import {
  FOREST_BRIGHT,
  RING_POOL,
  SEV,
  verdictColor,
  type SimAttack,
  type SimPhase,
  type Verdict,
} from './siegeShared';
import { useSiegeTimeline } from './useSiegeTimeline';
import { TargetSphere } from './TargetSphere';
import { ShieldLayer } from './ShieldLayer';
import { AttackBeam } from './AttackBeam';
import { ImpactBurst, type ImpactSlot } from './ImpactBurst';
import { OrbitField } from './OrbitField';
import type { BeamLane } from './useSiegeTimeline';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// AEGIS dark theme colors for glow transition
const VULN_COLOR = new Color(SEV.critical);      // #D5453B
const HEALTHY_COLOR = new Color(FOREST_BRIGHT);  // #3FB950

function SiegeWorld({
  attacks,
  phase,
  reducedMotion,
  onLanes,
}: {
  attacks: SimAttack[];
  phase: SimPhase;
  reducedMotion: boolean;
  onLanes: (lanes: BeamLane[]) => void;
}) {
  const { lanes, vulnerableCount, pulseRef, advance } = useSiegeTimeline({
    attacks,
    phase,
    reducedMotion,
  });

  useEffect(() => { onLanes(lanes); }, [lanes, onLanes]);

  const glow = useRef<Color>(new Color(FOREST_BRIGHT));
  const lastEvent = useRef<{ verdict: Verdict; at: number } | null>(null);
  const impactPool = useRef<ImpactSlot[]>(
    Array.from({ length: RING_POOL }, () => ({
      active: false,
      startedAt: 0,
      position: new Vector3(),
      color: new Color(),
    })),
  );
  const nextSlot = useRef(0);
  const orbitGroup = useRef<Group>(null);
  const glowTarget = useMemo(() => new Color(), []);
  const frameNow = useRef(0);

  const handleImpact = (_laneIndex: number, verdict: Verdict, worldPos: Vector3) => {
    const now = frameNow.current;
    lastEvent.current = { verdict, at: now };

    const pool = impactPool.current;
    let idx = -1;
    for (let i = 0; i < RING_POOL; i++) {
      const cand = (nextSlot.current + i) % RING_POOL;
      if (!pool[cand].active) { idx = cand; break; }
    }
    if (idx === -1) idx = nextSlot.current % RING_POOL;
    nextSlot.current = (idx + 1) % RING_POOL;

    const slot = pool[idx];
    slot.active = true;
    slot.startedAt = now;
    slot.position.copy(worldPos);
    slot.color.set(verdictColor(verdict));

    if (verdict === 'vulnerable') glow.current.lerp(VULN_COLOR, 0.25);
  };

  // SINGLE master useFrame
  useFrame((state: RootState, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = state.clock.elapsedTime * 1000;
    frameNow.current = now;

    advance(now);

    const grp = orbitGroup.current;
    if (grp && !reducedMotion) grp.rotation.y += dt * 0.12;

    const frac = attacks.length > 0 ? vulnerableCount / attacks.length : 0;
    glowTarget.copy(HEALTHY_COLOR).lerp(VULN_COLOR, frac);
    glow.current.lerp(glowTarget, 1 - Math.exp(-2 * dt));
  });

  return (
    <>
      {/* Cool dark lighting for the AEGIS void (vs dv2 warm/white mint) */}
      <hemisphereLight args={['#1a2420', '#0A0E0D', 0.8]} />
      <directionalLight position={[3, 5, 4]} intensity={0.6} color="#cfe9d6" />
      <ambientLight intensity={0.3} />

      <group ref={orbitGroup}>
        <TargetSphere glow={glow} phase={phase} pulse={pulseRef} reducedMotion={reducedMotion} />
        <ShieldLayer phase={phase} lastEvent={lastEvent} reducedMotion={reducedMotion} />
        <AttackBeam lanes={lanes} reducedMotion={reducedMotion} onImpact={handleImpact} />
        <ImpactBurst poolRef={impactPool} reducedMotion={reducedMotion} />
        <OrbitField phase={phase} pulse={pulseRef} reducedMotion={reducedMotion} />
      </group>
    </>
  );
}

export default function SiegeScene({
  attacks,
  phase,
  onLanes,
}: {
  attacks: SimAttack[];
  phase: SimPhase;
  onLanes?: (lanes: BeamLane[]) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const handleLanes = useMemo(() => onLanes ?? (() => {}), [onLanes]);

  return (
    <Canvas
      camera={{ position: [0, 1.5, 9], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <SiegeWorld
        attacks={attacks}
        phase={phase}
        reducedMotion={reducedMotion}
        onLanes={handleLanes}
      />
    </Canvas>
  );
}
