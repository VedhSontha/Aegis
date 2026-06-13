import { Check, CheckResult } from './index';
import { ScanContext } from '../services/fetcher.service';

export const cookieSecurityCheck: Check = {
  id: 'cookie-security',
  category: 'cookies',
  title: 'Secure session cookie directives',
  severity: 'medium',
  weight: 1.0,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    if (ctx.setCookies.length === 0) {
      return {
        passed: true,
        evidence: 'No cookies are set in the response headers.',
        fix: { text: '', code: '', lang: 'http' }
      };
    }

    const issues: string[] = [];
    let containsHttpOnlyIssue = false;
    let containsSecureIssue = false;
    let containsSameSiteIssue = false;

    for (const cookieLine of ctx.setCookies) {
      const parts = cookieLine.split(';').map(p => p.trim());
      const nameValue = parts[0];
      const cookieName = nameValue.split('=')[0];

      const hasHttpOnly = parts.some(p => p.toLowerCase() === 'httponly');
      const hasSecure = parts.some(p => p.toLowerCase() === 'secure');
      const hasSameSite = parts.some(p => p.toLowerCase().startsWith('samesite='));

      const missing: string[] = [];
      if (!hasHttpOnly) {
        missing.push('HttpOnly');
        containsHttpOnlyIssue = true;
      }
      if (!hasSecure) {
        missing.push('Secure');
        containsSecureIssue = true;
      }
      if (!hasSameSite) {
        missing.push('SameSite');
        containsSameSiteIssue = true;
      }

      if (missing.length > 0) {
        issues.push(`Cookie '${cookieName}' lacks ${missing.join(', ')}`);
      }
    }

    if (issues.length > 0) {
      const severity: 'high' | 'medium' | 'low' = containsHttpOnlyIssue
        ? 'high'
        : containsSecureIssue
        ? 'medium'
        : 'low';

      return {
        passed: false,
        evidence: issues.join('; '),
        fix: {
          text: 'Configure your web server to set HttpOnly (prevents JS access), Secure (HTTPS only), and SameSite (prevents CSRF) flags on all sensitive cookies.',
          code: 'Set-Cookie: session=token; Secure; HttpOnly; SameSite=Strict',
          lang: 'http'
        }
      };
    }

    return {
      passed: true,
      evidence: `All cookies secure: ${ctx.setCookies.map(c => c.split(';')[0]).join(', ')}`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};
