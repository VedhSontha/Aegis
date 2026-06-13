import { Request, Response } from 'express';
import { Scan } from '../models/Scan.model';
import { Finding } from '../models/Finding.model';
import { generateShieldCode } from '../generators/shield.generator';
import { generateCiCdConfig } from '../generators/cicd.generator';
import { Types } from 'mongoose';

export async function generateShield(req: Request, res: Response) {
  const { scanId, framework } = req.body;
  if (!scanId || !framework) {
    return res.status(400).json({ error: 'scanId and framework are required.' });
  }

  if (!Types.ObjectId.isValid(scanId)) {
    return res.status(400).json({ error: 'Invalid Scan ID.' });
  }

  try {
    const scan = await Scan.findById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan report not found.' });
    }

    const failedFindings = await Finding.find({ scanId: scan._id, passed: false });
    const failedCheckIds = failedFindings.map(f => f.checkId);

    const code = generateShieldCode({
      failedCheckIds,
      targetName: scan.target,
      framework
    });

    const filename = framework === 'express' ? 'aegis-shield.js' : 'middleware.ts';
    return res.status(200).json({ filename, content: code });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate shield middleware.' });
  }
}

export async function generateCiCd(req: Request, res: Response) {
  const { scanId, platform } = req.body;
  if (!scanId || !platform) {
    return res.status(400).json({ error: 'scanId and platform are required.' });
  }

  if (!Types.ObjectId.isValid(scanId)) {
    return res.status(400).json({ error: 'Invalid Scan ID.' });
  }

  try {
    const scan = await Scan.findById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan report not found.' });
    }

    // Determine the base API URL to put into the config
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host');
    const aegisApiUrl = `${protocol}://${host}/api`;

    const code = generateCiCdConfig({
      platform,
      targetName: scan.target,
      aegisApiUrl
    });

    const filename = platform === 'github' ? '.github/workflows/aegis.yml' : '.gitlab-ci.yml';
    return res.status(200).json({ filename, content: code });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate CI/CD configuration.' });
  }
}
