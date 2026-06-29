import { Check, CheckResult } from './index';
import { ScanContext } from '../services/fetcher.service';

export const clickjackCheck: Check = {
  id: 'clickjack',
  category: 'clickjacking',
  title: 'Clickjacking framing protection',
  severity: 'medium',
  weight: 1.3,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    const xfo = ctx.headers['x-frame-options'];
    const csp = ctx.headers['content-security-policy'];
    const frameAncestors = csp && csp.includes('frame-ancestors');

    if (!xfo && !frameAncestors) {
      return {
        passed: false,
        evidence: 'No X-Frame-Options or CSP frame-ancestors found. The page can be embedded in an iframe.',
        fix: {
          text: 'Add X-Frame-Options or a Content-Security-Policy with frame-ancestors directive to explicitly deny framing by third-party origins.',
          code: 'X-Frame-Options: DENY\nContent-Security-Policy: frame-ancestors \'none\';',
          lang: 'http'
        }
      };
    }

    if (xfo) {
      const xfoVal = xfo.toLowerCase().trim();
      if (xfoVal === 'allowall' || xfoVal.startsWith('allow-from')) {
        const isAllowAll = xfoVal === 'allowall';
        return {
          passed: false,
          evidence: isAllowAll 
            ? 'X-Frame-Options set to insecure ALLOWALL directive, permitting framing by any site.'
            : `X-Frame-Options uses deprecated and ignored ALLOW-FROM directive ("${xfo}").`,
          fix: {
            text: 'Replace obsolete X-Frame-Options values with DENY or SAMEORIGIN, or migrate to the CSP frame-ancestors directive.',
            code: 'X-Frame-Options: SAMEORIGIN\nContent-Security-Policy: frame-ancestors \'self\';',
            lang: 'http'
          }
        };
      }
    }

    return {
      passed: true,
      evidence: xfo ? `Framing blocked by X-Frame-Options: "${xfo}"` : 'Framing blocked by CSP frame-ancestors directive.',
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};
