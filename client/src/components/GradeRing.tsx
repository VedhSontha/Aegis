'use client';

import React, { useEffect, useState } from 'react';

interface GradeRingProps {
  score: number;
  grade: string;
  scanning: boolean;
}

export default function GradeRing({ score, grade, scanning }: GradeRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (scanning) {
      setAnimatedScore(0);
      return;
    }

    // Simple count up animation
    let start = 0;
    const duration = 1200; // ms
    const stepTime = Math.abs(Math.floor(duration / score));
    
    if (score === 0) return;

    const timer = setInterval(() => {
      start += 1;
      setAnimatedScore(start);
      if (start >= score) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score, scanning]);

  // SVG parameters
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Grade color
  let colorClass = 'stroke-sev-critical text-sev-critical';
  if (grade.startsWith('A')) colorClass = 'stroke-forest text-forest';
  else if (grade.startsWith('B')) colorClass = 'stroke-forest-soft text-forest-soft';
  else if (grade.startsWith('C')) colorClass = 'stroke-sev-medium text-sev-medium';
  else if (grade.startsWith('D')) colorClass = 'stroke-sev-high text-sev-high';

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-surface border border-border-dim rounded-2xl min-h-[220px]">
      <span className="text-text-dim text-xs font-semibold uppercase tracking-wider block mb-4">
        Security Rating
      </span>

      <div className="relative w-32 h-32 flex items-center justify-center">
        {scanning ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col select-none">
            <span className="text-forest font-bold text-xs animate-pulse">AUDITING</span>
            <span className="text-[10px] text-text-faint font-mono mt-1">PORTS...</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center flex-col select-none">
            <span className={`text-4xl font-extrabold font-sans ${colorClass.split(' ')[1]}`}>
              {grade}
            </span>
            <span className="text-xs text-text-faint font-mono mt-0.5">
              {animatedScore} / 100
            </span>
          </div>
        )}

        <svg className="w-full h-full transform -rotate-90">
          {/* Background Ring */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-surface-2 fill-none"
          />
          {/* Animated Foreground Ring */}
          {!scanning && (
            <circle
              cx="64"
              cy="64"
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`fill-none transition-all duration-100 ease-out ${colorClass.split(' ')[0]}`}
              style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
