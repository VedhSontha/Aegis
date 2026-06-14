import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Scan } from '../models/Scan.model';
import { Finding } from '../models/Finding.model';
import { analyzeScan, AiConfigError } from '../services/ai.service';

export async function analyzeScanController(req: Request, res: Response) {
  const { scanId } = req.body as { scanId?: string };

  if (!scanId || !Types.ObjectId.isValid(scanId)) {
    return res.status(400).json({ error: 'A valid scanId is required.' });
  }

  try {
    const scan = await Scan.findById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const findings = await Finding.find({ scanId: scan._id });

    const analysis = await analyzeScan({
      target: scan.target,
      score: scan.score ?? 0,
      grade: scan.grade ?? 'F',
      findings: findings.map((f) => ({
        title: f.title,
        severity: f.severity,
        category: f.category,
        passed: f.passed,
        evidence: f.evidence
      }))
    });

    return res.json({ analysis });
  } catch (error) {
    if (error instanceof AiConfigError) {
      return res.status(503).json({ error: error.message, code: 'AI_NOT_CONFIGURED' });
    }
    console.error('AI analysis failed:', error);
    return res.status(502).json({ error: (error as Error).message || 'AI analysis failed.' });
  }
}
