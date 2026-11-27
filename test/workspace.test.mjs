import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse, setFields, load, humanUpdate, parsePlatforms } from '../lib/workspace.mjs';
import { createServer } from '../lib/server.mjs';

function tmpWorkspace() {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-'));
  const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(ws, p)), { recursive: true }); fs.writeFileSync(path.join(ws, p), s); };
  w('brands/acme/brief.md', '---\ntype: brand\nname: Acme\n---\n## Active platforms\n| platform | status | handle |\n|---|---|---|\n| instagram | on | @acme |\n| x | setup | |\n');
  w('content/acme/p1.md', '---\nid: p1\nbrand: acme\nplatform: instagram\nstatus: review   # waiting\nhook: "Wait: what? #1"\n---\n## Caption\nhi\n');
  w('engagement/acme/e1.md', '---\nid: e1\nbrand: acme\nstatus: pending\n---\n## Draft\nold\n');
  w('tasks/t1.md', '---\nid: t1\nstatus: open\n---\nDo it');
  return ws;
}

test('parse: comments, quotes, lists, numbers', () => {
  const { data, body } = parse('---\na: 1\nb: "x: y" # c\nc: [one, two]\nd: true\ne: plain # note\n---\nbody');
  assert.deepEqual(data, { a: 1, b: 'x: y', c: ['one', 'two'], d: true, e: 'plain' });
  assert.equal(body, 'body');
});

test('setFields keeps other lines and round-trips', () => {
  const src = '---\nid: x\nstatus: review   # waiting\nhook: hi\n---\nbody\n';
  const out = setFields(src, { status: 'approved', review_note: 'ok: ship' });
  assert.match(out, /hook: hi/);
  assert.equal(parse(out).data.status, 'approved');
  assert.equal(parse(out).data.review_note, 'ok: ship');
  assert.ok(out.endsWith('body\n'));
});

test('parsePlatforms reads the brief table', () => {
  const p = parsePlatforms('## Active platforms\n| platform | status |\n|---|---|\n| youtube | on |\n');
  assert.deepEqual(p, [{ platform: 'youtube', status: 'on' }]);
});

test('load finds brands and items with types', () => {
  const s = load(tmpWorkspace());
  assert.equal(s.brands[0].name, 'Acme');
  assert.equal(s.brands[0].platforms.length, 2);
  assert.deepEqual(s.items.map(i => i.type).sort(), ['content', 'engagement', 'task']);
  assert.equal(s.items.find(i => i.id === 'p1').hook, 'Wait: what? #1');
});

test('human can approve review, cannot approve a draft', () => {
  const ws = tmpWorkspace();
  assert.equal(humanUpdate(ws, 'p1', { status: 'approved' }).status, 'approved');
  fs.writeFileSync(path.join(ws, 'content/acme/p2.md'), '---\nid: p2\nbrand: acme\nstatus: draft\n---\n');
  assert.throws(() => humanUpdate(ws, 'p2', { status: 'approved' }), /cannot go draft → approved/);
  assert.match(fs.readFileSync(path.join(ws, 'log', new Date().toISOString().slice(0, 10) + '.md'), 'utf8'), /human p1 review→approved/);
});

test('engagement: edited draft is saved with sent status', () => {
  const ws = tmpWorkspace();
  const r = humanUpdate(ws, 'e1', { status: 'sent', body: '## Draft\nnew text\n' });
  assert.equal(r.status, 'sent');
  assert.match(fs.readFileSync(path.join(ws, 'engagement/acme/e1.md'), 'utf8'), /new text/);
});

test('unknown id is 404, never a path', () => {
  const ws = tmpWorkspace();
  assert.throws(() => humanUpdate(ws, '../../etc/passwd', { status: 'done' }), e => e.code === 404);
});

test('server: state + update + cross-origin block', async () => {
  const ws = tmpWorkspace();
  const srv = createServer(ws).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const st = await (await fetch(base + '/api/state')).json();
  assert.equal(st.items.length, 3);
  const ok = await fetch(base + '/api/items/t1', { method: 'POST', body: JSON.stringify({ status: 'done' }) });
  assert.equal((await ok.json()).status, 'done');
  const bad = await fetch(base + '/api/items/t1', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{"status":"open"}' });
  assert.equal(bad.status, 403);
  const html = await (await fetch(base + '/')).text();
  assert.match(html, /MULTI/);
  srv.close();
});
