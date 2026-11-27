import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collect, writeInbox } from '../lib/inbox.mjs';
import { handleUpdate, notify, shortId } from '../lib/telegram.mjs';
import { doctor } from '../lib/doctor.mjs';
import { createServer } from '../lib/server.mjs';
import { parse } from '../lib/workspace.mjs';

function ws() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-int-'));
  const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(d, p)), { recursive: true }); fs.writeFileSync(path.join(d, p), s); };
  w('MULTI.md', '#');
  w('brands/acme/brief.md', '---\nname: Acme\n---\n## Active platforms\n| platform | status |\n|---|---|\n| instagram | on |\n');
  w('brands/acme/voice-samples.md', 'x');
  w('content/acme/p1.md', '---\nid: p1\ntype: content\nbrand: acme\nplatform: instagram\nformat: reel\nstatus: review\nhook: Hi\n---\n## Caption\nhello\n');
  return { d, w };
}

const fakeFetch = routes => async url => {
  const key = Object.keys(routes).find(k => String(url).includes(k));
  return { ok: true, status: 200, json: async () => key ? routes[key] : { data: [] } };
};

test('inbox: collects IG comments, DMs (skipping own), FB, YouTube; writes once', async () => {
  const cfg = { meta_page_token: 't', ig_user_id: 'IG1', fb_page_id: 'PG1', youtube_api_key: 'k', youtube_channel_id: 'UC1' };
  const f = fakeFetch({
    '/IG1/media': { data: [{ id: 'm1', permalink: 'https://instagram.com/p/x', comments: { data: [{ id: 'c1', text: 'price?', username: 'ann', timestamp: '2026-12-01T00:00:00Z' }] } }] },
    'platform=instagram': { data: [{ messages: { data: [{ id: 'mid.1', message: 'hi there', from: { id: 'U9', username: 'bob' } }, { id: 'mid.2', message: 'our reply', from: { id: 'IG1' } }] } }] },
    '/PG1/feed': { data: [{ permalink_url: 'https://fb.com/1', comments: { data: [{ id: 'f1', message: 'nice', from: { id: 'U2', name: 'Cat' } }] } }] },
    'commentThreads': { items: [{ id: 'yt1', snippet: { videoId: 'v1', topLevelComment: { snippet: { authorDisplayName: 'Dan', textOriginal: 'great video', publishedAt: '2026-12-01T00:00:00Z' } } } }] },
  });
  const { messages, errors } = await collect(cfg, f);
  assert.deepEqual(errors, []);
  const ids = messages.map(m => m.id);
  assert.ok(ids.includes('ig-comment-c1') && ids.includes('fb-comment-f1') && ids.includes('yt-comment-yt1'));
  assert.ok(ids.some(i => i.startsWith('ig-dm-')) && !messages.some(m => m.text === 'our reply'));
  const { d } = ws();
  assert.equal(writeInbox(d, 'acme', messages), messages.length);
  assert.equal(writeInbox(d, 'acme', messages), 0);
  const f1 = fs.readdirSync(path.join(d, 'inbox/acme')).find(x => x.startsWith('ig-comment'));
  const { data, body } = parse(fs.readFileSync(path.join(d, 'inbox/acme', f1), 'utf8'));
  assert.equal(data.from, '@ann'); assert.equal(data.handled, false); assert.match(body, /price\?/);
});

test('inbox: API errors are reported, not thrown', async () => {
  const bad = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'Invalid OAuth access token' } }) });
  const { errors } = await collect({ meta_page_token: 'x', ig_user_id: '1' }, bad);
  assert.match(errors[0], /Invalid OAuth/);
});

test('telegram: approve via button, foreign chat ignored, notify sends cards', async () => {
  const { d } = ws();
  const calls = [];
  const f = async (url, opts) => { calls.push([String(url).split('/').pop(), JSON.parse(opts.body)]); return { json: async () => ({ ok: true, result: [] }) }; };
  const cfg = { bot_token: 'T', chat_id: '42' };
  assert.equal(await handleUpdate(d, cfg, { callback_query: { id: 'q', data: `a|${shortId('p1')}`, message: { chat: { id: 99 }, message_id: 1 } } }, f), 'ignored: foreign chat');
  assert.equal(parse(fs.readFileSync(path.join(d, 'content/acme/p1.md'), 'utf8')).data.status, 'review');
  assert.equal(await handleUpdate(d, cfg, { callback_query: { id: 'q', data: `a|${shortId('p1')}`, message: { chat: { id: 42 }, message_id: 1 } } }, f), 'Approved ✅');
  assert.equal(parse(fs.readFileSync(path.join(d, 'content/acme/p1.md'), 'utf8')).data.status, 'approved');
  calls.length = 0;
  fs.writeFileSync(path.join(d, 'content/acme/p2.md'), '---\nid: p2\ntype: content\nbrand: acme\nplatform: tiktok\nstatus: review\nhook: Two\n---\n## Caption\nyo\n');
  assert.equal(await notify(d, cfg, {}, f), 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1].reply_markup.inline_keyboard[0][0].callback_data, `a|${shortId('p2')}`);
});

test('doctor: catches bad status, nested yaml, duplicate ids, missing asset', () => {
  const { d, w } = ws();
  w('content/acme/bad.md', '---\nid: p1\ntype: content\nbrand: acme\nplatform: x\nstatus: maybe\n---\n- file: assets/acme/none.png\n');
  w('content/acme/nested.md', '---\nid: n1\ntype: content\nbrand: acme\nplatform: x\nstatus: idea\nmeta:\n  a: 1\n---\n');
  const r = doctor(d);
  const all = r.errors.join('\n');
  assert.match(all, /duplicate id p1/); assert.match(all, /status "maybe"/); assert.match(all, /nested YAML/); assert.match(all, /asset not found/);
});

test('server: serves workspace assets, blocks traversal, sandboxes svg', async () => {
  const { d, w } = ws();
  w('assets/acme/p1/cover.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const srv = createServer(d).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const ok = await fetch(base + '/assets/acme/p1/cover.svg');
  assert.equal(ok.status, 200); assert.match(ok.headers.get('content-security-policy'), /sandbox/);
  assert.equal((await fetch(base + '/assets/..%2Fbrands%2Facme%2Fbrief.md')).status, 404);
  assert.equal((await fetch(base + '/assets/../MULTI.md')).status, 404);
  srv.close();
});
