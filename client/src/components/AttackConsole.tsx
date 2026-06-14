'use client';

import React, { useEffect, useRef } from 'react';

export interface ConsoleLine {
  text: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'system';
}

interface AttackConsoleProps {
  lines: ConsoleLine[];
  scanning: boolean;
}

export default function AttackConsole({ lines, scanning }: AttackConsoleProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on logs update
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div data-lenis-prevent className="relative scanlines w-full h-[420px] bg-bg border border-border-dim rounded-2xl p-5 font-mono text-xs overflow-y-auto flex flex-col justify-between scrollbar select-text">
      <div className="relative z-[2] flex flex-col gap-2">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-border-dim/30 pb-3 mb-3 text-text-faint text-[10px] select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sev-critical"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-sev-high"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-forest-soft"></span>
            <span className="ml-2">AEGIS ATTACK SHIELD CORE v1.0.0</span>
          </div>
          <span>LOGSTREAM: ACTIVE</span>
        </div>

        {/* Console Streams */}
        <div className="flex flex-col gap-1.5">
          {lines.map((line, idx) => {
            let textColor = 'text-text-dim';
            if (line.type === 'success') textColor = 'text-forest';
            if (line.type === 'warn') textColor = 'text-sev-medium';
            if (line.type === 'error') textColor = 'text-sev-critical';
            if (line.type === 'system') textColor = 'text-forest-soft font-bold';

            return (
              <div key={idx} className={`${textColor} leading-relaxed break-all`}>
                {line.text}
              </div>
            );
          })}
          
          {scanning && (
            <div className="text-forest animate-pulse flex items-center gap-1 font-bold">
              <span>[~] Auditing threat footprint</span>
              <span className="animate-bounce">...</span>
            </div>
          )}
        </div>
      </div>

      <div ref={terminalEndRef} />
    </div>
  );
}
