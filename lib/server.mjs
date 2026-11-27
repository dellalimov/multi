import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { load, humanUpdate, parse } from './workspace.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI = path.join(ROOT, 'dashboard', 'index.html');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' };
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

// Security headers for every response.
const BASE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

// The page's only script is inline; allow exactly that script by hash, nothing else.
function uiWithCsp() {
  const html = fs.readFileSync(UI, 'utf8');
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`);
  const csp = [
    "default-src 'none'", `script-src ${hashes.join(' ')}`, "style-src 'unsafe-inline'",
    "img-src 'self' https: data:", "media-src 'self' https:", "connect-src 'self'",
    "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
  ].join('; ');
  return { html, csp };
}

export function loadAgents(dir = path.join(ROOT, 'agents')) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const { data } = parse(text);
    const team = (text.match(/^# \S+\s+·\s+team:\s*(\S+)/m) || [])[1] || 'core';
    return { name: data.name || f.replace(/\.md$/, ''), team, model: data.model || '', description: String(data.description || '').slice(0, 240) };
  });
}

const safeEqual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const cookie = (req, name) => (String(req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(name + '=')) || '').slice(name.length + 1);

/**
 * opts.token      require this secret (cookie, set once via /?token=...). Use it whenever the dashboard is reachable from anything but this machine.
 * opts.allowHosts extra Host names to accept (e.g. a Cloudflare tunnel hostname). Localhost is always accepted.
 */
export function createServer(ws, opts = {}) {
  const allow = new Set([...LOCAL, ...(opts.allowHosts || []).map(h => h.toLowerCase())]);
  const token = opts.token || '';
  const agents = loadAgents();
  return http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(BASE_HEADERS)) res.setHeader(k, v);
    try {
      // 1. DNS-rebinding guard: only answer to known Host names.
      const hostname = String(req.headers.host || '').replace(/:\d+$/, '').toLowerCase();
      if (!allow.has(hostname)) return json(res, 403, { error: 'host not allowed' });
      const url = new URL(req.url, 'http://localhost');

      // 2. Optional token gate.
      if (token) {
        const q = url.searchParams.get('token');
        if (req.method === 'GET' && url.pathname === '/' && q && safeEqual(q, token)) {
          const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
          res.writeHead(302, { 'set-cookie': `multi_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure}`, location: '/' });
          return res.end();
        }
        if (!safeEqual(cookie(req, 'multi_token'), token)) return json(res, 401, { error: 'unauthorized: open the dashboard link that includes ?token=' });
      }

      if (req.method === 'GET' && url.pathname === '/') {
        const { html, csp } = uiWithCsp();
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': csp, 'cache-control': 'no-store' });
        return res.end(html);
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        return json(res, 200, { workspace: ws, agents, ...load(ws) });
      }
      if (req.method === 'GET' && url.pathname.startsWith('/assets/')) {
        // Only files inside <workspace>/assets, never anything else.
        const root = path.join(ws, 'assets');
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname.slice('/assets'.length)));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: 'not found' });
        res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache', 'content-security-policy': "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'" });
        return fs.createReadStream(file).pipe(res);
      }
      const m = url.pathname.match(/^\/api\/items\/([^/]+)$/);
      if (req.method === 'POST' && m) {
        // 3. CSRF guard: same origin only, JSON only (a cross-site form cannot send application/json without a blocked preflight).
        const origin = req.headers.origin;
        if (origin && origin !== 'null' && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'cross-origin' });
        if (origin === 'null' || req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { error: 'cross-origin' });
        if (!/^application\/json\b/.test(String(req.headers['content-type'] || ''))) return json(res, 415, { error: 'send application/json' });
        let body;
        try { body = JSON.parse(await readBody(req) || '{}'); } catch { return json(res, 400, { error: 'invalid JSON' }); }
        const clean = {};
        if (typeof body.status === 'string') clean.status = body.status;
        if (typeof body.note === 'string') clean.note = body.note.slice(0, 2000);
        if (typeof body.body === 'string') clean.body = body.body;
        return json(res, 200, humanUpdate(ws, decodeURIComponent(m[1]), clean));
      }
      json(res, 404, { error: 'not found' });
    } catch (e) {
      json(res, e.code && Number.isInteger(e.code) ? e.code : 500, { error: Number.isInteger(e.code) ? e.message : 'server error' });
    }
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e6) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => resolve(s));
    req.on('error', reject);
  });
}
