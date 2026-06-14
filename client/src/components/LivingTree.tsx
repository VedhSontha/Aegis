'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load the 3D visualizer. Disable SSR because WebGL requires the browser 'window' object
const LivingTree3D = dynamic(() => import('./LivingTree3D'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center w-full h-[220px] bg-bg font-mono text-[10px] text-text-faint select-none">
      <span className="w-4 h-4 rounded-full border-2 border-border-dim border-t-forest animate-spin mb-2" />
      LOADING 3D POSTURE CORE...
    </div>
  )
});

interface LivingTreeProps {
  score: number;
}

export default function LivingTree({ score }: LivingTreeProps) {
  const [webGlSupported, setWebGlSupported] = useState(true);

  // WebGL support verification check on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const support = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
      setWebGlSupported(support);
    } catch (e) {
      setWebGlSupported(false);
    }
  }, []);

  const h = Math.max(0, Math.min(100, score)) / 100;
  const getLeafFill = () => {
    if (h < 0.3) return '#8B5A2B'; // Withered brown
    if (h < 0.6) return '#B59A3E'; // Amber/olive
    return '#3FB950'; // Lush green
  };

  // Fallback 2D SVG Render structure
  const renderFallbackSvg = () => {
    const leafScale = 0.2 + 0.8 * h;
    const leafOpacity = 0.3 + 0.7 * h;
    const fireflyCount = Math.floor(h * 12);
    const fireflyOpacity = Math.max(0, h - 0.4);
    const trunkColor = h < 0.4 ? '#4A3525' : '#1F2E28';

    return (
      <svg viewBox="0 0 200 200" className="w-full h-full max-h-[220px] transition-all duration-1000">
        <ellipse cx="100" cy="180" rx="60" ry="8" fill="none" stroke={h > 0.6 ? '#3FB950' : '#243029'} strokeWidth="1.5" style={{ opacity: 0.4 }} className="transition-all duration-1000" />
        <g stroke={trunkColor} strokeLinecap="round" className="transition-all duration-1000">
          <line x1="100" y1="180" x2="100" y2="130" strokeWidth="6" />
          <line x1="100" y1="145" x2="75" y2="115" strokeWidth="4" />
          <line x1="75" y1="115" x2="60" y2="95" strokeWidth="3" />
          <line x1="100" y1="138" x2="125" y2="110" strokeWidth="4" />
          <line x1="125" y1="110" x2="140" y2="90" strokeWidth="3" />
          <line x1="100" y1="130" x2="95" y2="95" strokeWidth="4" />
          <line x1="95" y1="95" x2="100" y2="70" strokeWidth="3" />
        </g>
        <g className="transition-all duration-1000" style={{ opacity: leafOpacity }}>
          <circle cx="100" cy="65" r={8 * leafScale} fill={getLeafFill()} />
          <circle cx="90" cy="60" r={6 * leafScale} fill={getLeafFill()} />
          <circle cx="110" cy="62" r={7 * leafScale} fill={getLeafFill()} />
          <circle cx="58" cy="90" r={8 * leafScale} fill={getLeafFill()} />
          <circle cx="50" cy="85" r={6 * leafScale} fill={getLeafFill()} />
          <circle cx="66" cy="88" r={7 * leafScale} fill={getLeafFill()} />
          <circle cx="142" cy="85" r={9 * leafScale} fill={getLeafFill()} />
          <circle cx="134" cy="80" r={6 * leafScale} fill={getLeafFill()} />
          <circle cx="148" cy="90" r={6 * leafScale} fill={getLeafFill()} />
          <circle cx="85" cy="110" r={5 * leafScale} fill={getLeafFill()} />
          <circle cx="118" cy="105" r={6 * leafScale} fill={getLeafFill()} />
        </g>
        {fireflyCount > 0 && (
          <g style={{ opacity: fireflyOpacity }} className="transition-opacity duration-1000">
            <circle cx="45" cy="70" r="1.5" fill="#3FB950" className="animate-pulse" />
            <circle cx="80" cy="50" r="1" fill="#3FB950" className="animate-ping" />
            <circle cx="120" cy="45" r="1.5" fill="#3FB950" className="animate-pulse" />
            <circle cx="155" cy="75" r="1.2" fill="#3FB950" />
            <circle cx="65" cy="120" r="1" fill="#3FB950" />
            <circle cx="135" cy="115" r="1.5" fill="#3FB950" className="animate-pulse" />
            <circle cx="100" cy="40" r="1" fill="#3FB950" />
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-[260px] bg-bg rounded-xl border border-border-dim p-4 overflow-hidden select-none">
      {/* Radial posture background glow */}
      <div 
        className="absolute inset-0 transition-all duration-1000 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${score >= 70 ? 'rgba(63, 185, 80, 0.15)' : 'rgba(213, 69, 59, 0.15)'} 0%, rgba(10,14,13,0) 70%)`
        }}
      />

      {/* Render 3D if supported, otherwise fallback to 2D SVG */}
      <div className="w-full h-[300px] flex items-center justify-center relative">
        {webGlSupported ? (
          <LivingTree3D score={score} />
        ) : (
          renderFallbackSvg()
        )}
      </div>

      {/* Stats summary footer */}
      <div className="mt-2 text-center select-none z-10">
        <span className="text-text-faint text-[10px] uppercase font-mono block">Security Health</span>
        <span className="text-sm font-mono font-bold" style={{ color: getLeafFill() }}>
          {score}% - {score >= 90 ? 'HEALTHY' : score >= 70 ? 'STABLE' : 'COMPROMISED'}
        </span>
      </div>
    </div>
  );
}
