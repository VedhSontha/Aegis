'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import ScrambleText from './ScrambleText';

/** One-time boot sequence on first load of the session, then reveals the app. */
export default function IntroLoader() {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Only play once per session
    try {
      if (sessionStorage.getItem('aegis:intro')) {
        setShow(false);
        return;
      }
    } catch {
      setShow(false);
      return;
    }

    const start = performance.now();
    const duration = 1900;
    let rafId = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        try { sessionStorage.setItem('aegis:intro', '1'); } catch {}
        setTimeout(() => setShow(false), 300);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-6 bg-bg select-none"
          initial={{ opacity: 1 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-forest bg-forest-deep">
              <Shield className="h-6 w-6 text-forest" />
            </div>
            <span className="font-mono text-xl font-bold tracking-[0.25em] text-text-primary">
              <ScrambleText text="AEGIS" />
            </span>
          </div>

          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-faint">
            Initializing secure module engine
          </span>

          <div className="mt-2 h-[3px] w-56 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-forest transition-[width] duration-75 ease-linear"
              style={{ width: `${Math.round(progress * 100)}%`, boxShadow: '0 0 10px rgba(63,185,80,0.7)' }}
            />
          </div>
          <span className="font-mono text-[10px] text-text-faint">{Math.round(progress * 100)}%</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
