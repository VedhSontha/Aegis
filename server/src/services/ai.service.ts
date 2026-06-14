/**
 * AEGIS AI Security Analyst
 * Sends the real scan findings to Gemini and returns a structured, prioritized
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

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1);
  return text.trim();
}

export async function analyzeScan(input: AiAnalysisInput): Promise<AiAnalysis> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new AiConfigError(
      'AI Analyst is not configured. Add GEMINI_API_KEY to the server environment to enable it.'
    );
  }

  const model = process.env.AEGIS_AI_MODEL || 'gemini-2.0-flash';
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  let resp: globalThis.Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.3,
          // Force pure JSON so we never get markdown fences or prose wrappers.
          responseMimeType: 'application/json',
          // gemini-2.5-* burns "thinking" tokens against maxOutputTokens, which was
          // truncating the JSON mid-string. Disable thinking for a fast, complete reply.
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });
  } catch (err) {
    throw new Error(`Could not reach the Gemini API: ${(err as Error).message}`);
  }

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${body.slice(0, 240)}`);
  }

  const data: any = await resp.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const parsed = JSON.parse(extractJson(text)) as AiAnalysis;
    if (!parsed.riskLevel) parsed.riskLevel = gradeToRisk(input.grade);
    if (!Array.isArray(parsed.priorities)) parsed.priorities = [];
    return parsed;
  } catch {
    return {
      headline: `Security posture for ${input.target}`,
      riskLevel: gradeToRisk(input.grade),
      summary: text || 'The AI analyst could not produce a structured briefing for this scan.',
      priorities: []
    };
  }
}
