'use client';

import { useEffect, useRef } from 'react';

const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], [data-cursor], .cursor-pointer';

/**
 * Award-site style cursor: a precise dot + an eased ring that grows over
 * interactive elements. Desktop only; hidden for touch / reduced-motion.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const dot = dotRef.current!;
    const ring = ringRef.current!;
    document.body.classList.add('cursor-none');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let hovering = false;
    let visible = false;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
      const t = e.target as HTMLElement;
      hovering = !!(t && t.closest && t.closest(INTERACTIVE));
    };
    const onLeave = () => {
      visible = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      const scale = hovering ? 1.8 : 1;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
      ring.style.borderColor = hovering ? 'rgba(63,185,80,0.9)' : 'rgba(63,185,80,0.45)';
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.body.classList.remove('cursor-none');
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-8 w-8 rounded-full border opacity-0 transition-[border-color] duration-200"
        style={{ willChange: 'transform' }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-forest opacity-0"
        style={{ willChange: 'transform' }}
      />
    </>
  );
}
