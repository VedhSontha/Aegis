'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getReport, getStreamUrl, getExportUrl, getBadgeMarkdown, triggerScan } from '../../../lib/api';
import { Scan, Finding, StreamEvent } from '../../../lib/types';
import GradeRing from '../../../components/GradeRing';
import CategoryRings from '../../../components/CategoryRings';
import AttackConsole, { ConsoleLine } from '../../../components/AttackConsole';
import RemediationDrawer from '../../../components/RemediationDrawer';
import LivingTree from '../../../components/LivingTree';
import RescanReveal, { GradeSnap } from '../../../components/RescanReveal';
import AiBriefing from '../../../components/AiBriefing';
import { Shield, RefreshCw, Download, FileCode, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

// Identify a target across query strings / protocol so /range and /range?safe=1
// (vulnerable vs patched) count as the same app for the re-grade reveal.
function normalizeTarget(t: string): string {
  return t.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').split('?')[0];
}

const SEV_HEX: Record<string, string> = {
  critical: '#D5453B',
  high: '#C6803C',
  medium: '#B59A3E',
  low: '#5E7C9E',
  info: '#5E7C9E'
};
import Link from 'next/link';

export default function ScanDashboard() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scanning, setScanning] = useState(true);
  
  // Console logs
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  
  // Selection state for remediation drawer
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  
  // Copy badge code alert
  const [badgeCopied, setBadgeCopied] = useState(false);

  // Re-scan grade-delta reveal
  const [reveal, setReveal] = useState<{ prev: GradeSnap; current: GradeSnap } | null>(null);

  // Record this target's grade; if we've graded the same target before, surface
  // the before/after delta. Only fires for live scans (not cache views), so the
  // demo flow "scan /range (F) -> scan /range?safe=1 (A+)" shows the F->A+ reveal.
  function recordGrade(scanData: Scan, findingsData: Finding[], live: boolean) {
    if (!live) return;
    try {
      const key = 'aegis:grade:' + normalizeTarget(scanData.target);
      const current: GradeSnap = {
        score: scanData.score,
        grade: scanData.grade,
        failed: findingsData.filter(f => !f.passed).length
      };
      const raw = localStorage.getItem(key);
      if (raw) {
        const prev = JSON.parse(raw) as GradeSnap;
        setReveal({ prev, current });
      }
      localStorage.setItem(key, JSON.stringify(current));
    } catch {
      /* localStorage unavailable — skip the reveal */
    }
  }

  useEffect(() => {
    let eventSource: EventSource | null = null;

    async function initScan() {
      try {
        // Fetch initial scan settings
        const initial = await getReport(id);
        setScan(initial.scan);

        setConsoleLines([
          { text: `[INIT] Target configured: ${initial.scan.target}`, type: 'system' },
          { text: `[INIT] Target type detected: ${initial.scan.targetType.toUpperCase()}`, type: 'system' },
          { text: `[PROBE] Establishing socket stream to scanner engine...`, type: 'info' }
        ]);

        if (initial.scan.status === 'complete') {
          // If already completed in past run, load findings directly
          setFindings(initial.findings);
          setScanning(false);
          setConsoleLines(prev => [
            ...prev,
            { text: `[CACHE] Report load success. Security score: ${initial.scan.score}/100.`, type: 'success' },
            { text: `> scan complete — grade ${initial.scan.grade}`, type: 'success' }
          ]);
          recordGrade(initial.scan, initial.findings, false);
          return;
        }

        // Open live streaming SSE
        const streamUrl = getStreamUrl(id);
        eventSource = new EventSource(streamUrl);

        eventSource.addEventListener('check', (e: any) => {
          const checkData = JSON.parse(e.data) as StreamEvent;
          
          // Append log line
          const passedChar = checkData.passed ? '[✓]' : '[✗]';
          const lineType = checkData.passed ? 'success' as const : checkData.severity === 'critical' || checkData.severity === 'high' ? 'error' as const : 'warn' as const;
          
          setConsoleLines(prev => [
            ...prev,
            { text: `${passedChar} ${checkData.title} -> ${checkData.passed ? 'PASSED' : 'FAILED'} (seen: ${checkData.evidence.slice(0, 45)}${checkData.evidence.length > 45 ? '...' : ''})`, type: lineType }
          ]);

          // Mock finding placeholder to render list live
          setFindings(prev => [
            ...prev,
            {
              _id: checkData.checkId,
              scanId: id,
              checkId: checkData.checkId,
              category: checkData.category,
              title: checkData.title,
              severity: checkData.severity,
              passed: checkData.passed,
              evidence: checkData.evidence,
              description: '',
              fix: { text: '', code: '', lang: 'http' },
              weight: 1
            }
          ]);
        });

        eventSource.addEventListener('done', async (e: any) => {
          const doneData = JSON.parse(e.data);
          eventSource?.close();

          setConsoleLines(prev => [
            ...prev,
            { text: `[DONE] Scan metrics compiled. Score: ${doneData.score}/100. Saving reports.`, type: 'success' },
            { text: `> scan complete — grade ${doneData.grade}`, type: 'success' }
          ]);

          // Fetch normalized DB documents
          const completed = await getReport(id);
          setScan(completed.scan);
          setFindings(completed.findings);
          setScanning(false);
          recordGrade(completed.scan, completed.findings, true);
        });

        eventSource.addEventListener('error', (e: any) => {
          eventSource?.close();
          setScanning(false);
          setConsoleLines(prev => [
            ...prev,
            { text: `[ERROR] Scan session aborted. Server connection timeout or SSRF block.`, type: 'error' }
          ]);
        });

      } catch (err: any) {
        console.error('Scan loading failed:', err);
        setScanning(false);
        setConsoleLines(prev => [
          ...prev,
          { text: `[CRITICAL] Scan execution failed. target unreachable.`, type: 'error' }
        ]);
      }
    }

    initScan();

    return () => {
      eventSource?.close();
    };
  }, [id]);

  // Handle re-scan trigger
  const handleReScan = async () => {
    if (!scan) return;
    setScanning(true);
    setScan(null);
    setFindings([]);
    setConsoleLines([]);
    setSelectedFinding(null);
    setReveal(null);

    try {
      const { scanId } = await triggerScan(scan.target);
      router.push(`/scan/${scanId}`);
    } catch (err) {
      setScanning(false);
      console.error(err);
    }
  };

  const handleCopyBadge = () => {
    const markdown = getBadgeMarkdown(id);
    navigator.clipboard.writeText(markdown);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
  };

  const score = scan?.score ?? 0;
  const grade = scan?.grade ?? 'F';
  const targetName = scan?.target ?? 'Scanning Target...';

  // Group findings to show failed on top
  const sortedFindings = [...findings].sort((a, b) => {
    if (a.passed === b.passed) return 0;
    return a.passed ? 1 : -1; // failed first
  });

  return (
    <main className="min-h-screen text-text-primary px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col gap-6">
      
      {/* Repo scan scope warning */}
      {!scanning && scan?.targetType === 'repo' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-950/30 border border-amber-700/40 rounded-xl text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="text-amber-200/80">
            <span className="text-amber-400 font-semibold">Repo scan:</span> Only dependency CVEs and committed secrets were checked — no live web probes ran because this is source code, not a running server. To test HTTP security headers, clickjacking, CSRF, and XSS, deploy the app and scan its live URL.
          </span>
        </div>
      )}

      {/* Top dashboard control bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-dim/30 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-surface hover:bg-surface-2 border border-border-dim rounded-lg text-text-dim hover:text-text-primary transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 select-none">
              <Shield className="w-4 h-4 text-forest" />
              <span className="font-mono text-xs uppercase text-text-faint">AEGIS Audit Dashboard</span>
            </div>
            <h1 className="text-sm font-mono font-bold text-text-primary mt-0.5 truncate max-w-[280px] md:max-w-[400px]">
              {targetName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 select-none">
          <button
            type="button"
            onClick={handleReScan}
            disabled={scanning}
            className="px-3 py-2 bg-surface hover:bg-surface-2 border border-border-dim disabled:bg-surface-2 disabled:text-text-faint text-text-dim hover:text-text-primary font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            Re-Scan
          </button>
          
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

          {/* Simulate Attacks — only shown for live URL targets */}
          {scan && scan.targetType === 'url' && (
            <Link
              href={`/simulate?target=${encodeURIComponent(scan.target)}`}
              className="px-3 py-2 bg-surface hover:bg-surface-2 border border-border-dim text-text-dim hover:text-forest font-mono text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 9-9"/><path d="m2 2 20 20"/></svg>
              Simulate Attacks
            </Link>
          )}
        </div>

      </section>

      {/* Re-scan before/after reveal */}
      {reveal && !scanning && (
        <RescanReveal prev={reveal.prev} current={reveal.current} onDismiss={() => setReveal(null)} />
      )}

      {/* Main Bento Grid layout */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Grade Ring (col-span-4) */}
        <div className="md:col-span-4">
          <GradeRing score={score} grade={grade} scanning={scanning} />
        </div>

        {/* Live Attack Console Terminal (col-span-8) */}
        <div className="md:col-span-8">
          <AttackConsole lines={consoleLines} scanning={scanning} />
        </div>

        {/* Category breakdown (col-span-4) */}
        <div className="md:col-span-4">
          <CategoryRings findings={findings} scanning={scanning} />
        </div>

        {/* Dynamic visual health tree (col-span-4) */}
        <div className="md:col-span-4">
          <LivingTree score={scanning ? 0 : score} />
        </div>

        {/* Exploit & patch notifications card (col-span-4) */}
        <div className="md:col-span-4 p-5 bg-surface border border-border-dim rounded-2xl flex flex-col justify-between gap-4 select-none">
          <div>
            <span className="text-text-dim text-xs font-semibold uppercase tracking-wider block mb-2">
              Patch Readiness
            </span>
            <p className="text-xs text-text-faint leading-relaxed">
              Once auditing concludes, select any failed test below to generate patches, deploy local SDK shield filters, or review live exploit models.
            </p>
          </div>
          <div className="p-3 bg-bg border border-border-dim rounded-xl flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${scanning ? 'bg-yellow-500 animate-pulse' : score >= 90 ? 'bg-forest' : 'bg-sev-critical animate-ping'}`} />
            <span className="font-mono text-[10px] text-text-dim uppercase">
              {scanning ? 'SCANNING TARGET...' : score >= 90 ? 'HEALTH SECURITY OK' : 'SECURITY SHIELD REQUIRED'}
            </span>
          </div>
        </div>

        {/* AI Security Analyst (full width) */}
        {!scanning && scan && (
          <div className="md:col-span-12">
            <AiBriefing scanId={id} />
          </div>
        )}

        {/* Findings audit items list (col-span-8) */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border-dim/40 pb-2.5">
            <span className="text-text-dim text-[11px] font-semibold uppercase tracking-[0.2em]">
              Vulnerabilities Audit
            </span>
            <span className="font-mono text-[10px] text-forest/70">{findings.filter(f => !f.passed).length} GAPS DETECTED</span>
          </div>

          <div data-lenis-prevent className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1 scrollbar select-none">
            {findings.length === 0 ? (
              <div className="p-8 bg-surface border border-border-dim rounded-2xl text-center text-text-faint font-mono text-xs italic">
                {scanning ? '[Awaiting console stream outputs...]' : '[No findings logged for this scan]'}
              </div>
            ) : (
              sortedFindings.map(f => {
                const isSelected = selectedFinding?.checkId === f.checkId;
                
                return (
                  <div
                    key={f.checkId}
                    onClick={() => !scanning && setSelectedFinding(f)}
                    style={!f.passed && !isSelected ? { borderLeftWidth: '3px', borderLeftColor: SEV_HEX[f.severity] || SEV_HEX.info } : undefined}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                      scanning ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'
                    } ${
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
              })
            )}
          </div>
        </div>

        {/* Remediation drawer panel (col-span-4) */}
        <div className="md:col-span-4">
          <RemediationDrawer scan={scan!} findings={findings} finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
        </div>

      </section>
    </main>
  );
}
