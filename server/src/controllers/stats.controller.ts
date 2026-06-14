import { Request, Response } from 'express';
import { Scan } from '../models/Scan.model';
import { Finding } from '../models/Finding.model';

export async function getStats(req: Request, res: Response) {
  try {
    const totalScans = await Scan.countDocuments({ status: 'complete' });
    const totalFindings = await Finding.countDocuments({ passed: false });

    // Most common vulnerability aggregation
    const common = await Finding.aggregate([
      { $match: { passed: false } },
      { $group: { _id: '$title', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const mostCommonVuln = common.length > 0 ? common[0]._id : 'Content Security Policy (CSP)';

    // Recent scans
    const recentScans = await Scan.find({ status: 'complete' })
      .sort({ createdAt: -1 })
      .limit(5);

    const recent = recentScans.map(s => {
      let host = s.target;
      if (s.targetType === 'url') {
        try {
          const u = new URL(s.target);
          host = u.hostname;
        } catch (e) {
          // fallback
        }
      } else {
        host = s.target.replace('github:', '');
      }

      // Mask hostname for anonymity
      let masked = host;
      if (host.includes('.')) {
        const parts = host.split('.');
        const domain = parts[parts.length - 2];
        const tld = parts[parts.length - 1];
        if (domain && domain.length > 2) {
          parts[parts.length - 2] = domain.slice(0, 2) + '***';
        }
        masked = parts.join('.');
      } else if (host.includes('/')) {
        // github:owner/repo -> owner/re***
        const parts = host.split('/');
        if (parts[1] && parts[1].length > 2) {
          parts[1] = parts[1].slice(0, 2) + '***';
        }
        masked = parts.join('/');
      }

      return {
        targetMasked: masked,
        grade: s.grade,
        score: s.score,
        createdAt: s.createdAt
      };
    });

    return res.status(200).json({
      totalScans,
      totalFindings,
      mostCommonVuln,
      recent
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch platform metrics.' });
  }
}
