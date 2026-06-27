import { Check, CheckResult } from './index';
import { ScanContext } from '../services/fetcher.service';

export const disclosureCheck: Check = {
  id: 'disclosure',
  category: 'disclosure',
  title: 'Server information disclosure',
  severity: 'low',
  weight: 1.0,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    const server = ctx.headers['server'];
    const poweredBy = ctx.headers['x-powered-by'];
    const versionRegex = /\/?\d+\.\d+/;
    const disclosures: string[] = [];
    
    const aspnetVersion = ctx.headers['x-aspnet-version'];
    const mvcVersion = ctx.headers['x-aspnetmvc-version'];

    if (server && versionRegex.test(server)) {
      disclosures.push(`Server header exposes version: "${server}"`);
    }

    if (poweredBy && versionRegex.test(poweredBy)) {
      disclosures.push(`X-Powered-By header exposes version: "${poweredBy}"`);
    }

    if (aspnetVersion) {
      disclosures.push(`X-AspNet-Version header exposes version: "${aspnetVersion}"`);
    }

    if (mvcVersion) {
      disclosures.push(`X-AspNetMvc-Version header exposes version: "${mvcVersion}"`);
    }

    if (disclosures.length > 0) {
      return {
        passed: false,
        evidence: disclosures.join('; '),
        fix: {
          text: 'Disable server signature tokens in your server configurations (e.g. expose Server header as "nginx" or "express" without exact versions, and disable ASP.NET version headers).',
          code: 'Nginx: server_tokens off;\nExpress: app.disable("x-powered-by");\nASP.NET Web.config: <httpRuntime enableVersionHeader="false" /> & <httpProtocol><customHeaders><remove name="X-AspNetMvc-Version" /></customHeaders></httpProtocol>',
          lang: 'http'
        }
      };
    }

    const serverVal = server ? `Server: "${server}"` : '';
    const pbVal = poweredBy ? `X-Powered-By: "${poweredBy}"` : '';
    return {
      passed: true,
      evidence: `No version details exposed. ${[serverVal, pbVal].filter(Boolean).join(', ')}`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};
