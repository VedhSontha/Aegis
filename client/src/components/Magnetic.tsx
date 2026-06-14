'use client';

import React, { useRef } from 'react';

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

/** Wraps an element so it subtly pulls toward the cursor on hover. */
export default function Magnetic({ children, className, strength = 0.35 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const onLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0px, 0px)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)', display: 'inline-block' }}
    >
      {children}
    </div>
  );
}
