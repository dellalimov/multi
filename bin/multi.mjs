#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { workspaceDir, load } from '../lib/workspace.mjs';
import { createServer } from '../lib/server.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [cmd = 'help', ...args] = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const ws = workspaceDir(flag('--workspace'));

const commands = {
  init() {
    const dirs = ['brands', 'content', 'engagement', 'leads', 'trends', 'tasks', 'log'];
    dirs.forEach(d => fs.mkdirSync(path.join(ws, d), { recursive: true }));
    fs.copyFileSync(path.join(ROOT, 'docs', 'WORKSPACE.md'), path.join(ws, 'MULTI.md'));
    if (args.includes('--example')) fs.cpSync(path.join(ROOT, 'examples', 'workspace'), ws, { recursive: true, force: false, errorOnExist: false });
    console.log(`MULTI workspace ready: ${ws}\nNext: add a brand with the multi-brand-onboarding skill, then run: multi dashboard`);
  },
  dashboard() {
    if (!fs.existsSync(ws)) { console.error(`No workspace at ${ws}. Run: multi init`); process.exit(1); }
    const port = Number(flag('--port', process.env.PORT || 4747));
    createServer(ws).listen(port, '127.0.0.1', () => {
      const url = `http://localhost:${port}`;
      console.log(`MULTI dashboard → ${url}\nworkspace: ${ws}`);
      if (!args.includes('--no-open')) {
        const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
        exec(`${opener} ${url}`, () => {});
      }
    });
  },
  status() {
    const s = load(ws);
    for (const b of s.brands) {
      const mine = s.items.filter(i => i.brand === b.slug);
      const c = (t, st) => mine.filter(i => i.type === t && i.status === st).length;
      console.log(`${b.name.padEnd(18)} review ${c('content', 'review')} · approved ${c('content', 'approved')} · engagement ${c('engagement', 'pending')} · leads ${c('lead', 'new')}`);
    }
    const open = s.items.filter(i => i.type === 'task' && i.status === 'open');
    if (open.length) console.log(`\nNeeds you (${open.length}):\n` + open.map(t => `  [${t.priority || '-'}] ${t.brand || ''} ${t.id}`).join('\n'));
  },
  help() {
    console.log(`multi <command> [--workspace path]

  init [--example]   create a workspace (MULTI_WORKSPACE or ./multi-workspace)
  dashboard [--port 4747] [--no-open]   open the local dashboard
  status             print what is waiting for you`);
  },
};

(commands[cmd] || commands.help)();
