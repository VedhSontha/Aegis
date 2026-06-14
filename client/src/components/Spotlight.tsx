'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useSpring, useTransform, SpringOptions } from 'framer-motion';

/**
 * Mouse-follow radial glow, tinted with the AEGIS forest accent. Drop it as the
 * first child of any `position: relative` card and it tracks the cursor across
 * that card, fading in on hover. Recolored from the ibelick original to use our
 * --forest tokens instead of zinc.
 */

interface SpotlightProps {
  className?: string;
  size?: number;
  springOptions?: SpringOptions;
}

export default function Spotlight({
  className = '',
  size = 240,
  springOptions = { bounce: 0 },
}: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [parent, setParent] = useState<HTMLElement | null>(null);

  const mouseX = useSpring(0, springOptions);
  const mouseY = useSpring(0, springOptions);
  const left = useTransform(mouseX, (x) => `${x - size / 2}px`);
  const top = useTransform(mouseY, (y) => `${y - size / 2}px`);

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (el) {
      el.style.position = 'relative';
      el.style.overflow = 'hidden';
      setParent(el);
    }
  }, []);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!parent) return;
      const { left: l, top: t } = parent.getBoundingClientRect();
      mouseX.set(e.clientX - l);
      mouseY.set(e.clientY - t);
    },
    [mouseX, mouseY, parent]
  );

  useEffect(() => {
    if (!parent) return;
    const enter = () => setIsHovered(true);
    const leave = () => setIsHovered(false);
    parent.addEventListener('mousemove', onMove);
    parent.addEventListener('mouseenter', enter);
    parent.addEventListener('mouseleave', leave);
    return () => {
      parent.removeEventListener('mousemove', onMove);
      parent.removeEventListener('mouseenter', enter);
      parent.removeEventListener('mouseleave', leave);
    };
  }, [parent, onMove]);

  return (
    <motion.div
      ref={containerRef}
      aria-hidden
      className={`pointer-events-none absolute z-[2] rounded-full blur-2xl transition-opacity duration-300 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{
        width: size,
        height: size,
        left,
        top,
        background:
          'radial-gradient(circle at center, rgba(63,185,80,0.22), rgba(45,106,79,0.10) 45%, transparent 72%)',
      }}
    />
  );
}
