'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

const CHARS = '!<>-_\\/[]{}=+*^?#@%abcdefghijklmnopqrstuvwxyz0123456789';

interface Cell {
  ch: string;
  done: boolean;
}

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** decode-in automatically when it mounts */
  scrambleOnMount?: boolean;
}

export default function ScrambleText({ text, className, scrambleOnMount = true }: ScrambleTextProps) {
  const [cells, setCells] = useState<Cell[]>(() => text.split('').map((ch) => ({ ch, done: true })));
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const endsRef = useRef<number[]>([]);

  const loop = useCallback(() => {
    const ends = endsRef.current;
    const f = frameRef.current;
    let done = 0;
    const next: Cell[] = [];
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === ' ' || f >= ends[i]) {
        next.push({ ch: c, done: true });
        done++;
      } else {
        next.push({ ch: CHARS[(Math.random() * CHARS.length) | 0], done: false });
      }
    }
    setCells(next);
    if (done === text.length) {
      rafRef.current = null;
      return;
    }
    frameRef.current = f + 1;
    rafRef.current = requestAnimationFrame(loop);
  }, [text]);

  const scramble = useCallback(() => {
    const ends: number[] = [];
    for (let i = 0; i < text.length; i++) {
      // staggered finish, resolving roughly left-to-right with some jitter
      ends[i] = text[i] === ' ' ? 0 : Math.round(i * 1.15 + 6 + Math.random() * 12);
    }
    endsRef.current = ends;
    frameRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    loop();
  }, [text, loop]);

  useEffect(() => {
    if (scrambleOnMount) scramble();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scramble, scrambleOnMount]);

  return (
    <span className={className} onMouseEnter={scramble} aria-label={text} role="text">
      {cells.map((c, i) => (
        <span key={i} className={c.done ? undefined : 'text-forest'} aria-hidden="true">
          {c.ch}
        </span>
      ))}
    </span>
  );
}
