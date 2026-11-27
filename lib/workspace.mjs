// MULTI workspace: read/write markdown files with flat YAML frontmatter.
// Zero dependencies on purpose so `npx multi` works anywhere with Node 18+.
import fs from 'node:fs';
import path from 'node:path';

export const KINDS = ['content', 'engagement', 'leads', 'tasks'];
export const STATUSES = {
  content: ['idea', 'draft', 'review', 'approved', 'scheduled', 'published', 'rejected'],
  engagement: ['pending', 'approved', 'sent', 'skipped'],
  lead: ['new', 'contacted', 'qualified', 'won', 'lost'],
  task: ['open', 'done'],
};

// Transitions a human may make from the dashboard. Agents follow MULTI.md.
export const HUMAN_TRANSITIONS = {
  content: { review: ['approved', 'rejected'], approved: ['review'], rejected: ['review'] },
  engagement: { pending: ['sent', 'skipped'], skipped: ['pending'], sent: ['pending'] },
  lead: Object.fromEntries(['new', 'contacted', 'qualified', 'won', 'lost'].map((s, _, all) => [s, all.filter(x => x !== s)])),
  task: { open: ['done'], done: ['open'] },
};

export function workspaceDir(dir) {
  return path.resolve(dir || process.env.MULTI_WORKSPACE || 'multi-workspace');
}

function parseValue(raw) {
  let v = raw.trim();
  const q = v.match(/^"((?:[^"\\]|\\.)*)"/) || v.match(/^'([^']*)'/);
  if (q) { try { return v[0] === '"' ? JSON.parse(`"${q[1]}"`) : q[1]; } catch { return q[1]; } }
  const hash = v.search(/\s#/); // inline comment
  if (hash !== -1) v = v.slice(0, hash).trim();
  if (v === '') return '';
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/^["']|["']$/g, ''));
  return v;
}

export function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (kv) data[kv[1]] = parseValue(kv[2]);
  }
  return { data, body: m[2] };
}

function formatValue(v) {
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  if (typeof v === 'string' && (/[:#\[\]]/.test(v) || /^\s|\s$/.test(v))) return JSON.stringify(v);
  return String(v);
}

// Change frontmatter keys in place, keeping every other line (and comments) as written.
export function setFields(text, fields) {
  const m = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
  if (!m) throw new Error('file has no frontmatter');
  const lines = m[2].split(/\r?\n/);
  for (const [k, v] of Object.entries(fields)) {
    const i = lines.findIndex(l => l.startsWith(k + ':'));
    const line = `${k}: ${formatValue(v)}`;
    if (i === -1) lines.push(line); else lines[i] = line;
  }
  return m[1] + lines.join('\n') + m[3] + m[4];
}

export function setBody(text, body) {
  const m = text.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/);
  if (!m) throw new Error('file has no frontmatter');
  return m[1] + body;
}

function walkExt(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walkExt(p, ext) : e.name.endsWith(ext) ? [p] : [];
  });
}

export function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.md') ? [p] : [];
  });
}

const KIND_TYPE = { content: 'content', engagement: 'engagement', leads: 'lead', tasks: 'task' };

export function load(ws) {
  const out = { brands: [], items: [], trends: [] };
  for (const f of walk(path.join(ws, 'brands'))) {
    if (path.basename(f) !== 'brief.md') continue;
    const { data, body } = parse(fs.readFileSync(f, 'utf8'));
    const slug = path.basename(path.dirname(f));
    out.brands.push({ slug, name: data.name || slug, website: data.website || '', color: data.color || '', platforms: parsePlatforms(body), file: rel(ws, f) });
  }
  for (const kind of KINDS) {
    for (const f of walk(path.join(ws, kind))) {
      const { data, body } = parse(fs.readFileSync(f, 'utf8'));
      const id = data.id || path.basename(f, '.md');
      out.items.push({ ...data, id, type: data.type || KIND_TYPE[kind], folder: kind, file: rel(ws, f), body, mtime: fs.statSync(f).mtimeMs });
    }
  }
  for (const f of walk(path.join(ws, 'trends'))) {
    out.trends.push({ brand: path.basename(path.dirname(f)), date: path.basename(f, '.md'), file: rel(ws, f), body: fs.readFileSync(f, 'utf8') });
  }
  out.trends.sort((a, b) => b.date.localeCompare(a.date));
  out.metrics = [];
  for (const f of walkExt(path.join(ws, 'metrics'), '.json')) {
    try { out.metrics.push({ brand: path.basename(path.dirname(f)), date: path.basename(f, '.json'), ...JSON.parse(fs.readFileSync(f, 'utf8')) }); } catch { /* doctor reports bad json */ }
  }
  out.metrics.sort((a, b) => a.date.localeCompare(b.date));
  // Agent activity from the last 14 days of run logs: "HH:MM <agent> <id> ..."
  out.activity = {};
  const logDir = path.join(ws, 'log');
  if (fs.existsSync(logDir)) {
    const days = fs.readdirSync(logDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().slice(-14);
    for (const f of days) {
      const day = f.slice(0, 10);
      for (const line of fs.readFileSync(path.join(logDir, f), 'utf8').split('\n')) {
        const m = line.match(/^(\d{2}:\d{2})\s+([a-z0-9-]+)\s/i);
        if (!m) continue;
        const name = m[2].toLowerCase().replace(/^multi-/, '');
        const a = (out.activity[name] ||= { count: 0, last: '' });
        a.count++; const at = `${day}T${m[1]}`; if (at > a.last) a.last = at;
      }
    }
  }
  return out;
}

export function rel(ws, f) { return path.relative(ws, f).split(path.sep).join('/'); }

// Reads the "## Active platforms" markdown table from a brief.
export function parsePlatforms(body) {
  const sec = body.split(/^## /m).find(s => s.startsWith('Active platforms'));
  if (!sec) return [];
  const rows = sec.split('\n').filter(l => l.trim().startsWith('|')).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
  const [head, , ...data] = rows;
  if (!head) return [];
  return data.map(r => Object.fromEntries(head.map((h, i) => [h.toLowerCase(), r[i] || ''])));
}

export function findItem(ws, id) {
  return load(ws).items.find(i => i.id === id);
}

// Human action from the dashboard. Validates the transition, writes the file, logs it.
export function humanUpdate(ws, id, { status, note, body }) {
  const item = findItem(ws, id);
  if (!item) throw httpError(404, `no item ${id}`);
  const file = path.join(ws, item.file);
  let text = fs.readFileSync(file, 'utf8');
  const fields = {};
  if (status && status !== item.status) {
    const allowed = (HUMAN_TRANSITIONS[item.type] || {})[item.status] || [];
    if (!allowed.includes(status)) throw httpError(400, `${item.type} cannot go ${item.status} → ${status} from the dashboard`);
    fields.status = status;
    if (item.type === 'content') fields.reviewed_by = 'human';
    if (status === 'sent') fields.sent_at = new Date().toISOString();
  }
  if (note !== undefined) fields[item.type === 'content' ? 'review_note' : 'note'] = note;
  if (Object.keys(fields).length) text = setFields(text, fields);
  if (body !== undefined) text = setBody(text, body);
  fs.writeFileSync(file, text);
  if (fields.status) appendLog(ws, `human ${id} ${item.status}→${fields.status}${note ? ' ' + note : ''}`);
  return findItem(ws, id);
}

export function appendLog(ws, line) {
  const d = new Date();
  const day = d.toISOString().slice(0, 10);
  const dir = path.join(ws, 'log');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, day + '.md'), `${d.toTimeString().slice(0, 5)} ${line}\n`);
}

function httpError(code, msg) { const e = new Error(msg); e.code = code; return e; }
