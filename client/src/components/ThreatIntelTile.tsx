'use client';

import React, { useEffect, useState } from 'react';
import { getStats } from '../lib/api';
import { Stats } from '../lib/types';
import { ShieldAlert, Database, Flame, History } from 'lucide-react';

export default function ThreatIntelTile() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load system stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
    
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-surface border border-border-dim rounded-2xl animate-shimmer min-h-[220px]">
        <div className="h-4 bg-surface-2 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-surface-2 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-surface-2 rounded w-3/4"></div>
      </div>
    );
  }

  const defaultStats: Stats = stats || {
    totalScans: 0,
    totalFindings: 0,
    mostCommonVuln: 'Content Security Policy (CSP) missing',
    recent: []
  };

  return (
    <div className="p-6 card-elevated brackets border border-border-dim rounded-2xl flex flex-col justify-between gap-6">
      <div>
        <div className="flex items-center justify-between border-b border-border-dim/40 pb-2.5 mb-4">
          <span className="flex items-center gap-2.5 text-text-dim text-[11px] font-semibold uppercase tracking-[0.2em]">
            <span className="text-forest/50 font-mono text-[10px]">02</span>
            <Database className="w-3.5 h-3.5 text-forest" />
            Threat Intelligence Database
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-forest/60 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-bg border border-border-dim rounded-xl">
            <span className="text-text-faint text-[10px] block">TOTAL AUDITS</span>
            <span className="text-2xl font-mono font-bold text-text-primary">
              {defaultStats.totalScans}
            </span>
          </div>
          <div className="p-3 bg-bg border border-border-dim rounded-xl">
            <span className="text-text-faint text-[10px] block">THREATS DETECTED</span>
            <span className="text-2xl font-mono font-bold text-sev-critical">
              {defaultStats.totalFindings}
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-bg border border-border-dim rounded-xl flex items-center gap-3">
          <Flame className="w-5 h-5 text-sev-high shrink-0" />
          <div>
            <span className="text-text-faint text-[10px] block">MOST COMMON VULNERABILITY</span>
            <span className="text-xs font-mono text-text-dim block truncate max-w-[250px]">
              {defaultStats.mostCommonVuln}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-text-faint text-[10px] font-semibold uppercase mb-2">
          <History className="w-3.5 h-3.5" />
          Live Audit Ticker
        </div>

        <div data-lenis-prevent className="bg-bg border border-border-dim rounded-xl p-3 h-24 overflow-y-auto font-mono text-[11px] flex flex-col gap-1.5 scrollbar">
          {defaultStats.recent.length === 0 ? (
            <div className="text-text-faint italic text-center py-4">
              [No scans logged yet. Be the first!]
            </div>
          ) : (
            defaultStats.recent.map((scan, idx) => {
              const gradeColor = scan.grade.startsWith('A') 
                ? 'text-forest' 
                : scan.grade.startsWith('B') 
                ? 'text-forest-soft'
                : scan.grade.startsWith('C') 
                ? 'text-sev-medium' 
                : 'text-sev-critical';

              return (
                <div key={idx} className="flex justify-between items-center border-b border-border-dim/20 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-text-dim truncate max-w-[130px]" title={scan.targetMasked}>
                    {scan.targetMasked}
                  </span>
                  <div className="flex gap-2 items-center">
                    <span className="text-text-faint">{scan.score} pts</span>
                    <span className={`font-bold ${gradeColor}`}>[{scan.grade}]</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
