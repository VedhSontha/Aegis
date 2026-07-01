import { Check, CheckResult } from './index';
import { ScanContext } from '../services/fetcher.service';

export const corsCheck: Check = {
  id: 'cors',
  category: 'cors',
  title: 'Cross-Origin Resource Sharing (CORS) wildcard configuration',
  severity: 'high',
  weight: 1.5,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    // We can check if CORS headers exist in the base ScanContext headers,
    // but a real CORS check probes with a custom Origin.
    // To keep it high-performance, we first inspect if there's any CORS header in the base response,
    // or perform a probe.
    
    // Check base response headers
    const baseOrigin = ctx.headers['access-control-allow-origin'];
    const baseCredentials = ctx.headers['access-control-allow-credentials'];

    // Real probe: request target URL with an external origin header
    let timeout: NodeJS.Timeout | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(ctx.url, {
        method: 'GET',
        headers: {
          'Origin': 'https://aegis-probe.example'
        },
        signal: controller.signal
      });
      if (timeout) clearTimeout(timeout);
      timeout = undefined;

      const allowOrigin = res.headers.get('access-control-allow-origin');
      const allowCredentials = res.headers.get('access-control-allow-credentials');

      if (allowOrigin === '*') {
        if (allowCredentials === 'true') {
          return {
            passed: false,
            evidence: 'Access-Control-Allow-Origin: * AND Access-Control-Allow-Credentials: true (Critical vulnerability)',
            fix: {
              text: 'A wildcard CORS header with credentials enabled allows arbitrary websites to read sensitive user session data. Explicitly configure trusted domains.',
              code: 'Access-Control-Allow-Origin: https://trustedapp.com\nAccess-Control-Allow-Credentials: true',
              lang: 'http'
            }
          };
        }
      }

      if (allowOrigin === 'null') {
        return {
          passed: false,
          evidence: 'Access-Control-Allow-Origin: null (permits data extraction via sandboxed iframe attacks)',
          fix: {
            text: 'Do not use "null" as the allowed origin. Explicitly specify a whitelist of trusted domains.',
            code: 'Access-Control-Allow-Origin: https://trustedapp.com',
            lang: 'http'
          }
        };
      }

      if (allowOrigin === 'https://aegis-probe.example') {
        const isCredentialed = allowCredentials === 'true';
        return {
          passed: false,
          evidence: `CORS dynamically reflects arbitrary origin ("${allowOrigin}")${isCredentialed ? ' with Access-Control-Allow-Credentials: true' : ''}`,
          fix: {
            text: 'Reflecting arbitrary Origin request headers without validating against an explicit whitelist allows any third-party script to bypass CORS.',
            code: 'CORS Action: Implement strict server-side origin whitelist validation.',
            lang: 'http'
          }
        };
      }

      if (allowOrigin) {
        return {
          passed: true,
          evidence: `CORS configured restrictively: Access-Control-Allow-Origin: "${allowOrigin}"`,
          fix: { text: '', code: '', lang: 'http' }
        };
      }
    } catch (e) {
      // Fallback to base check if probe fails
      if (baseOrigin === '*' && baseCredentials === 'true') {
        return {
          passed: false,
          evidence: 'Access-Control-Allow-Origin: * AND Access-Control-Allow-Credentials: true (Critical)',
          fix: {
            text: 'Wildcard CORS with credentials enabled allows arbitrary websites to read sensitive data.',
            code: 'Access-Control-Allow-Origin: https://trustedapp.com',
            lang: 'http'
          }
        };
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }

    return {
      passed: true,
      evidence: 'CORS origin-wildcard sharing is inactive or properly restricted.',
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};
