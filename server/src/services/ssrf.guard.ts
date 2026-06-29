import dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';

const lookup = promisify(dns.lookup);

export function isPrivateIP(ip: string): boolean {
  if (process.env.ALLOW_LOCAL_SCANS === 'true') {
    return false;
  }

  let cleanIp = ip.trim().toLowerCase();
  if (cleanIp.startsWith('[') && cleanIp.endsWith(']')) {
    cleanIp = cleanIp.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 format (e.g. ::ffff:127.0.0.1)
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }

  // IPv4 Loopback, Localhost, Private, and CGNAT ranges
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '0.0.0.0' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('127.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('169.254.') ||
    cleanIp.startsWith('100.64.')
  ) {
    return true;
  }

  // IPv4 172.16.0.0 - 172.31.255.255
  if (cleanIp.startsWith('172.')) {
    const parts = cleanIp.split('.').map(Number);
    if (parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
  }

  // IPv6 check
  if (
    cleanIp === '::1' ||
    cleanIp === '0:0:0:0:0:0:0:1' ||
    cleanIp.startsWith('fe80:') ||
    cleanIp.startsWith('fc00:') ||
    cleanIp.startsWith('fd00:')
  ) {
    return true;
  }

  return false;
}

export async function validateTargetURL(urlString: string): Promise<{ valid: boolean; error?: string; parsedUrl?: URL }> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    return { valid: false, error: 'Invalid URL format.' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are supported.' };
  }

  const hostname = parsedUrl.hostname;
  if (!hostname) {
    return { valid: false, error: 'URL must contain a valid hostname.' };
  }

  // Check if hostname is an direct private IP
  if (isPrivateIP(hostname)) {
    return { valid: false, error: 'SSRF Alert: Scanning local or private network ranges is prohibited.' };
  }

  try {
    const { address } = await lookup(hostname);
    if (isPrivateIP(address)) {
      return { valid: false, error: 'SSRF Alert: Target hostname resolves to a local or private IP address.' };
    }
  } catch (err) {
    return { valid: false, error: `Failed to resolve target hostname: ${hostname}` };
  }

  return { valid: true, parsedUrl };
}
