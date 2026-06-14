'use client';

/**
 * Expanding shock-rings at beam impact points.
 * Copied from dv2 unchanged — colors come from the slot.color set by SiegeScene's handleImpact.
 */

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
} from 'three';
import { IMPACT_MS, RING_POOL } from './siegeShared';

export interface ImpactSlot {
  active: boolean;
  startedAt: number;
  position: Vector3;
  color: Color;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function ImpactBurst({
  poolRef,
  reducedMotion,
}: {
  poolRef: RefObject<ImpactSlot[]>;
  reducedMotion: boolean;
}) {
  const geometry = useMemo(() => new RingGeometry(0.6, 0.7, 32), []);

  const materials = useMemo(
    () =>
      Array.from(
        { length: RING_POOL },
        () =>
          new MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            blending: AdditiveBlending,
            side: DoubleSide,
            depthWrite: false,
          }),
      ),
    [],
  );

  const meshRefs = useRef<(Mesh | null)[]>(Array(RING_POOL).fill(null));

  useFrame((state) => {
    const pool = poolRef.current;
    if (!pool) return;
    const now = state.clock.elapsedTime * 1000;
    const cam = state.camera;

    for (let i = 0; i < RING_POOL; i++) {
      const mesh = meshRefs.current[i];
      const slot = pool[i];
      if (!mesh || !slot) continue;
      const mat = mesh.material as MeshBasicMaterial;

      if (!slot.active) {
        mat.opacity = 0;
        mesh.scale.setScalar(0.0001);
        continue;
      }

      mesh.position.copy(slot.position);
      mat.color.copy(slot.color);
      mesh.quaternion.copy(cam.quaternion);

      if (reducedMotion) {
        mesh.scale.setScalar(1.6);
        mat.opacity = 0.4;
        continue;
      }

      const t = (now - slot.startedAt) / IMPACT_MS;
      if (t >= 1) {
        slot.active = false;
        mat.opacity = 0;
        mesh.scale.setScalar(0.0001);
        continue;
      }
      const e = easeOut(t);
      mesh.scale.setScalar(0.2 + e * 2.2);
      mat.opacity = (1 - t) * 0.85;
    }
  });

  return (
    <group>
      {materials.map((mat, i) => (
        <mesh
          key={i}
          ref={(m) => { meshRefs.current[i] = m; }}
          args={[geometry, mat]}
        />
      ))}
    </group>
  );
}
