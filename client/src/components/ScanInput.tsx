'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { triggerScan } from '../lib/api';
import Magnetic from './Magnetic';
import { ArrowRight, Loader } from 'lucide-react';

export default function ScanInput() {
  const router = useRouter();
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { scanId } = await triggerScan(target.trim());
      router.push(`/scan/${scanId}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during target initialization.');
      setLoading(false);
    }
  };

  const handleQuickScan = async (value: string) => {
    setTarget(value);
    setLoading(true);
    setError(null);

    try {
      const { scanId } = await triggerScan(value);
      router.push(`/scan/${scanId}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during target initialization.');
      setLoading(false);
    }
  };

  const loadLocalRange = () => {
    // Dynamically query our local range route depending on current host
    const localRangeUrl = `${window.location.origin}/range`;
    handleQuickScan(localRangeUrl);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-4 font-mono text-sm select-none pointer-events-none flex items-center gap-1">
          <span className="text-text-faint">aegis</span>
          <span className="text-forest font-bold">❯</span>
        </div>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="scan a URL or GitHub repo (owner/repo)…"
          disabled={loading}
          className="w-full pl-[4.75rem] pr-32 py-4 bg-surface border border-border-dim rounded-xl text-text-primary placeholder-text-faint focus:outline-none focus:border-forest transition-all font-mono text-sm caret-forest"
        />
        <button
          type="submit"
          disabled={loading || !target.trim()}
          className="absolute right-2 px-4 py-2 bg-forest hover:bg-forest-soft disabled:bg-surface-2 disabled:text-text-faint text-bg font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer text-xs"
        >
          {loading ? (
            <Loader className="w-4 h-4 animate-spin text-text-dim" />
          ) : (
            <>
              Scan
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 p-3 bg-red-950/40 border border-sev-critical text-sev-critical rounded-lg text-xs font-mono">
          [ERROR] {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 justify-center items-center text-xs">
        <span className="text-text-faint">Hot Targets:</span>
        <Magnetic>
          <button
            type="button"
            onClick={loadLocalRange}
            disabled={loading}
            className="px-3 py-1.5 bg-surface hover:bg-surface-2 border border-border-dim rounded-md text-forest font-mono transition-all cursor-pointer"
          >
            [AEGIS Range Target]
          </button>
        </Magnetic>
        <Magnetic>
          <button
            type="button"
            onClick={() => handleQuickScan('github:expressjs/express')}
            disabled={loading}
            className="px-3 py-1.5 bg-surface hover:bg-surface-2 border border-border-dim rounded-md text-text-dim font-mono transition-all cursor-pointer"
          >
            github:expressjs/express
          </button>
        </Magnetic>
      </div>
    </div>
  );
}
