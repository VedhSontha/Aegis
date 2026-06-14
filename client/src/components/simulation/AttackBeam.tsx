'use client';

/**
 * All attack beams in ONE pooled InstancedMesh.
 * Copied from dv2/dv/components/simulation/AttackBeam.tsx — colors already come
 * from siegeShared.beamColor() which has been re-mapped to AEGIS dark palette.
 */

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  CylinderGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import {
  BEAM_TRAVEL_MS,
  ORBIT_RADIUS,
  SHIELD_RADIUS,
  TARGET_RADIUS,
  beamColor,
  slotToPosition,
  type Verdict,
} from './siegeShared';
import type { BeamLane } from './useSiegeTimeline';

const UP = new Vector3(0, 1, 0);

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function AttackBeam({
  lanes,
  reducedMotion,
  onImpact,
}: {
  lanes: BeamLane[];
  reducedMotion: boolean;
  onImpact: (laneIndex: number, verdict: Verdict, worldPos: Vector3) => void;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const count = lanes.length;

  const dummy = useMemo(() => new Object3D(), []);
  const quat = useMemo(() => new Quaternion(), []);
  const origin = useMemo(() => new Vector3(), []);
  const stop = useMemo(() => new Vector3(), []);
  const dir = useMemo(() => new Vector3(), []);
  const head = useMemo(() => new Vector3(), []);
  const mid = useMemo(() => new Vector3(), []);

  const geometry = useMemo(() => new CylinderGeometry(0.04, 0.12, 1, 6), []);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const c = new Color();
    for (let i = 0; i < count; i++) {
      c.set(beamColor(lanes[i].attack));
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    dummy.scale.setScalar(0.0001);
    dummy.position.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }, [lanes, count, dummy]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const now = state.clock.elapsedTime * 1000;

    let dirty = false;
    for (let i = 0; i < count; i++) {
      const lane = lanes[i];
      const verdict = lane.attack.verdict;
      const stopRadius = verdict === 'vulnerable' ? TARGET_RADIUS : SHIELD_RADIUS;

      if (lane.status !== 'incoming') {
        if (reducedMotion && lane.status === 'resolved' && !lane.fired) {
          slotToPosition(lane.slot, ORBIT_RADIUS, origin);
          dir.copy(origin).normalize().multiplyScalar(-1);
          stop.copy(dir).multiplyScalar(stopRadius);
          lane.fired = true;
          onImpact(i, verdict, stop.clone());
        }
        dummy.scale.setScalar(0.0001);
        dummy.position.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        dirty = true;
        continue;
      }

      const startedAt = lane.startedAt ?? now;
      const progress = clamp01((now - startedAt) / BEAM_TRAVEL_MS);

      slotToPosition(lane.slot, ORBIT_RADIUS, origin);
      dir.copy(origin).normalize().multiplyScalar(-1);
      stop.copy(origin).normalize().multiplyScalar(stopRadius);

      if (progress >= 1) {
        if (!lane.fired) {
          lane.fired = true;
          lane.status = 'resolved';
          onImpact(i, verdict, stop.clone());
        }
        dummy.scale.setScalar(0.0001);
        dummy.position.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        dirty = true;
        continue;
      }

      head.lerpVectors(origin, stop, progress);
      const travelled = origin.distanceTo(head);
      const streak = Math.min(travelled, 1.8);
      mid.copy(head).addScaledVector(dir, -streak * 0.5);

      quat.setFromUnitVectors(UP, dir);
      dummy.position.copy(mid);
      dummy.quaternion.copy(quat);
      dummy.scale.set(1, Math.max(0.0001, streak), 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      dirty = true;
    }

    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />;
}
