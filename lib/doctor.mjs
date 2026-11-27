// `multi doctor`: checks the workspace so agents and the dashboard read it the same way.
import fs from 'node:fs';
import path from 'node:path';
import { load, STATUSES, walk, rel } from './workspace.mjs';

const RTL = new Set(['ar', 'he', 'fa', 'ur']);

// Credentials must live in ~/.multi/secrets.json, never in the workspace (it gets synced and shared).
const SECRET_PATTERNS = [
  ['Meta access token', /\bEAA[A-Za-z0-9]{30,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Telegram bot token', /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
  ['OpenAI/Anthropic-style key', /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Stripe key', /\b(sk|rk)_live_[A-Za-z0-9]{20,}/],
];

export function doctor(ws) {
  const errors = [], warnings = [];
  const err = (f, m) => errors.push(`${f}: ${m}`), warn = (f, m) => warnings.push(`${f}: ${m}`);
  if (!fs.existsSync(path.join(ws, 'MULTI.md'))) warn('MULTI.md', 'missing; run `multi init` so agents read the conventions');

  for (const f of walk(ws)) {
    const r = rel(ws, f), top = r.split('/')[0];
    const raw = fs.readFileSync(f, 'utf8');
    for (const [label, re] of SECRET_PATTERNS) if (re.test(raw)) err(r, `contains what looks like a secret (${label}); move it to ~/.multi/secrets.json and rotate it`);
    if (!['content', 'engagement', 'leads', 'tasks', 'inbox'].includes(top)) continue;
    const text = fs.readFileSync(f, 'utf8');
    if (!/^---\r?\n[\s\S]*?\r?\n---/.test(text)) { err(r, 'no frontmatter (must start with ---)'); continue; }
    const fm = text.split(/\r?\n---/)[0];
    if (/^\s+\S+:/m.test(fm.replace(/^---\r?\n/, ''))) err(r, 'nested YAML in frontmatter; MULTI only reads flat key: value lines');
  }

  const st = load(ws);
  const brands = new Set(st.brands.map(b => b.slug));
  const ids = new Map();
  for (const i of st.items) {
    if (ids.has(i.id)) err(i.file, `duplicate id ${i.id} (also ${ids.get(i.id)})`); else ids.set(i.id, i.file);
    const allowed = STATUSES[i.type];
    if (!allowed) err(i.file, `unknown type "${i.type}"`);
    else if (!allowed.includes(i.status)) err(i.file, `status "${i.status ?? ''}" is not one of ${allowed.join(', ')}`);
    if (i.type !== 'task' && !i.brand) err(i.file, 'missing brand');
    else if (i.brand && i.brand !== 'all' && !brands.has(i.brand)) warn(i.file, `brand "${i.brand}" has no brands/${i.brand}/brief.md`);
    if (['content', 'engagement'].includes(i.type) && !i.platform) err(i.file, 'missing platform');
    if (i.scheduled_at && isNaN(Date.parse(i.scheduled_at))) err(i.file, `scheduled_at "${i.scheduled_at}" is not a date`);
    if (i.ai_generated === true && i.ai_label !== 'required' && ['approved', 'scheduled'].includes(i.status)) warn(i.file, 'ai_generated but no ai_label: required; compliance should flag it');
    if (RTL.has(i.lang) && i.dir !== 'rtl') warn(i.file, `lang ${i.lang} should have dir: rtl`);
    if (i.type === 'engagement' && !/^## Draft/m.test(i.body)) warn(i.file, 'engagement item has no "## Draft" section');
    for (const m of String(i.body).matchAll(/file:\s*(assets\/[^\s|]+)/g)) if (!fs.existsSync(path.join(ws, m[1]))) err(i.file, `asset not found: ${m[1]}`);
  }
  for (const b of st.brands) {
    if (!b.platforms.length) warn(b.file, 'no "## Active platforms" table');
    if (!fs.existsSync(path.join(ws, 'brands', b.slug, 'voice-samples.md'))) warn(b.file, 'no voice-samples.md; humanizer cannot match the owner');
  }
  if (fs.existsSync(path.join(ws, 'metrics'))) {
    for (const d of fs.readdirSync(path.join(ws, 'metrics'))) {
      const dir = path.join(ws, 'metrics', d);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
        try { JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { err(`metrics/${d}/${f}`, 'invalid JSON: ' + e.message); }
      }
    }
  }
  for (const f of [path.join(ws, '.env'), path.join(ws, 'secrets.json')]) if (fs.existsSync(f)) err(rel(ws, f), 'credentials file inside the workspace; move it to ~/.multi/secrets.json');
  return { errors, warnings, counts: { brands: st.brands.length, items: st.items.length } };
}

