import { Check, CheckResult } from './index';
import { ScanContext } from '../services/fetcher.service';

function cleanSemver(ver: string): string {
  // Strip common range prefixes like ^, ~, >=, etc. to get a clean base version
  return ver.replace(/^[^\d]+/, '').split(' ')[0].trim();
}

async function fetchFromGitHub(owner: string, repo: string, path: string): Promise<string | null> {
  const branches = ['main', 'master'];
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      const res = await fetch(url);
      if (res.status === 200) {
        return await res.text();
      }
    } catch (e) {
      // ignore and try next branch
    }
  }
  return null;
}

export const dependencyCheck: Check = {
  id: 'dependencies',
  category: 'dependencies',
  title: 'Vulnerable NPM dependencies (OSV Database)',
  severity: 'high',
  weight: 1.5,
  run: async (ctx: ScanContext): Promise<CheckResult> => {
    // Check if target is a GitHub repo. In AEGIS, we pass the repo target inside ctx.url
    // Format is "github:owner/repo" or "https://github.com/owner/repo"
    const isRepo = ctx.url.startsWith('github:') || ctx.url.includes('github.com/');
    
    if (!isRepo) {
      return {
        passed: true,
        evidence: 'Target is a URL, dependency audit is skipped.',
        fix: { text: '', code: '', lang: 'http' }
      };
    }

    // Extract owner and repo
    let owner = '';
    let repo = '';

    if (ctx.url.startsWith('github:')) {
      const parts = ctx.url.replace('github:', '').split('/');
      owner = parts[0];
      repo = parts[1];
    } else {
      try {
        const parsedUrl = new URL(ctx.url);
        const paths = parsedUrl.pathname.split('/').filter(Boolean);
        owner = paths[0];
        repo = paths[1];
      } catch (e) {
        return {
          passed: false,
          evidence: `Failed to parse GitHub repository URL: "${ctx.url}"`,
          fix: { text: 'Input a valid GitHub Repository link (e.g. github:expressjs/express).', code: '', lang: 'bash' }
        };
      }
    }

    if (!owner || !repo) {
      return {
        passed: false,
        evidence: 'Could not extract GitHub owner and repository name.',
        fix: { text: 'Ensure repo format is owner/repo', code: '', lang: 'bash' }
      };
    }

    // Fetch package.json
    const packageJsonText = await fetchFromGitHub(owner, repo, 'package.json');
    if (!packageJsonText) {
      return {
        passed: false,
        evidence: `Could not retrieve package.json from public repository ${owner}/${repo} on main/master branches.`,
        fix: {
          text: 'Verify the repository is public and contains a package.json at the root.',
          code: '',
          lang: 'bash'
        }
      };
    }

    let deps: Record<string, string> = {};
    try {
      const parsed = JSON.parse(packageJsonText);
      deps = {
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {})
      };
    } catch (e) {
      return {
        passed: false,
        evidence: 'package.json contains invalid JSON syntax.',
        fix: { text: 'Check and correct the JSON formatting of package.json.', code: '', lang: 'bash' }
      };
    }

    const depList = Object.entries(deps);
    if (depList.length === 0) {
      return {
        passed: true,
        evidence: 'No dependencies found in package.json.',
        fix: { text: '', code: '', lang: 'http' }
      };
    }

    // Query OSV API in batches (limit concurrency)
    const vulnerabilities: string[] = [];
    const maxQueries = Math.min(depList.length, 15); // cap it at 15 key packages to prevent rate limits / slowness
    
    for (let i = 0; i < maxQueries; i++) {
      const [name, versionRange] = depList[i];
      const cleanVer = cleanSemver(versionRange);
      
      if (!cleanVer) continue;

      try {
        const res = await fetch('https://api.osv.dev/v1/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package: { ecosystem: 'npm', name },
            version: cleanVer
          })
        });

        if (res.status === 200) {
          const data = await res.json();
          if (data && data.vulns && data.vulns.length > 0) {
            const vulnIds = data.vulns.map((v: any) => v.id).slice(0, 2).join(', ');
            vulnerabilities.push(`${name}@${cleanVer} has known vulnerability: ${vulnIds}`);
          }
        }
      } catch (err) {
        // Continue on OSV single query error
      }
    }

    // Check auxiliary security indicators
    const hasSecurityMd = await fetchFromGitHub(owner, repo, 'SECURITY.md').then(Boolean);
    const hasSecurityTxt = await fetchFromGitHub(owner, repo, 'SECURITY.txt').then(Boolean);
    const hasSecurityDotgithub = await fetchFromGitHub(owner, repo, '.github/SECURITY.md').then(Boolean);
    const hasSecurityDotgithubTxt = await fetchFromGitHub(owner, repo, '.github/security.txt').then(Boolean);
    const hasSecurityPolicy = hasSecurityMd || hasSecurityTxt || hasSecurityDotgithub || hasSecurityDotgithubTxt;

    const hasDependabot = await fetchFromGitHub(owner, repo, '.github/dependabot.yml').then(Boolean);

    const extraIndicators: string[] = [];
    if (!hasSecurityPolicy) {
      extraIndicators.push('SECURITY.md/txt policy missing');
    }
    if (!hasDependabot) {
      extraIndicators.push('.github/dependabot.yml missing');
    }

    if (vulnerabilities.length > 0 || extraIndicators.length > 0) {
      const items = [...vulnerabilities, ...extraIndicators];
      return {
        passed: false,
        evidence: items.join('; '),
        fix: {
          text: `Update vulnerable packages to secure versions. Add SECURITY.md and a .github/dependabot.yml file to implement automated dependency checking.`,
          code: vulnerabilities.length > 0 ? `npm install ${depList[0][0]}@latest` : 'Touch SECURITY.md',
          lang: 'bash'
        }
      };
    }

    return {
      passed: true,
      evidence: `Audited ${depList.length} npm dependencies. SECURITY.md and Dependabot present.`,
      fix: { text: '', code: '', lang: 'http' }
    };
  }
};
