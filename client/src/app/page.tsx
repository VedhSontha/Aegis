'use client';

import React, { useState } from 'react';
import ScanInput from '../components/ScanInput';
import ThreatIntelTile from '../components/ThreatIntelTile';
import LivingTree from '../components/LivingTree';
import ScrambleText from '../components/ScrambleText';
import Reveal from '../components/Reveal';
import ShaderBackground from '../components/ShaderBackground';
import FloatingPaths from '../components/FloatingPaths';
import Spotlight from '../components/Spotlight';
import { Shield, Lock, Eye, CheckCircle } from 'lucide-react';

export default function Home() {
  const [sliderScore, setSliderScore] = useState(45); // default vulnerable state

  return (
    <main className="min-h-screen text-text-primary px-4 md:px-8 py-12 flex flex-col justify-between max-w-6xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center gap-2 select-none">
        <div className="w-8 h-8 rounded-lg bg-forest-deep border border-forest flex items-center justify-center">
          <Shield className="w-5 h-5 text-forest" />
        </div>
        <span className="font-mono font-bold text-lg tracking-wider">AEGIS</span>
      </header>

      {/* Hero Section — full-bleed pointer-reactive shader + ambient signal-flow
          paths behind the headline; breaks out of the max-w-6xl container so the
          glow spans the entire viewport width. */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen my-12 overflow-hidden">
        <ShaderBackground className="absolute inset-0 h-full w-full opacity-60" />
        <FloatingPaths className="opacity-70" />
        {/* readability scrim so headline/text stay crisp over the shader */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/10 to-bg/70" />

        <div className="relative z-[3] py-16 px-4 text-center flex flex-col gap-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 font-mono text-[10px] md:text-[11px] tracking-[0.35em] uppercase text-forest/70 select-none">
            <span className="h-px w-8 bg-forest/30" />
            AEGIS · Security Console · v1.0
            <span className="h-px w-8 bg-forest/30" />
          </div>
          <h1 className="text-4xl md:text-[5.25rem] font-mono font-bold tracking-[-0.03em] text-text-primary leading-[0.98] cursor-default select-none">
            <ScrambleText text="Scan. Prove. Patch. Re-grade." />
          </h1>
          <p className="text-text-dim text-sm md:text-base leading-relaxed max-w-xl mx-auto mt-2">
            AEGIS analyzes public web URLs and GitHub repositories to diagnose vulnerabilities,
            provides visual exploit proof, and generates tailored middleware patches to secure your applications.
          </p>

          {/* Input Form */}
          <div className="mt-6">
            <ScanInput />
          </div>
        </div>
      </section>

      {/* Signature 3D Showcase — Spline-style split panel: copy + score slider
          on the left, the interactive Living Tree on the right, with a
          mouse-follow forest spotlight tracking across the whole card. */}
      <Reveal>
      <section className="relative my-6 overflow-hidden rounded-2xl border border-border-dim card-elevated brackets">
        <Spotlight size={320} />
        <div className="relative z-[3] grid grid-cols-1 md:grid-cols-2 min-h-[440px]">
          {/* Left: copy + controller */}
          <div className="p-8 flex flex-col justify-center gap-5">
            <div className="flex items-center gap-2.5 text-text-dim text-[11px] font-semibold uppercase tracking-[0.2em]">
              <span className="text-forest/50 font-mono text-[10px]">01</span>
              Signature Visualizer
            </div>
            <h2 className="text-3xl md:text-4xl font-mono font-bold tracking-[-0.02em] text-gradient leading-tight">
              Watch security come alive.
            </h2>
            <p className="text-sm text-text-dim leading-relaxed max-w-md">
              Every grade maps to a living posture tree — it blooms as you patch and
              withers as gaps pile up. Drag the controller to feel the range from
              compromised to hardened in real time.
            </p>

            <div className="flex flex-col gap-2 mt-2 max-w-md">
              <div className="flex justify-between text-[10px] font-mono text-text-faint">
                <span>COMPROMISED (F)</span>
                <span>STABLE (C)</span>
                <span>HEALTHY (A+)</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={sliderScore}
                onChange={(e) => setSliderScore(Number(e.target.value))}
                className="w-full h-1.5 bg-bg rounded-lg appearance-none cursor-pointer accent-forest border border-border-dim"
              />
            </div>
          </div>

          {/* Right: interactive 3D */}
          <div className="relative flex items-center justify-center p-4 min-h-[280px] md:border-l border-border-dim/40">
            <LivingTree score={sliderScore} />
          </div>
        </div>
      </section>
      </Reveal>

      {/* Platform statistics (connected to database API) */}
      <Reveal>
      <section className="my-6">
        <ThreatIntelTile />
      </section>
      </Reveal>

      {/* Feature Explanations Grid */}
      <Reveal>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
        <div className="relative overflow-hidden p-6 card-elevated border border-border-dim rounded-xl flex flex-col gap-3">
          <Spotlight />
          <div className="relative z-[3] w-10 h-10 rounded-lg bg-surface-2 border border-border-dim flex items-center justify-center">
            <Lock className="w-5 h-5 text-forest" />
          </div>
          <h3 className="relative z-[3] font-semibold text-sm">1. Diagnose Gaps</h3>
          <p className="relative z-[3] text-xs text-text-dim leading-relaxed">
            Run automated web probes and dependency checks using our SSE console to fetch security header audits and OSV database CVE reports in seconds.
          </p>
        </div>

        <div className="relative overflow-hidden p-6 card-elevated border border-border-dim rounded-xl flex flex-col gap-3">
          <Spotlight />
          <div className="relative z-[3] w-10 h-10 rounded-lg bg-surface-2 border border-border-dim flex items-center justify-center">
            <Eye className="w-5 h-5 text-forest" />
          </div>
          <h3 className="relative z-[3] font-semibold text-sm">2. Prove Exploits</h3>
          <p className="relative z-[3] text-xs text-text-dim leading-relaxed">
            Confirm findings with passive iframe framing tests and CORS headers reflection metrics, ensuring zero staging or faked report parameters.
          </p>
        </div>

        <div className="relative overflow-hidden p-6 card-elevated border border-border-dim rounded-xl flex flex-col gap-3">
          <Spotlight />
          <div className="relative z-[3] w-10 h-10 rounded-lg bg-surface-2 border border-border-dim flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-forest" />
          </div>
          <h3 className="relative z-[3] font-semibold text-sm">3. Deploy Middleware Patches</h3>
          <p className="relative z-[3] text-xs text-text-dim leading-relaxed">
            Download tailored Next.js or Express middleware containing exactly the missing headers you need. Re-scan and watch your rating climb.
          </p>
        </div>
      </section>
      </Reveal>

      {/* Footer */}
      <footer className="border-t border-border-dim/30 pt-6 text-center text-text-faint text-[10px] font-mono select-none">
        AEGIS SCANNER · DEPLOYED SECURE MODULE ENGINE · DEVLYNIX BUILDATHON 2.0
      </footer>
    </main>
  );
}
