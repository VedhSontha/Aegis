import { Request, Response } from 'express';
import { Scan } from '../models/Scan.model';
import { Finding } from '../models/Finding.model';
import { validateTargetURL } from '../services/ssrf.guard';
import { fetchScanContext } from '../services/fetcher.service';
import { runChecks } from '../checks';
import { scanRepo, ScanFinding } from '../services/repo.scanner';
import { calculateScoreAndGrade } from '../services/score.service';
import { Types } from 'mongoose';

// Helper to normalize targets
function parseTarget(target: string): { target: string; type: 'url' | 'repo'; error?: string } {
  let cleaned = target.trim();
  
  // Check if it's a GitHub repository URL or signature
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i;
  const githubSigRegex = /^github:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/i;

  const sigMatch = cleaned.match(githubSigRegex);
  const urlMatch = cleaned.match(githubRegex);

  if (sigMatch) {
    return { target: `github:${sigMatch[1]}/${sigMatch[2]}`, type: 'repo' };
  } else if (urlMatch) {
    return { target: `github:${urlMatch[1]}/${urlMatch[2]}`, type: 'repo' };
  }

  // Otherwise treat as URL. Ensure protocol exists
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    // Preserve path + query (so /range and ?q=... are actually scanned), but keep
    // bare domains clean as just the origin.
    const target = parsed.pathname === '/' && !parsed.search ? parsed.origin : parsed.href;
    return { target, type: 'url' };
  } catch (e) {
    return { target: '', type: 'url', error: 'Invalid URL or Repository reference.' };
  }
}

export async function createScan(req: Request, res: Response) {
  const { target } = req.body;
  if (!target) {
    return res.status(400).json({ error: 'Target is required.' });
  }

  const parsed = parseTarget(target);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  // SSRF Protection for URLs
  if (parsed.type === 'url') {
    const ssrfCheck = await validateTargetURL(parsed.target);
    if (!ssrfCheck.valid) {
      return res.status(400).json({ error: ssrfCheck.error });
    }
  }

  try {
    const scan = new Scan({
      target: parsed.target,
      targetType: parsed.type,
      status: 'pending'
    });
    await scan.save();
    return res.status(201).json({ scanId: scan._id, target: scan.target, type: scan.targetType });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to initialize scan.' });
  }
}

export async function streamScan(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid Scan ID.' });
  }

  const scan = await Scan.findById(id);
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found.' });
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent reverse proxies (like Nginx) from buffering
  });

  // Keep-alive ping interval
  const keepAlive = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    scan.status = 'scanning';
    await scan.save();

    const streamFinding = (f: ScanFinding) => {
      sendEvent('check', {
        checkId: f.checkId,
        title: f.title,
        passed: f.passed,
        severity: f.severity,
        category: f.category,
        evidence: f.evidence
      });
    };

    // 1. Gather findings — repo scanner (per-vuln + secrets + code) vs URL checks
    let rawFindings: ScanFinding[];
    if (scan.targetType === 'repo') {
      const result = await scanRepo(scan.target, streamFinding);
      rawFindings = result.findings;
    } else {
      const context = await fetchScanContext(scan.target);
      const checkResults = await runChecks(context, (checkId, r) => {
        streamFinding({
          checkId: r.check.id,
          category: r.check.category,
          title: r.check.title,
          severity: r.check.severity,
          passed: r.passed,
          evidence: r.evidence,
          description: r.descriptionOverride || `Security check: ${r.check.title}.`,
          fix: r.fix,
          weight: r.check.weight
        });
      });
      rawFindings = checkResults.map(r => ({
        checkId: r.check.id,
        category: r.check.category,
        title: r.check.title,
        severity: r.check.severity,
        passed: r.passed,
        evidence: r.evidence,
        description: r.descriptionOverride || `Security check: ${r.check.title}.`,
        fix: r.fix,
        weight: r.check.weight
      }));
    }

    // 2. Cumulative score over the failed findings
    const failed = rawFindings.filter(f => !f.passed);
    const { score, grade } = calculateScoreAndGrade(failed.map(f => ({ severity: f.severity, weight: f.weight })));

    // 3. Severity counts for the summary
    const counts = { critical: 0, high: 0, medium: 0, low: 0, passed: 0 };
    for (const f of rawFindings) {
      if (f.passed) counts.passed++;
      else if (f.severity in counts) (counts as Record<string, number>)[f.severity]++;
    }

    // 4. Persist findings + scan
    const findingDocs = rawFindings.map(f => new Finding({ scanId: scan._id, ...f }));
    await Finding.insertMany(findingDocs);

    scan.status = 'complete';
    scan.score = score;
    scan.grade = grade;
    scan.summary = counts;
    scan.completedAt = new Date();
    await scan.save();

    sendEvent('done', { scanId: scan._id, grade, score, summary: counts });

  } catch (err) {
    console.error('Scan streaming error:', err);
    scan.status = 'error';
    await scan.save();
    sendEvent('error', { message: (err as Error).message || 'An error occurred during scan.' });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
}

export async function getScan(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid Scan ID.' });
  }

  try {
    const scan = await Scan.findById(id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }
    const findings = await Finding.find({ scanId: scan._id });
    return res.status(200).json({ scan, findings });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch scan report.' });
  }
}
