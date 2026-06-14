'use client';

import React, { useState } from 'react';
import { Scan, Finding } from '../lib/types';
import { generateShield, generateCiCd, getExportUrl } from '../lib/api';
import ExploitSimulator from './ExploitSimulator';
import { Code, Download, ShieldAlert, Cpu, Check, Copy } from 'lucide-react';

interface RemediationDrawerProps {
  scan: Scan;
  findings: Finding[];
  finding: Finding | null;
  onClose: () => void;
}

export default function RemediationDrawer({ scan, findings = [], finding, onClose }: RemediationDrawerProps) {
  const [activeTab, setActiveTab] = useState<'fix' | 'shield' | 'cicd' | 'exploit'>('fix');
  const [shieldFramework, setShieldFramework] = useState<'express' | 'next'>('express');
  const [cicdPlatform, setCicdPlatform] = useState<'github' | 'gitlab'>('github');
  const [copied, setCopied] = useState(false);

  if (!finding) {
    return (
      <div className="h-full bg-surface border border-border-dim rounded-2xl p-6 flex items-center justify-center text-center text-text-faint select-none">
        <div>
          <ShieldAlert className="w-10 h-10 mx-auto text-border-dim mb-3" />
          <p className="text-xs uppercase font-mono tracking-wider">Audit Console Standby</p>
          <p className="text-[10px] text-text-faint mt-1">Select any vulnerability from the findings list to audit remediation pathways.</p>
        </div>
      </div>
    );
  }

  // Copy code utility
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger shield file download
  const handleDownloadShield = async () => {
    try {
      const { filename, content } = await generateShield(scan._id, shieldFramework);
      const blob = new Blob([content], { type: 'text/javascript' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download shield:', err);
    }
  };

  // Trigger CI/CD YAML download
  const handleDownloadCiCd = async () => {
    try {
      const { filename, content } = await generateCiCd(scan._id, cicdPlatform);
      const blob = new Blob([content], { type: 'text/yaml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename.split('/').pop() || filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download CI/CD config:', err);
    }
  };

  return (
    <div className="h-full bg-surface border border-border-dim rounded-2xl p-6 flex flex-col justify-between gap-5 relative">
      {/* Drawer Header */}
      <div className="flex items-start justify-between border-b border-border-dim/30 pb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 bg-surface-2 border border-border-dim rounded text-text-dim uppercase">
              {finding.category}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              finding.severity === 'critical' ? 'bg-red-950/40 border border-sev-critical text-sev-critical' :
              finding.severity === 'high' ? 'bg-orange-950/40 border border-sev-high text-sev-high' :
              finding.severity === 'medium' ? 'bg-yellow-950/40 border border-sev-medium text-sev-medium' :
              'bg-blue-950/40 border border-sev-low text-sev-low'
            }`}>
              {finding.severity}
            </span>
          </div>
          <h2 className="text-sm font-semibold text-text-primary">{finding.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-faint hover:text-text-dim font-mono text-xs cursor-pointer"
        >
          [CLOSE]
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border-dim/30 select-none text-[11px] font-mono">
        <button
          onClick={() => setActiveTab('fix')}
          className={`flex-1 pb-2 font-bold text-center border-b-2 cursor-pointer transition-all ${
            activeTab === 'fix' ? 'border-forest text-forest' : 'border-transparent text-text-faint hover:text-text-dim'
          }`}
        >
          Fix
        </button>
        <button
          onClick={() => setActiveTab('shield')}
          className={`flex-1 pb-2 font-bold text-center border-b-2 cursor-pointer transition-all ${
            activeTab === 'shield' ? 'border-forest text-forest' : 'border-transparent text-text-faint hover:text-text-dim'
          }`}
        >
          Shield SDK
        </button>
        <button
          onClick={() => setActiveTab('cicd')}
          className={`flex-1 pb-2 font-bold text-center border-b-2 cursor-pointer transition-all ${
            activeTab === 'cicd' ? 'border-forest text-forest' : 'border-transparent text-text-faint hover:text-text-dim'
          }`}
        >
          CI/CD Gate
        </button>
        <button
          onClick={() => setActiveTab('exploit')}
          className={`flex-1 pb-2 font-bold text-center border-b-2 cursor-pointer transition-all ${
            activeTab === 'exploit' ? 'border-forest text-forest' : 'border-transparent text-text-faint hover:text-text-dim'
          }`}
        >
          Exploit Test
        </button>
      </div>

      {/* Tab Contents */}
      <div data-lenis-prevent className="flex-1 overflow-y-auto pr-1">
        {activeTab === 'fix' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-text-dim leading-relaxed">
              {finding.description}
            </p>
            <div className="p-3 bg-bg border border-border-dim rounded-xl flex flex-col gap-3">
              <span className="text-[10px] font-mono text-text-faint uppercase">Recommended Fix Instruction</span>
              <p className="text-xs text-text-dim leading-relaxed font-sans">{finding.fix.text}</p>
              
              {finding.fix.code && (
                <div className="relative">
                  <pre className="p-3 bg-surface-2 border border-border-dim rounded-lg text-[10px] font-mono text-forest overflow-x-auto max-w-full">
                    {finding.fix.code}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(finding.fix.code)}
                    className="absolute top-2 right-2 p-1.5 bg-bg border border-border-dim rounded hover:text-forest transition-all cursor-pointer text-text-faint"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'shield' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-text-dim leading-relaxed">
              Deploy a customized security middleware configured specifically to patch the vulnerabilities detected on your system.
            </p>

            <div className="bg-bg border border-border-dim rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-faint uppercase">Target Environment</span>
                <div className="flex gap-2 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setShieldFramework('express')}
                    className={`px-2.5 py-1 border rounded cursor-pointer transition-all ${
                      shieldFramework === 'express' ? 'border-forest text-forest bg-forest/5' : 'border-border-dim text-text-faint hover:text-text-dim'
                    }`}
                  >
                    Express JS
                  </button>
                  <button
                    type="button"
                    onClick={() => setShieldFramework('next')}
                    className={`px-2.5 py-1 border rounded cursor-pointer transition-all ${
                      shieldFramework === 'next' ? 'border-forest text-forest bg-forest/5' : 'border-border-dim text-text-faint hover:text-text-dim'
                    }`}
                  >
                    Next.js App Router
                  </button>
                </div>
              </div>

              <div className="p-3 bg-surface border border-border-dim rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Code className="w-5 h-5 text-forest" />
                  <div className="font-mono text-[11px]">
                    <span className="text-text-primary block font-bold">
                      {shieldFramework === 'express' ? 'aegis-shield.js' : 'middleware.ts'}
                    </span>
                    <span className="text-text-faint text-[9px]">Tailored payload middleware</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadShield}
                  className="p-2 bg-forest hover:bg-forest-soft text-bg rounded-lg transition-all cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[10px] text-text-faint leading-relaxed font-sans border-t border-border-dim/20 pt-3">
                {shieldFramework === 'express' ? (
                  <><strong>Express instructions:</strong> Save the downloaded file next to your server entry point, then import it: <code>app.use(require('./aegis-shield'))</code>. Redeploy and re-scan.</>
                ) : (
                  <><strong>Next.js instructions:</strong> Drop the generated <code>middleware.ts</code> file directly into the root of your Next.js <code>src/</code> directory, redeploy, and re-scan.</>
                )}
              </div>
            </div>

            {(() => {
              const headersMapping: Record<string, { header: string; value: string }> = {
                csp: { header: 'Content-Security-Policy', value: "default-src 'self'" },
                hsts: { header: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                xfo: { header: 'X-Frame-Options', value: 'DENY' },
                xcto: { header: 'X-Content-Type-Options', value: 'nosniff' },
                refpol: { header: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                permpol: { header: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
              };
              
              const diffLines: { type: 'add' | 'remove'; text: string }[] = [];
              
              if (findings.some(f => !f.passed && f.checkId === 'disclosure')) {
                diffLines.push({ type: 'remove', text: '- Server: [Exposed version info]' });
                diffLines.push({ type: 'remove', text: '- X-Powered-By: [Exposed framework info]' });
                diffLines.push({ type: 'add', text: '+ [Removed version disclosure headers]' });
              }
              
              if (findings.some(f => !f.passed && f.checkId === 'cors')) {
                diffLines.push({ type: 'remove', text: '- Access-Control-Allow-Origin: *' });
                diffLines.push({ type: 'remove', text: '- Access-Control-Allow-Credentials: true' });
                diffLines.push({ type: 'add', text: '+ Access-Control-Allow-Origin: [Restricted CORS origin]' });
              }
              
              Object.keys(headersMapping).forEach(id => {
                if (findings.some(f => !f.passed && f.checkId === id)) {
                  const item = headersMapping[id];
                  diffLines.push({ type: 'remove', text: `- ${item.header}: [Missing]` });
                  diffLines.push({ type: 'add', text: `+ ${item.header}: "${item.value}"` });
                }
              });

              if (diffLines.length === 0) return null;

              return (
                <div className="mt-2 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-text-faint uppercase">Shield Response Header Diff (Missing ➔ Patched)</span>
                  <div className="p-3 bg-bg border border-border-dim rounded-xl font-mono text-[10px] flex flex-col gap-1 overflow-x-auto max-h-[160px] scrollbar">
                    {diffLines.map((line, idx) => (
                      <div
                        key={idx}
                        className={
                          line.type === 'add'
                            ? 'text-forest bg-forest/5 px-1 rounded'
                            : 'text-sev-critical bg-red-950/10 px-1 rounded'
                        }
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'cicd' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-text-dim leading-relaxed">
              Enforce security checks automatically inside your git workflows. Block PR merges if the security scan grade falls below compliance.
            </p>

            <div className="bg-bg border border-border-dim rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-faint uppercase">CI/CD Platform</span>
                <div className="flex gap-2 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCicdPlatform('github')}
                    className={`px-2.5 py-1 border rounded cursor-pointer transition-all ${
                      cicdPlatform === 'github' ? 'border-forest text-forest bg-forest/5' : 'border-border-dim text-text-faint hover:text-text-dim'
                    }`}
                  >
                    GitHub Actions
                  </button>
                  <button
                    type="button"
                    onClick={() => setCicdPlatform('gitlab')}
                    className={`px-2.5 py-1 border rounded cursor-pointer transition-all ${
                      cicdPlatform === 'gitlab' ? 'border-forest text-forest bg-forest/5' : 'border-border-dim text-text-faint hover:text-text-dim'
                    }`}
                  >
                    GitLab CI/CD
                  </button>
                </div>
              </div>

              <div className="p-3 bg-surface border border-border-dim rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-forest" />
                  <div className="font-mono text-[11px]">
                    <span className="text-text-primary block font-bold">
                      {cicdPlatform === 'github' ? 'aegis.yml' : '.gitlab-ci.yml'}
                    </span>
                    <span className="text-text-faint text-[9px]">Workflow PR gate configuration</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCiCd}
                  className="p-2 bg-forest hover:bg-forest-soft text-bg rounded-lg transition-all cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exploit' && (
          <div className="flex flex-col gap-4">
            <ExploitSimulator scan={scan} finding={finding} />
          </div>
        )}
      </div>
    </div>
  );
}
