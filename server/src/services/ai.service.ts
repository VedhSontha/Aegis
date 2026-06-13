/**
 * AEGIS AI Security Analyst
 * Sends the real scan findings to Claude and returns a structured, prioritized
 * security briefing. Uses native fetch (Node 18+) — no SDK dependency.
 */

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigError';
  }
}

export interface AiFinding {
  title: string;
  severity: string;
  category: string;
  passed: boolean;
  evidence: string;
}

export interface AiAnalysisInput {
  target: string;
  score: number;
  grade: string;
  findings: AiFinding[];
}

export interface AiPriority {
  title: string;
  severity: string;
  attack: string;
  impact: string;
  action: string;
}

export interface AiAnalysis {
  headline: string;
  riskLevel: 'Critical' | 'High' | 'Moderate' | 'Low';
  summary: string;
  priorities: AiPriority[];
}

function gradeToRisk(grade: string): AiAnalysis['riskLevel'] {
  if (grade.startsWith('A')) return 'Low';
  if (grade.startsWith('B')) return 'Moderate';
  if (grade.startsWith('C') || grade.startsWith('D')) return 'High';
  return 'Critical';
}

/** Pull a JSON object out of a model response that may include prose or code fences. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1);
  return text.trim();
}

export async function analyzeScan(input: AiAnalysisInput): Promise<AiAnalysis> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new AiConfigError(
      'AI Analyst is not configured. Add ANTHROPIC_API_KEY to the server environment to enable it.'
    );
  }

  const model = process.env.AEGIS_AI_MODEL || 'claude-sonnet-4-6';
  const failed = input.findings.filter((f) => !f.passed);
  const findingList =
    failed.map((f) => `- [${f.severity}] ${f.title} (${f.category}) — ${f.evidence}`).join('\n') ||
    'No failing checks were detected.';

  const prompt = `You are AEGIS, a senior application security analyst writing a briefing for an engineering team.

A security scan of ${input.target} scored ${input.score}/100 (grade ${input.grade}).

Failing checks:
${findingList}

Respond with ONLY valid JSON (no markdown, no code fences) in exactly this shape:
{
  "headline": string,
  "riskLevel": "Critical" | "High" | "Moderate" | "Low",
  "summary": string,
  "priorities": [ { "title": string, "severity": string, "attack": string, "impact": string, "action": string } ]
}

Rules:
- "headline": one punchy sentence describing the overall security posture.
- "summary": 2-3 sentences, executive tone, no fluff.
- "priorities": 3 to 5 items, ordered by real-world exploitability with the most urgent first.
   - "attack": concretely how an attacker abuses this weakness.
   - "impact": the business/user consequence if exploited.
   - "action": the single most important remediation step.
- Be specific to the findings above. Do not invent issues that are not listed.`;

  let resp: Response;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1300,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  } catch (err) {
    throw new Error(`Could not reach the Anthropic API: ${(err as Error).message}`);
  }

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Anthropic API error (${resp.status}): ${body.slice(0, 240)}`);
  }

  const data: any = await resp.json();
  const text: string = data?.content?.[0]?.text ?? '';

  try {
    const parsed = JSON.parse(extractJson(text)) as AiAnalysis;
    if (!parsed.riskLevel) parsed.riskLevel = gradeToRisk(input.grade);
    if (!Array.isArray(parsed.priorities)) parsed.priorities = [];
    return parsed;
  } catch {
    // Model returned prose instead of JSON — degrade gracefully.
    return {
      headline: `Security posture for ${input.target}`,
      riskLevel: gradeToRisk(input.grade),
      summary: text || 'The AI analyst could not produce a structured briefing for this scan.',
      priorities: []
    };
  }
}
