'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getReport, getExportUrl, getBadgeMarkdown } from '../../../lib/api';
import { Scan, Finding } from '../../../lib/types';
import GradeRing from '../../../components/GradeRing';
import CategoryRings from '../../../components/CategoryRings';
import RemediationDrawer from '../../../components/RemediationDrawer';
import LivingTree from '../../../components/LivingTree';
import { Shield, Download, FileCode, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;

  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [badgeCopied, setBadgeCopied] = useState(false);

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await getReport(id);
        setScan(data.scan);
        setFindings(data.findings);
      } catch (err) {
        console.error('Failed to load scan report:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [id]);

  const handleCopyBadge = () => {
    const markdown = getBadgeMarkdown(id);
    navigator.clipboard.writeText(markdown);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text-primary px-8 py-12 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-forest-deep border-t-forest animate-spin" />
        <span className="font-mono text-xs text-text-faint uppercase tracking-wider">Retrieving Audit Report...</span>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-bg text-text-primary px-8 py-12 flex flex-col items-center justify-center gap-4 select-none">
        <span className="font-mono text-xs text-sev-critical uppercase tracking-wider">[ERROR] Report Not Found</span>
        <Link href="/" className="px-4 py-2 bg-surface hover:bg-surface-2 border border-border-dim rounded-lg text-xs font-mono">
          Return to Console
        </Link>
      </div>
    );
  }

  const score = scan.score;
  const grade = scan.grade;
  const targetName = scan.target;

  const sortedFindings = [...findings].sort((a, b) => {
    if (a.passed === b.passed) return 0;
    return a.passed ? 1 : -1;
  });

  return (
    <main className="min-h-screen bg-bg text-text-primary px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col gap-6">
      
      {/* Top Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-dim/30 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-surface hover:bg-surface-2 border border-border-dim rounded-lg text-text-dim hover:text-text-primary transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 select-none">
              <Shield className="w-4 h-4 text-forest" />
              <span className="font-mono text-xs uppercase text-text-faint">AEGIS Security Audit Report</span>
            </div>
            <h1 className="text-sm font-mono font-bold text-text-primary mt-0.5 truncate max-w-[280px] md:max-w-[400px]">
              {targetName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 select-none">
          <a
            href={getExportUrl(id)}
            className="px-3 py-2 bg-surface hover:bg-surface-2 border border-border-dim text-text-dim hover:text-text-primary font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Audit Report
          </a>

          <button
            type="button"
            onClick={handleCopyBadge}
            className="px-3 py-2 bg-surface hover:bg-surface-2 border border-border-dim text-text-dim hover:text-text-primary font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {badgeCopied ? <Check className="w-3.5 h-3.5 text-forest" /> : <FileCode className="w-3.5 h-3.5" />}
            README Badge
          </button>
        </div>
      </section>

      {/* Bento Layout */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Grade Ring */}
        <div className="md:col-span-4">
          <GradeRing score={score} grade={grade} scanning={false} />
        </div>

        {/* Informative Banner Panel */}
        <div className="md:col-span-8 p-6 bg-surface border border-border-dim rounded-2xl flex flex-col justify-between gap-5 select-none">
          <div>
            <span className="text-text-dim text-xs font-semibold uppercase tracking-wider block mb-2">
              Historical Scan Records
            </span>
            <p className="text-xs text-text-faint leading-relaxed font-mono">
              [LOG] Scan generated at {new Date(scan.createdAt).toLocaleString()}. 
              This is a read-only snapshot report page. Dynamic logs are disabled, but all remediation generators and exploit testing parameters remain fully active.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-forest" />
            <span className="font-mono text-[9px] text-text-dim uppercase">READ-ONLY AUDIT SNAPSHOT</span>
          </div>
        </div>

        {/* Category postures */}
        <div className="md:col-span-4">
          <CategoryRings findings={findings} scanning={false} />
        </div>

        {/* Visual tree posture */}
        <div className="md:col-span-4">
          <LivingTree score={score} />
        </div>

        {/* Summary card */}
        <div className="md:col-span-4 p-5 bg-surface border border-border-dim rounded-2xl flex flex-col justify-between gap-4 select-none">
          <div>
            <span className="text-text-dim text-xs font-semibold uppercase tracking-wider block mb-2">
              Security Profile
            </span>
            <div className="flex flex-col gap-1.5 font-mono text-[10px] text-text-dim mt-2">
              <div className="flex justify-between"><span>CRITICAL ISSUES:</span><span className="text-sev-critical font-bold">{scan.summary.critical}</span></div>
              <div className="flex justify-between"><span>HIGH ISSUES:</span><span className="text-sev-high font-bold">{scan.summary.high}</span></div>
              <div className="flex justify-between"><span>MEDIUM ISSUES:</span><span className="text-sev-medium font-bold">{scan.summary.medium}</span></div>
              <div className="flex justify-between"><span>LOW ISSUES:</span><span className="text-sev-low font-bold">{scan.summary.low}</span></div>
            </div>
          </div>
        </div>

        {/* Findings checklist */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <span className="text-text-dim text-xs font-semibold uppercase tracking-wider block">
            Security Findings checklist
          </span>

          <div data-lenis-prevent className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1 scrollbar select-none">
            {sortedFindings.map(f => {
              const isSelected = selectedFinding?.checkId === f.checkId;
              
              return (
                <div
                  key={f.checkId}
                  onClick={() => setSelectedFinding(f)}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                    isSelected 
                      ? 'bg-surface-2 border-forest' 
                      : f.passed 
                      ? 'bg-surface/40 border-border-dim/40 hover:border-border-dim' 
                      : 'bg-surface border-border-dim hover:border-border-dim'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      f.passed ? 'bg-forest' : f.severity === 'critical' ? 'bg-sev-critical' : f.severity === 'high' ? 'bg-sev-high' : f.severity === 'medium' ? 'bg-sev-medium' : 'bg-sev-low'
                    }`} />
                    <div>
                      <h4 className="text-xs font-semibold text-text-primary leading-tight">
                        {f.title}
                      </h4>
                      <span className="font-mono text-[10px] text-text-faint block truncate max-w-[280px] md:max-w-[450px] mt-1.5">
                        Evidence: {f.evidence || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      f.passed ? 'bg-forest/10 text-forest border border-forest/30' : 'bg-surface-2 text-text-dim border border-border-dim'
                    }`}>
                      {f.passed ? 'PASS' : f.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remediation drawer */}
        <div className="md:col-span-4">
          <RemediationDrawer scan={scan} findings={findings} finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
        </div>

      </section>
    </main>
  );
}
