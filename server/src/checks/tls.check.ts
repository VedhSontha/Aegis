import { Check, CheckResult } from './index';
import { ScanContext } from '../services/fetcher.service';

export const httpsPresentCheck: Check = {
  id: 'https-present',
  category: 'transport',
  title: 'Enforced HTTPS connection',
  severity: 'high',
  weight: 1.5,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    if (ctx.protocol !== 'https') {
      return {
        passed: false,
        evidence: `Target protocol is unencrypted: "${ctx.protocol}://"`,
        fix: {
          text: 'Acquire a TLS/SSL certificate and redirect all incoming HTTP traffic to HTTPS.',
          code: 'Redirect: http://hostname -> https://hostname',
          lang: 'http'
        }
      };
    }

    return {
      passed: true,
      evidence: 'SSL/TLS transport connection in use.',
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};

export const httpsRedirectCheck: Check = {
  id: 'https-redirect',
  category: 'transport',
  title: 'Automatic HTTP to HTTPS redirect',
  severity: 'medium',
  weight: 1.0,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    // If the scanned URL was HTTP, did it redirect to HTTPS?
    // If the scanned URL was HTTPS, did it redirect properly?
    const isUrlHttp = ctx.url.startsWith('http://');
    
    if (isUrlHttp) {
      const redirectedToHttps = ctx.redirectChain.length > 0 && ctx.finalUrl.startsWith('https://');
      if (!redirectedToHttps && ctx.protocol !== 'https') {
        return {
          passed: false,
          evidence: `HTTP endpoint did not redirect to HTTPS. Final target: ${ctx.finalUrl}`,
          fix: {
            text: 'Configure your web server (nginx, node, IIS) to automatically redirect all HTTP ports (80) to HTTPS ports (443).',
            code: 'status: 301 Moved Permanently\nLocation: https://$host$request_uri',
            lang: 'http'
          }
        };
      }
    }

    return {
      passed: true,
      evidence: 'Automatic redirection to HTTPS is active or target was queried directly via HTTPS.',
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};

export const certValidCheck: Check = {
  id: 'cert-valid',
  category: 'transport',
  title: 'SSL/TLS certificate validity',
  severity: 'medium',
  weight: 1.0,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    if (ctx.protocol !== 'https') {
      return {
        passed: true, // Not applicable since HTTPS is absent (captured by https-present)
        evidence: 'No active TLS session to validate.',
        fix: { text: '', code: '', lang: 'http' }
      };
    }

    if (!ctx.tls) {
      return {
        passed: false,
        evidence: 'Failed to retrieve or read peer SSL/TLS certificate.',
        fix: {
          text: 'Ensure your server is configured with a valid, non-expired, and trusted SSL certificate.',
          code: 'Certificate Action: Re-issue/Renew SSL Certificate',
          lang: 'bash'
        }
      };
    }

    if (!ctx.tls.valid) {
      return {
        passed: false,
        evidence: `Invalid or self-signed certificate. Issuer: ${ctx.tls.issuer || 'Unknown'}`,
        fix: {
          text: 'Deploy a certificate signed by a trusted root Certificate Authority (CA) such as Let\'s Encrypt.',
          code: 'certbot --nginx -d domain.com',
          lang: 'bash'
        }
      };
    }

    // Expiry check (alert if less than 15 days)
    if (ctx.tls.validTo) {
      const expiryDate = new Date(ctx.tls.validTo);
      const daysLeft = Math.round((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 15) {
        return {
          passed: false,
          evidence: `Certificate valid but expiring soon in ${daysLeft} days (Expires: ${ctx.tls.validTo})`,
          fix: {
            text: 'Renew the SSL/TLS certificate before it expires to prevent client connection errors.',
            code: 'certbot renew',
            lang: 'bash'
          }
        };
      }
    }

    // Protocol strength check
    if (ctx.tls.protocol) {
      const weakProtocols = ['TLSv1', 'TLSv1.1', 'SSLv3', 'SSLv2'];
      const isWeak = weakProtocols.some(p => ctx.tls?.protocol?.includes(p));
      if (isWeak) {
        return {
          passed: false,
          evidence: `Negotiated weak TLS protocol version: "${ctx.tls.protocol}" (Cipher: ${ctx.tls.cipher || 'Unknown'})`,
          fix: {
            text: 'Disable TLS v1.0 and TLS v1.1 on your server; enforce TLS v1.2 or TLS v1.3 only.',
            code: 'ssl_protocols TLSv1.2 TLSv1.3;',
            lang: 'bash' as const
          }
        };
      }
    }

    const protoDetails = ctx.tls.protocol ? ` via ${ctx.tls.protocol} (${ctx.tls.cipher || 'Unknown'})` : '';
    return {
      passed: true,
      evidence: `Valid certificate${protoDetails}. Issuer: "${ctx.tls.issuer || 'Unknown'}". Expires: ${ctx.tls.validTo || 'Unknown'}`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};
