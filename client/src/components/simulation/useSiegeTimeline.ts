'use client';

/**
 * Logical timeline driver for the orbital-siege scene.
 * Copied from dv2/dv/components/simulation/useSiegeTimeline.ts — pure logic, no colors.
 * SiegeScene's single master useFrame calls advance(now) once per frame.
 */

import { useMemo, useRef, type RefObject } from 'react';
import {
  BEAM_STAGGER_MS,
  BEAM_TRAVEL_MS,
  orbitSlot,
  type OrbitSlot,
  type SimAttack,
  type SimPhase,
} from './siegeShared';

export interface BeamLane {
  attack: SimAttack;
  slot: OrbitSlot;
  status: 'pending' | 'incoming' | 'resolved';
  startedAt: number | null;
  fired: boolean;
}

export interface SiegeTimeline {
  lanes: BeamLane[];
  resolvedCount: number;
  vulnerableCount: number;
  allResolved: boolean;
  pulseRef: RefObject<number>;
  advance: (now: number) => void;
}

export function useSiegeTimeline({
  attacks,
  phase,
  reducedMotion,
}: {
  attacks: SimAttack[];
  phase: SimPhase;
  reducedMotion: boolean;
}): SiegeTimeline {
  const lanes = useMemo<BeamLane[]>(
    () =>
      attacks.map((attack, i) => ({
        attack,
        slot: orbitSlot(i, attacks.length),
        status: 'pending',
        startedAt: null,
        fired: false,
      })),
    [attacks],
  );

  const pulseRef = useRef<number>(0);
  const counts = useRef({ resolved: 0, vulnerable: 0, allResolved: false });
  const t0Ref = useRef<number | null>(null);
  const lastPhaseRef = useRef<SimPhase | null>(null);

  const timeline = useRef<SiegeTimeline>({
    lanes,
    resolvedCount: 0,
    vulnerableCount: 0,
    allResolved: false,
    pulseRef,
    advance: () => {},
  });
  timeline.current.lanes = lanes;

  const advance = (now: number) => {
    const phaseChanged = lastPhaseRef.current !== phase;

    if (reducedMotion) {
      let vulnerable = 0;
      for (const lane of lanes) {
        lane.status = 'resolved';
        lane.startedAt = lane.startedAt ?? now;
        if (lane.attack.verdict === 'vulnerable') vulnerable++;
      }
      counts.current.resolved = lanes.length;
      counts.current.vulnerable = vulnerable;
      counts.current.allResolved = true;
      lastPhaseRef.current = phase;
      timeline.current.resolvedCount = lanes.length;
      timeline.current.vulnerableCount = vulnerable;
      timeline.current.allResolved = true;
      return;
    }

    if (phase === 'idle' || phase === 'scanning') {
      if (phaseChanged) {
        t0Ref.current = null;
        for (const lane of lanes) {
          lane.status = 'pending';
          lane.startedAt = null;
          lane.fired = false;
        }
      }
      pulseRef.current = phase === 'scanning' ? 0.5 + 0.5 * Math.sin(now * 0.004) : 0;
      counts.current.resolved = 0;
      counts.current.vulnerable = 0;
      counts.current.allResolved = false;
    } else {
      if (phaseChanged && phase === 'resolving') {
        t0Ref.current = now;
        for (const lane of lanes) {
          lane.status = 'pending';
          lane.startedAt = null;
          lane.fired = false;
        }
      }
      if (t0Ref.current === null) t0Ref.current = now;
      const t0 = t0Ref.current;

      const stagger =
        attacks.length > 0
          ? Math.min(BEAM_STAGGER_MS, 12000 / attacks.length)
          : BEAM_STAGGER_MS;

      let resolved = 0;
      let vulnerable = 0;
      lanes.forEach((lane, i) => {
        const fireAt = t0 + i * stagger;
        if (lane.status === 'pending' && now >= fireAt) {
          lane.status = 'incoming';
          lane.startedAt = fireAt;
        }
        if (lane.status === 'resolved') {
          resolved++;
          if (lane.attack.verdict === 'vulnerable') vulnerable++;
        }
      });

      counts.current.resolved = resolved;
      counts.current.vulnerable = vulnerable;
      counts.current.allResolved = lanes.length > 0 && resolved === lanes.length;
      pulseRef.current = 0;
    }

    lastPhaseRef.current = phase;
    timeline.current.resolvedCount = counts.current.resolved;
    timeline.current.vulnerableCount = counts.current.vulnerable;
    timeline.current.allResolved = counts.current.allResolved;
  };

  timeline.current.advance = advance;
  timeline.current.pulseRef = pulseRef;
  return timeline.current;
}
