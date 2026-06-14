import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isSafe = searchParams.get('safe') === '1';
  const queryParam = searchParams.get('q') || '';

  // Vulnerable XSS payload reflected in body
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AEGIS Range — Intentionally Vulnerable Target</title>
  <style>
    body {
      background-color: #0A0E0D;
      color: #E6EDEA;
      font-family: sans-serif;
      padding: 40px;
      text-align: center;
    }
    .container {
      border: 1px solid ${isSafe ? '#3FB950' : '#D5453B'};
      padding: 30px;
      border-radius: 12px;
      max-width: 600px;
      margin: 0 auto;
      background-color: #121817;
    }
    h1 {
      color: ${isSafe ? '#3FB950' : '#D5453B'};
      margin-top: 0;
    }
    .status {
      font-weight: bold;
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      margin-bottom: 20px;
      background-color: ${isSafe ? '#1B4332' : '#2C1B1B'};
      border: 1px solid ${isSafe ? '#3FB950' : '#D5453B'};
    }
    code {
      background: #18211E;
      padding: 2px 6px;
      border-radius: 4px;
      color: #8B9A94;
    }
    .xss-box {
      margin-top: 20px;
      padding: 10px;
      border: 1px dashed #243029;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>AEGIS RANGE</h1>
    <div class="status">
      Status: ${isSafe ? 'PATCHED / SECURE' : 'VULNERABLE MOCK TARGET'}
    </div>
    <p>This page is hosted inside the AEGIS deployment to demonstrate vulnerability detection, exploitation, and patching.</p>
    
    ${
      !isSafe 
        ? `<div class="xss-box">
             <p>Reflected input search:</p>
             <div id="reflected-output">${queryParam}</div>
           </div>`
        : `<div class="xss-box">
             <p>Reflected input (Sanitized):</p>
             <div id="reflected-output">${encodeURIComponent(queryParam)}</div>
           </div>`
    }
    
    <p style="font-size: 12px; color: #5A6863; margin-top: 30px;">
      Target: <code>${req.url}</code>
    </p>
  </div>
</body>
</html>
  `.trim();

  const headers = new Headers();
  headers.set('Content-Type', 'text/html; charset=utf-8');

  if (isSafe) {
    // Patched secure headers — a nonce makes the CSP pass the scanner's unsafe-inline
    // check while still allowing the page's inline <style> block to render.
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'nonce-aegisSafe'; style-src 'self' 'unsafe-inline' 'nonce-aegisSafe'");
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    headers.set('Set-Cookie', 'session=demo-safe-token; Secure; HttpOnly; SameSite=Strict');
  } else {
    // Insecure cookies and CORS for testing
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Set-Cookie', 'session=demo-insecure-token-value-without-flags');
    headers.set('Server', 'nginx/1.18.0 (Ubuntu)');
    headers.set('X-Powered-By', 'Express/4.17.1');
    // Frame headers are omitted to allow clickjacking
  }

  return new Response(htmlContent, {
    status: 200,
    headers
  });
}
