'use client';

/**
 * The glowing central sphere = the website under siege.
 * Re-mapped from dv2: core color #ffffff → #121817 (--surface dark core),
 * emissive stays FOREST_BRIGHT #3FB950. Dark core + forest glow reads correct on the void.
 */

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import { TARGET_RADIUS, FOREST_BRIGHT, type SimPhase } from './siegeShared';

// Dark core (--surface #121817) with forest emissive
const CORE_COLOR = '#121817';

export function TargetSphere({
  glow,
  phase,
  pulse,
  reducedMotion,
}: {
  glow: RefObject<Color>;
  phase: SimPhase;
  pulse: RefObject<number>;
  reducedMotion: boolean;
}) {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);

  const geometry = useMemo(() => new SphereGeometry(TARGET_RADIUS, 48, 48), []);
  const haloGeometry = useMemo(() => new SphereGeometry(TARGET_RADIUS * 1.08, 32, 32), []);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: CORE_COLOR,   // dark core — --surface
        roughness: 0.35,
        metalness: 0.1,
        emissive: new Color(FOREST_BRIGHT),
        emissiveIntensity: 0.3,
      }),
    [],
  );

  const haloMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FOREST_BRIGHT),
        transparent: true,
        opacity: 0.15,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame((state) => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo) return;

    const mat = core.material as MeshStandardMaterial;
    const haloMat = halo.material as MeshBasicMaterial;

    const g = glow.current;
    if (g) {
      mat.emissive.copy(g);
      haloMat.color.copy(g);
    }

    const p = phase === 'scanning' ? (pulse.current ?? 0) : 0;
    mat.emissiveIntensity = 0.25 + 0.35 * p;
    haloMat.opacity = 0.12 + 0.08 * p;

    if (!reducedMotion) {
      const t = state.clock.elapsedTime;
      const s = 1 + Math.sin(t * 1.4) * 0.02;
      core.scale.setScalar(s);
      halo.scale.setScalar(s);
    }
  });

  return (
    <group>
      <mesh ref={coreRef} args={[geometry, material]} />
      <mesh ref={haloRef} args={[haloGeometry, haloMaterial]} />
    </group>
  );
}
