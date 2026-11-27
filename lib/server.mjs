import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, humanUpdate } from './workspace.mjs';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' };
const UI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dashboard', 'index.html');

export function createServer(ws) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(UI));
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        return json(res, 200, { workspace: ws, ...load(ws) });
      }
      if (req.method === 'GET' && url.pathname.startsWith('/assets/')) {
        // Only files inside <workspace>/assets, never anything else.
        const root = path.join(ws, 'assets');
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname.slice('/assets'.length)));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: 'not found' });
        res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache', 'content-security-policy': "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'", 'x-content-type-options': 'nosniff' });
        return fs.createReadStream(file).pipe(res);
      }
      const m = url.pathname.match(/^\/api\/items\/([^/]+)$/);
      if (req.method === 'POST' && m) {
        // Dashboard is local-only; reject cross-site requests from other pages.
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'cross-origin' });
        const body = JSON.parse(await readBody(req) || '{}');
        return json(res, 200, humanUpdate(ws, decodeURIComponent(m[1]), body));
      }
      json(res, 404, { error: 'not found' });
    } catch (e) {
      json(res, e.code && Number.isInteger(e.code) ? e.code : 500, { error: e.message });
    }
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 1e6) reject(new Error('too large')); });
    req.on('end', () => resolve(s));
    req.on('error', reject);
  });
}
