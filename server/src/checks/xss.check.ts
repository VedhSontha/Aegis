import { Check, CheckResult } from './index';
import { ScanContext } from '../services/fetcher.service';

// A marker unlikely to appear naturally. If "<MARKER>" comes back verbatim, the
// app reflected our input without HTML-encoding it — a reflected-XSS sink.
const MARKER = 'aegisXSS7731';
const PAYLOAD = `"'<${MARKER}>`;
const MAX_PARAM_PROBES = 8;

export const xssReflectedCheck: Check = {
  id: 'xss-reflected',
  category: 'xss',
  title: 'Reflected XSS (unescaped input reflection)',
  severity: 'high',
  weight: 1.4,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    let url: URL;
    try {
      url = new URL(ctx.finalUrl || ctx.url);
    } catch {
      return {
        passed: true,
        evidence: 'Target URL could not be parsed for XSS probing.',
        fix: { text: '', code: '', lang: 'http' }
      };
    }

    let paramNames = [...url.searchParams.keys()];
    let usingDefaultProbes = false;
    if (paramNames.length === 0) {
      paramNames = ['q', 'query', 'search', 'id', 'redirect', 'url', 'callback'];
      usingDefaultProbes = true;
    }

    const reflected: string[] = [];
    const names = paramNames.slice(0, MAX_PARAM_PROBES);

    for (const name of names) {
      const probe = new URL(url.toString());
      probe.searchParams.set(name, PAYLOAD);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(probe.toString(), {
          method: 'GET',
          signal: controller.signal,
          headers: { 'User-Agent': 'AEGIS-Security-Scanner/1.0' }
        });
        clearTimeout(timeout);
        const body = await res.text();
        if (body.includes(`<${MARKER}>`)) {
          reflected.push(name);
        }
      } catch {
        // ignore individual probe failures
      }
    }

    if (reflected.length > 0) {
      return {
        passed: false,
        evidence: `Parameter(s) reflect input unescaped: ${reflected.join(', ')} (raw <${MARKER}> echoed in response).`,
        fix: {
          text: 'Context-encode all user input before rendering it into HTML, and add a strict Content-Security-Policy as defense in depth.',
          code: `// Encode on output (example)\nimport { escape } from 'lodash';\nelement.textContent = userInput;        // safe\nelement.innerHTML = escape(userInput); // if HTML is required`,
          lang: 'javascript'
        }
      };
    }

    return {
      passed: true,
      evidence: usingDefaultProbes
        ? `Probed ${names.length} common parameter(s) (${names.join(', ')}); no input reflection detected.`
        : `Probed ${names.length} parameter(s); inputs were encoded or not reflected.`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};
