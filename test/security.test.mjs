import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createServer } from '../lib/server.mjs';
import { doctor } from '../lib/doctor.mjs';

function ws() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-sec-'));
  fs.mkdirSync(path.join(d, 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(d, 'tasks/t1.md'), '---\nid: t1\ntype: task\nstatus: open\n---\nx');
  return d;
}
async function start(d, opts) {
  const srv = createServer(d, opts).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  return { srv, port: srv.address().port };
}
// raw request so we can forge the Host header like a DNS-rebinding page would
const req = (port, { method = 'GET', path: p = '/', headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const r = http.request({ host: '127.0.0.1', port, method, path: p, headers }, res => { let s = ''; res.on('data', c => s += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: s })); });
  r.on('error', reject); if (body) r.write(body); r.end();
});

test('DNS rebinding: foreign Host header is refused, localhost works', async () => {
  const { srv, port } = await start(ws());
  assert.equal((await req(port, { path: '/api/state', headers: { host: 'evil.example:' + port } })).status, 403);
  assert.equal((await req(port, { path: '/api/state', headers: { host: 'localhost:' + port } })).status, 200);
  srv.close();
});

test('HTML has strict CSP with script hash and no inline handlers', async () => {
  const { srv, port } = await start(ws());
  const r = await req(port, { headers: { host: 'localhost' } });
  assert.match(r.headers['content-security-policy'], /script-src 'sha256-[A-Za-z0-9+/=]+'/);
  assert.doesNotMatch(r.headers['content-security-policy'], /unsafe-eval|script-src[^;]*unsafe-inline/);
  assert.equal(r.headers['x-frame-options'], 'DENY');
  assert.doesNotMatch(r.body, / on[a-z]+="/);
  srv.close();
});

test('CSRF: cross-site and non-JSON writes are refused', async () => {
  const { srv, port } = await start(ws());
  const h = { host: 'localhost:' + port };
  assert.equal((await req(port, { method: 'POST', path: '/api/items/t1', headers: { ...h, 'content-type': 'text/plain' }, body: '{"status":"done"}' })).status, 415);
  assert.equal((await req(port, { method: 'POST', path: '/api/items/t1', headers: { ...h, origin: 'null', 'content-type': 'application/json' }, body: '{"status":"done"}' })).status, 403);
  assert.equal((await req(port, { method: 'POST', path: '/api/items/t1', headers: { ...h, 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }, body: '{"status":"done"}' })).status, 403);
  assert.equal((await req(port, { method: 'POST', path: '/api/items/t1', headers: { ...h, 'content-type': 'application/json' }, body: '{bad' })).status, 400);
  srv.close();
});

test('token: required when set; ?token sets HttpOnly SameSite cookie', async () => {
  const token = 'a'.repeat(32);
  const { srv, port } = await start(ws(), { token, allowHosts: ['multi.example.com'] });
  const h = { host: 'multi.example.com' };
  assert.equal((await req(port, { path: '/api/state', headers: h })).status, 401);
  assert.equal((await req(port, { path: '/?token=wrong', headers: h })).status, 401);
  const login = await req(port, { path: '/?token=' + token, headers: { ...h, 'x-forwarded-proto': 'https' } });
  assert.equal(login.status, 302);
  assert.match(login.headers['set-cookie'][0], /HttpOnly; SameSite=Strict.*Secure/);
  assert.equal((await req(port, { path: '/api/state', headers: { ...h, cookie: 'multi_token=' + token } })).status, 200);
  srv.close();
});

test('doctor flags secrets pasted into the workspace', () => {
  const d = ws();
  fs.mkdirSync(path.join(d, 'brands/acme'), { recursive: true });
  fs.writeFileSync(path.join(d, 'brands/acme/brief.md'), '---\nname: Acme\n---\nmeta token EAAGm0PX4ZCpsBAKZCZBZCabcdefghijklmnopqrstuvwxyz0123456789\n');
  assert.match(doctor(d).errors.join('\n'), /looks like a secret/);
});
