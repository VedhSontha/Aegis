'use client';

/**
 * Translucent shield wrapping the target sphere.
 * Ported from dv2; BASE_TINT and flash colors come from AEGIS-remapped siegeShared
 * (SHIELD_TINT = #3FB950 --forest). Anti-neon opacity cap retained.
 */

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  SphereGeometry,
} from 'three';
import {
  SHIELD_RADIUS,
  SHIELD_TINT,
  damp,
  verdictColor,
  type SimPhase,
  type Verdict,
} from './siegeShared';

const BASE_TINT = new Color(SHIELD_TINT); // --forest #3FB950
const BASE_OPACITY = 0.18;
const MAX_OPACITY = 0.28; // anti-neon cap

export function ShieldLayer({
  phase,
  lastEvent,
  reducedMotion,
}: {
  phase: SimPhase;
  lastEvent: RefObject<{ verdict: Verdict; at: number } | null>;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(() => new SphereGeometry(SHIELD_RADIUS, 64, 64), []);

  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: BASE_TINT.clone(),
        transmission: 0.9,
        thickness: 0.6,
        roughness: 0.15,
        transparent: true,
        opacity: BASE_OPACITY,
        metalness: 0,
        clearcoat: 0.6,
        side: DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  const flashRef = useRef(0);
  const flashColor = useRef(new Color(SHIELD_TINT));
  const handledAt = useRef(0);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05);
    const mat = mesh.material as MeshPhysicalMaterial;
    const t = state.clock.elapsedTime;

    const ev = lastEvent.current;
    if (ev && ev.at !== handledAt.current) {
      handledAt.current = ev.at;
      flashRef.current = 1;
      flashColor.current.set(verdictColor(ev.verdict));
    }

    flashRef.current = damp(flashRef.current, 0, 5, dt);
    const f = flashRef.current;

    const shimmer = reducedMotion ? 0 : Math.sin(t * 0.8) * 0.015;
    const arming =
      phase === 'scanning' && !reducedMotion
        ? (0.5 + 0.5 * Math.sin(t * 2.2)) * 0.05
        : 0;

    mat.color.copy(BASE_TINT).lerp(flashColor.current, f * 0.7);
    const opacity = BASE_OPACITY + shimmer + arming + f * 0.1;
    mat.opacity = Math.min(MAX_OPACITY, Math.max(0.08, opacity));

    if (!reducedMotion) mesh.rotation.y += dt * 0.05;
  });

  return <mesh ref={meshRef} args={[geometry, material]} />;
}
