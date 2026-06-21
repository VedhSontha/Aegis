import { ScanContext } from '../services/fetcher.service';
import { cspCheck, hstsCheck, xfoCheck, xctoCheck, refpolCheck, permpolCheck } from './headers.check';
import { httpsPresentCheck, httpsRedirectCheck, certValidCheck } from './tls.check';
import { cookieSecurityCheck } from './cookies.check';
import { corsCheck } from './cors.check';
import { disclosureCheck } from './disclosure.check';
import { clickjackCheck } from './clickjack.check';
import { xssReflectedCheck } from './xss.check';
import { dependencyCheck } from './deps.check';

export type FindingCategory =
  | 'headers' | 'transport' | 'cookies' | 'cors' | 'disclosure' | 'clickjacking'
  | 'dependencies' | 'xss' | 'secrets' | 'code';

export type FixLang = 'http' | 'javascript' | 'bash' | 'yaml' | 'python' | 'sql' | 'text';

export interface CheckResult {
  passed: boolean;
  evidence: string;
  fix: {
    text: string;
    code: string;
    lang: FixLang;
  };
  descriptionOverride?: string;
}

export interface Check {
  id: string;
  category: FindingCategory;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  weight: number;
  run(ctx: ScanContext): Promise<CheckResult>;
}

// Registry containing all passive URL and active repo checks
export const checkRegistry: Check[] = [
  // Transport
  httpsPresentCheck,
  httpsRedirectCheck,
  certValidCheck,
  // Headers
  cspCheck,
  hstsCheck,
  xfoCheck,
  xctoCheck,
  refpolCheck,
  permpolCheck,
  // Cookies
  cookieSecurityCheck,
  // CORS
  corsCheck,
  // Disclosure
  disclosureCheck,
  // Clickjacking
  clickjackCheck,
  // Reflected XSS
  xssReflectedCheck,
  // Dependencies
  dependencyCheck
];

export async function runChecks(
  ctx: ScanContext,
  onCheckCompleted?: (checkId: string, result: CheckResult & { check: Check }) => void
): Promise<Array<CheckResult & { check: Check }>> {
  const results: Array<CheckResult & { check: Check }> = [];
  const concurrencyLimit = 4; // safe limit
  
  // Iterate and run checks respect concurrency
  const chunks: Check[][] = [];
  for (let i = 0; i < checkRegistry.length; i += concurrencyLimit) {
    chunks.push(checkRegistry.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (check) => {
        try {
          const result = await check.run(ctx);
          const fullResult = { ...result, check };
          results.push(fullResult);
          if (onCheckCompleted) {
            onCheckCompleted(check.id, fullResult);
          }
        } catch (error) {
          const errorResult = {
            passed: false,
            evidence: `Check encountered unexpected run error: ${(error as Error).message}`,
            fix: { text: 'Contact scanner system administrator.', code: '', lang: 'bash' as const },
            check
          };
          results.push(errorResult);
          if (onCheckCompleted) {
            onCheckCompleted(check.id, errorResult);
          }
        }
      })
    );
  }

  return results;
}
