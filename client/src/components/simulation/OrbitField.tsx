'use client';

/**
 * Ambient orbiting motes filling the void.
 * Ported from dv2; ACCENT and FOREST_BRIGHT re-mapped to AEGIS dark tokens.
 * Base opacity lowered to ~0.4 for the dark background.
 */

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from 'three';
import { ACCENT, FOREST_BRIGHT, MOTE_COUNT, damp, type SimPhase } from './siegeShared';

export function OrbitField({
  phase,
  pulse,
  reducedMotion,
}: {
  phase: SimPhase;
  pulse: RefObject<number>;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<Points>(null);
  const opacityRef = useRef(0);

  const { geometry, angles, radii, heights, angularVel } = useMemo(() => {
    const positions = new Float32Array(MOTE_COUNT * 3);
    const colors = new Float32Array(MOTE_COUNT * 3);
    const ang = new Float32Array(MOTE_COUNT);
    const rad = new Float32Array(MOTE_COUNT);
    const hgt = new Float32Array(MOTE_COUNT);
    const vel = new Float32Array(MOTE_COUNT);

    const cAccent = new Color(ACCENT);        // --sev-medium #B59A3E
    const cForest = new Color(FOREST_BRIGHT); // --forest #3FB950

    for (let i = 0; i < MOTE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 3.5 + Math.random() * 3.5;
      const y = (Math.random() - 0.5) * 6;
      ang[i] = theta;
      rad[i] = r;
      hgt[i] = y;
      vel[i] = (0.04 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1);

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta);

      const c = Math.random() < 0.15 ? cAccent : cForest;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    return { geometry: geo, angles: ang, radii: rad, heights: hgt, angularVel: vel };
  }, []);

  const material = useMemo(
    () =>
      new PointsMaterial({
        size: 0.06,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
        sizeAttenuation: true,
        vertexColors: true,
      }),
    [],
  );

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const dt = Math.min(delta, 0.05);
    const mat = pts.material as PointsMaterial;

    // Lower target opacity (0.4 vs dv2's 0.55) for the dark AEGIS void
    opacityRef.current = damp(opacityRef.current, 0.4, 2, dt);
    mat.opacity = opacityRef.current;

    if (reducedMotion) return;

    const speedMul = phase === 'scanning' ? 1 + (pulse.current ?? 0) * 2.5 : 1;

    const pos = geometry.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < MOTE_COUNT; i++) {
      angles[i] += angularVel[i] * speedMul * dt;
      const r = radii[i];
      arr[i * 3] = r * Math.cos(angles[i]);
      arr[i * 3 + 1] = heights[i];
      arr[i * 3 + 2] = r * Math.sin(angles[i]);
    }
    pos.needsUpdate = true;
  });

  return <points ref={pointsRef} args={[geometry, material]} />;
}
