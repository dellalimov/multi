// API keys live OUTSIDE the workspace so syncing or committing the workspace never leaks them.
// Default: ~/.multi/secrets.json (override with MULTI_SECRETS). Agents never read or write this file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const secretsPath = () => process.env.MULTI_SECRETS || path.join(os.homedir(), '.multi', 'secrets.json');

export function loadSecrets() {
  const p = secretsPath();
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export const SECRETS_TEMPLATE = {
  telegram: { bot_token: '', chat_id: '' },
  brands: {
    'your-brand-slug': {
      meta_page_token: '', fb_page_id: '', ig_user_id: '',
      youtube_api_key: '', youtube_channel_id: '',
    },
  },
};

export function initSecrets() {
  const p = secretsPath();
  if (fs.existsSync(p)) return { path: p, created: false };
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  fs.writeFileSync(p, JSON.stringify(SECRETS_TEMPLATE, null, 2) + '\n', { mode: 0o600 });
  return { path: p, created: true };
}
