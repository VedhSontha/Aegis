import { Request, Response } from 'express';
import { Scan } from '../models/Scan.model';
import { Finding } from '../models/Finding.model';
import { generateMarkdownReport } from '../generators/markdown.generator';
import { Types } from 'mongoose';

export async function exportMarkdown(req: Request, res: Response) {
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

    const markdown = generateMarkdownReport({ scan, findings });

    const domain = scan.target.replace('https://', '').replace('http://', '').replace('github:', '').replace(/\//g, '-');
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="aegis-audit-${domain}.md"`);
    return res.send(markdown);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate report.' });
  }
}

export async function getBadge(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid Scan ID.' });
  }

  try {
    const scan = await Scan.findById(id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const grade = scan.grade || 'F';
    let badgeColor = '#D5453B'; // Red
    
    if (grade.startsWith('A')) {
      badgeColor = '#3FB950'; // Forest Green
    } else if (grade.startsWith('B')) {
      badgeColor = '#2D6A4F'; // Muted Green
    } else if (grade.startsWith('C')) {
      badgeColor = '#B59A3E'; // Amber
    } else if (grade.startsWith('D')) {
      badgeColor = '#C6803C'; // Orange
    }

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="110" height="20" viewBox="0 0 110 20">
  <linearGradient id="b" type="linear" x1="0" y1="0" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="a">
    <rect width="110" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#a)">
    <path fill="#121817" d="M0 0h60v20H0z"/>
    <path fill="${badgeColor}" d="M60 0h50v20H60z"/>
    <path fill="url(#b)" d="M0 0h110v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="30" y="15" fill="#010101" fill-opacity=".3">AEGIS</text>
    <text x="30" y="14">AEGIS</text>
    <text x="85" y="15" fill="#010101" fill-opacity=".3">${grade}</text>
    <text x="85" y="14">${grade}</text>
  </g>
</svg>
    `.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'max-age=60');
    return res.send(svg);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate badge.' });
  }
}
