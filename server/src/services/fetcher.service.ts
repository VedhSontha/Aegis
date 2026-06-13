import tls from 'tls';
import { URL } from 'url';

export interface ScanContext {
  url: string;
  finalUrl: string;
  protocol: 'http' | 'https';
  redirectChain: string[];
  status: number;
  headers: Record<string, string>;
  setCookies: string[];
  bodySnippet: string;
  tls: { valid: boolean; issuer?: string; validTo?: string } | null;
}

function getTlsInfo(host: string, port = 443): Promise<ScanContext['tls']> {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(
        {
          host,
          port,
          servername: host, // SNI support
          rejectUnauthorized: false // Allow checking invalid/expired certs
        },
        () => {
          const cert = socket.getPeerCertificate();
          const authorized = socket.authorized;
          socket.end();
          if (!cert || Object.keys(cert).length === 0) {
            resolve(null);
          } else {
            resolve({
              valid: authorized,
              issuer: typeof cert.issuer === 'object' ? (Array.isArray(cert.issuer.O) ? cert.issuer.O[0] : cert.issuer.O) || (Array.isArray(cert.issuer.CN) ? cert.issuer.CN[0] : cert.issuer.CN) : undefined,
              validTo: cert.valid_to
            });
          }
        }
      );

      socket.setTimeout(3000);
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });

      socket.on('error', () => {
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

export async function fetchScanContext(targetUrl: string, timeoutMs = 8000): Promise<ScanContext> {
  let currentUrl = targetUrl;
  const redirectChain: string[] = [];
  let status = 200;
  let headers: Record<string, string> = {};
  const setCookies: string[] = [];
  let bodySnippet = '';
  let finalUrl = targetUrl;

  const maxRedirects = 5;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'AEGIS-Security-Scanner/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      clearTimeout(timeout);
      status = res.status;

      // Extract headers (lowercased)
      const currentHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        currentHeaders[key.toLowerCase()] = value;
      });
      headers = currentHeaders;

      // Track cookies
      const cookies = res.headers.get('set-cookie');
      if (cookies) {
        // Fetch handles multi-value cookies, but node fetch standard compiles them
        setCookies.push(...cookies.split(',').map(c => c.trim()));
      }

      finalUrl = currentUrl;

      // Is redirect?
      if (status >= 300 && status < 400 && currentHeaders['location']) {
        let loc = currentHeaders['location'];
        redirectChain.push(currentUrl);

        // Resolve relative redirects
        const parsedBase = new URL(currentUrl);
        const resolvedUrl = new URL(loc, parsedBase.href).href;
        
        currentUrl = resolvedUrl;
        redirectCount++;
      } else {
        // Not a redirect, read body snippet
        const text = await res.text();
        bodySnippet = text.slice(0, 50000); // First 50KB
        break;
      }
    } catch (err) {
      clearTimeout(timeout);
      if (redirectCount > 0) {
        // Fallback to last successful redirect state if next fetch fails
        break;
      }
      throw err;
    }
  }

  // Get TLS details if HTTPS
  const parsedFinalUrl = new URL(finalUrl);
  const protocol = parsedFinalUrl.protocol === 'https:' ? 'https' : 'http';
  let tlsInfo: ScanContext['tls'] = null;

  if (protocol === 'https') {
    const port = parsedFinalUrl.port ? parseInt(parsedFinalUrl.port, 10) : 443;
    tlsInfo = await getTlsInfo(parsedFinalUrl.hostname, port);
  }

  return {
    url: targetUrl,
    finalUrl,
    protocol,
    redirectChain,
    status,
    headers,
    setCookies,
    bodySnippet,
    tls: tlsInfo
  };
}
