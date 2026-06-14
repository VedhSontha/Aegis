'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Ambient animated SVG lines, recolored to the AEGIS forest accent. Pure
 * decoration — sits behind content as a faint "signal flow" backdrop. We use
 * ONLY the path animation from the original Background Paths component; the
 * letter-by-letter headline reveal is intentionally dropped so it doesn't
 * fight the existing ScrambleText hero.
 */

function PathLayer({ position }: { position: number }) {
  const paths = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${
      189 + i * 6
    } -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${
      343 - i * 6
    }C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${
      875 - i * 6
    } ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <svg
      className="w-full h-full text-forest"
      viewBox="0 0 696 316"
      fill="none"
      aria-hidden
    >
      {paths.map((path) => (
        <motion.path
          key={path.id}
          d={path.d}
          stroke="currentColor"
          strokeWidth={path.width}
          strokeOpacity={0.04 + path.id * 0.015}
          initial={{ pathLength: 0.3, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: [0.2, 0.45, 0.2], pathOffset: [0, 1, 0] }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </svg>
  );
}

export default function FloatingPaths({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <PathLayer position={1} />
      <PathLayer position={-1} />
    </div>
  );
}
