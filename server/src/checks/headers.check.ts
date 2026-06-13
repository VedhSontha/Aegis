import { Check, CheckResult } from './index';
import { ScanContext } from '../services/fetcher.service';

export const cspCheck: Check = {
  id: 'csp',
  category: 'headers',
  title: 'Content Security Policy (CSP)',
  severity: 'high',
  weight: 1.4,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    const csp = ctx.headers['content-security-policy'];
    if (!csp) {
      return {
        passed: false,
        evidence: 'Content-Security-Policy header is missing in response.',
        fix: {
          text: 'Define a strict Content-Security-Policy to restrict resource loading and mitigate XSS risks.',
          code: "Content-Security-Policy: default-src 'self';",
          lang: 'http'
        }
      };
    }

    if (csp.includes("'unsafe-inline'") && !csp.includes("'nonce-") && !csp.includes("'hash-")) {
      return {
        passed: false,
        evidence: `CSP found but contains unsafe policy: "${csp}"`,
        fix: {
          text: 'Remove the unsafe-inline directive or restrict it using cryptographic nonces or hashes.',
          code: "Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-rAnd0m123';",
          lang: 'http'
        }
      };
    }

    return {
      passed: true,
      evidence: `CSP present and enforced: "${csp.slice(0, 50)}${csp.length > 50 ? '...' : ''}"`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};

export const hstsCheck: Check = {
  id: 'hsts',
  category: 'headers',
  title: 'HTTP Strict Transport Security (HSTS)',
  severity: 'high',
  weight: 1.2,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    const hsts = ctx.headers['strict-transport-security'];
    if (!hsts) {
      return {
        passed: false,
        evidence: 'Strict-Transport-Security header is missing.',
        fix: {
          text: 'Enforce HTTPS connections by adding the HSTS header to instruct browsers to never use HTTP.',
          code: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
          lang: 'http'
        }
      };
    }

    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
    if (maxAge < 15552000) {
      return {
        passed: false,
        evidence: `HSTS present but has short max-age (${maxAge}s): "${hsts}"`,
        fix: {
          text: 'Configure the HSTS max-age to at least 6 months (15,552,000 seconds). Recommended: 1 year.',
          code: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
          lang: 'http'
        }
      };
    }

    return {
      passed: true,
      evidence: `HSTS present and secure: "${hsts}"`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};

export const xfoCheck: Check = {
  id: 'xfo',
  category: 'headers',
  title: 'X-Frame-Options framing policy',
  severity: 'medium',
  weight: 1.2,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    const xfo = ctx.headers['x-frame-options'];
    const csp = ctx.headers['content-security-policy'];
    const frameAncestors = csp && csp.includes('frame-ancestors');

    if (!xfo && !frameAncestors) {
      return {
        passed: false,
        evidence: 'Neither X-Frame-Options nor CSP frame-ancestors is present.',
        fix: {
          text: 'Protect the page from clickjacking attacks by blocking it from being framed on other origins.',
          code: 'X-Frame-Options: DENY',
          lang: 'http'
        }
      };
    }

    return {
      passed: true,
      evidence: xfo ? `X-Frame-Options: "${xfo}"` : 'CSP frame-ancestors enforced.',
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};

export const xctoCheck: Check = {
  id: 'xcto',
  category: 'headers',
  title: 'X-Content-Type-Options MIME sniffing',
  severity: 'low',
  weight: 1.0,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    const xcto = ctx.headers['x-content-type-options'];
    if (!xcto || xcto.toLowerCase() !== 'nosniff') {
      return {
        passed: false,
        evidence: xcto ? `Invalid X-Content-Type-Options: "${xcto}"` : 'X-Content-Type-Options is missing.',
        fix: {
          text: 'Prevent browsers from MIME-sniffing response content-types by configuring the nosniff directive.',
          code: 'X-Content-Type-Options: nosniff',
          lang: 'http'
        }
      };
    }

    return {
      passed: true,
      evidence: `X-Content-Type-Options: "${xcto}"`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};

export const refpolCheck: Check = {
  id: 'refpol',
  category: 'headers',
  title: 'Referrer Policy security configuration',
  severity: 'low',
  weight: 1.0,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    const refpol = ctx.headers['referrer-policy'];
    if (!refpol) {
      return {
        passed: false,
        evidence: 'Referrer-Policy header is missing in response.',
        fix: {
          text: 'Configure Referrer-Policy to prevent leaking sensitive request path parameters to third-party assets.',
          code: 'Referrer-Policy: strict-origin-when-cross-origin',
          lang: 'http'
        }
      };
    }

    return {
      passed: true,
      evidence: `Referrer-Policy: "${refpol}"`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};

export const permpolCheck: Check = {
  id: 'permpol',
  category: 'headers',
  title: 'Permissions Policy feature isolation',
  severity: 'low',
  weight: 1.0,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    const permpol = ctx.headers['permissions-policy'];
    if (!permpol) {
      return {
        passed: false,
        evidence: 'Permissions-Policy header is missing in response.',
        fix: {
          text: 'Limit browser API access (camera, geo, microphone) using Permissions-Policy.',
          code: 'Permissions-Policy: camera=(), microphone=(), geolocation=()',
          lang: 'http'
        }
      };
    }

    return {
      passed: true,
      evidence: `Permissions-Policy: "${permpol}"`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};
