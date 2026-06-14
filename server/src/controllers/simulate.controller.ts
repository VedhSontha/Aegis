import type { Request, Response } from 'express';
import { validateTargetURL } from '../services/ssrf.guard';
import { runSimulation } from '../services/simulate.service';

/**
 * POST /api/simulate
 * Body: { target: string } — live URL only, not repos.
 *
 * Returns a SimulationResult JSON directly (ephemeral — no DB persistence in v1).
 * Never throws a 500 for probe failures — all errors are returned as
 * inconclusive attacks inside the result, mirroring simulate.py's top-level guard.
 */
export async function simulateAttacks(req: Request, res: Response): Promise<void> {
  const { target } = req.body as { target?: string };

  if (!target || typeof target !== 'string' || target.trim().length === 0) {
    res.status(400).json({ error: 'A target URL is required.' });
    return;
  }

  const normalized = target.trim();

  // Reject repo-type targets — simulation only works on live URLs
  if (
    normalized.startsWith('github:') ||
    normalized.startsWith('gitlab:') ||
    normalized.match(/^https?:\/\/(www\.)?(github|gitlab)\.com\/[^/]+\/[^/]+\/?$/)
  ) {
    res.status(400).json({
      error: 'Attack simulation only supports live URLs, not repositories. Use the scan feature for repo analysis.',
    });
    return;
  }

  // Ensure it has a protocol
  let urlString = normalized;
  if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
    urlString = 'https://' + urlString;
  }

  // SSRF guard — mandatory DNS-rebind-safe validation
  const validation = await validateTargetURL(urlString);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error || 'Invalid target URL.' });
    return;
  }

  try {
    const result = await runSimulation(urlString);
    res.json(result);
  } catch (err: any) {
    // Return a safe, non-500 result with the error in warnings
    res.json({
      target: urlString,
      scannedAt: new Date().toISOString(),
      attacks: [],
      warnings: [
        'These are SAFE, non-destructive susceptibility probes (benign payloads + response analysis only) — no exploitation, flooding, or auth bypass. Use only on targets you own or are authorized to test.',
        `Simulation error: ${err?.message ?? 'Unknown error'}`,
      ],
      meta: { error: 'true', probesRun: 0, requestsUsed: 0 },
      score: 0,
      grade: 'F',
    });
  }
}
