// Telegram bot: approve or send back content from your phone.
// `multi notify` sends what waits for you; `multi telegram` keeps running and handles the buttons.
// Only the chat_id in ~/.multi/secrets.json is obeyed; every other chat is ignored.
import crypto from 'node:crypto';
import { load, humanUpdate } from './workspace.mjs';

const api = (token, method, body, fetchImpl = fetch) =>
  fetchImpl(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json()).then(j => { if (!j.ok) throw new Error(j.description || 'telegram error'); return j.result; });

export const shortId = id => crypto.createHash('sha1').update(id).digest('hex').slice(0, 12);
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const section = (body, name) => { const p = String(body || '').split(/^## /m).find(x => x.toLowerCase().startsWith(name.toLowerCase())); return p ? p.slice(p.indexOf('\n') + 1).trim() : ''; };

export function summary(ws) {
  const st = load(ws), name = s => (st.brands.find(b => b.slug === s) || {}).name || s;
  const lines = ['<b>MULTI</b> · waiting for you'];
  for (const b of st.brands) {
    const mine = st.items.filter(i => i.brand === b.slug);
    const c = (t, s) => mine.filter(i => i.type === t && i.status === s).length;
    const n = [c('content', 'review') && `${c('content', 'review')} to review`, c('engagement', 'pending') && `${c('engagement', 'pending')} replies`, c('lead', 'new') && `${c('lead', 'new')} new leads`].filter(Boolean);
    if (n.length) lines.push(`• ${esc(name(b.slug))}: ${n.join(' · ')}`);
  }
  const tasks = st.items.filter(i => i.type === 'task' && i.status === 'open').length;
  if (tasks) lines.push(`• ${tasks} tasks only you can do`);
  return { text: lines.length > 1 ? lines.join('\n') : 'MULTI · nothing waiting. ✓', review: st.items.filter(i => i.type === 'content' && i.status === 'review'), name };
}

export async function notify(ws, { bot_token, chat_id }, { cards = 10 } = {}, fetchImpl = fetch) {
  const s = summary(ws);
  await api(bot_token, 'sendMessage', { chat_id, text: s.text, parse_mode: 'HTML' }, fetchImpl);
  for (const i of s.review.slice(0, cards)) {
    const body = section(i.body, 'Caption') || section(i.body, 'Post') || section(i.body, 'Posts') || section(i.body, 'Script') || section(i.body, 'Slides') || '';
    const text = `<b>${esc(s.name(i.brand))} · ${esc(i.platform)} · ${esc(i.format || '')}</b>\n${esc(i.hook || i.id)}\n\n${esc(body.slice(0, 700))}${body.length > 700 ? '…' : ''}`;
    await api(bot_token, 'sendMessage', { chat_id, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '✅ Approve', callback_data: `a|${shortId(i.id)}` }, { text: '↩️ Send back', callback_data: `r|${shortId(i.id)}` }]] } }, fetchImpl);
  }
  return s.review.length;
}

// Handles one update. Returns a short description for logs/tests.
export async function handleUpdate(ws, cfg, u, fetchImpl = fetch) {
  const allowed = String(cfg.chat_id);
  if (u.callback_query) {
    const cq = u.callback_query;
    if (String(cq.message?.chat?.id) !== allowed) return 'ignored: foreign chat';
    const [act, sid] = String(cq.data || '').split('|');
    const item = load(ws).items.find(i => shortId(i.id) === sid);
    let note = 'not found';
    if (item) {
      try {
        humanUpdate(ws, item.id, act === 'a' ? { status: 'approved' } : { status: 'rejected', note: 'Sent back from Telegram (reply to this message with a note to add one)' });
        note = act === 'a' ? 'Approved ✅' : 'Sent back ↩️';
        await api(cfg.bot_token, 'editMessageReplyMarkup', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [[{ text: note, callback_data: 'noop|' }]] } }, fetchImpl);
      } catch (e) { note = e.message; }
    }
    await api(cfg.bot_token, 'answerCallbackQuery', { callback_query_id: cq.id, text: note }, fetchImpl);
    return note;
  }
  const msg = u.message;
  if (!msg) return 'ignored';
  if (String(msg.chat?.id) !== allowed) return 'ignored: foreign chat';
  // A reply to a card that was sent back adds the note to that item.
  const replied = msg.reply_to_message?.reply_markup?.inline_keyboard?.flat().map(b => b.callback_data).find(d => /^[ar]\|/.test(d || ''));
  if (replied && msg.text) {
    const item = load(ws).items.find(i => shortId(i.id) === replied.split('|')[1]);
    if (item && item.status === 'rejected') { humanUpdate(ws, item.id, { note: msg.text }); await api(cfg.bot_token, 'sendMessage', { chat_id: allowed, text: 'Note saved for the team.' }, fetchImpl); return 'note'; }
  }
  if (/^\/status/.test(msg.text || '')) { await api(cfg.bot_token, 'sendMessage', { chat_id: allowed, text: summary(ws).text, parse_mode: 'HTML' }, fetchImpl); return 'status'; }
  if (/^\/review/.test(msg.text || '')) { await notify(ws, cfg, {}, fetchImpl); return 'review'; }
  return 'ignored';
}

export async function runBot(ws, cfg, log = console.log) {
  let offset = 0;
  log('MULTI Telegram bot running. Commands: /status, /review. Ctrl+C to stop.');
  for (;;) {
    try {
      const updates = await api(cfg.bot_token, 'getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'callback_query'] });
      for (const u of updates) { offset = u.update_id + 1; log(await handleUpdate(ws, cfg, u)); }
    } catch (e) { log('telegram: ' + e.message); await new Promise(r => setTimeout(r, 5000)); }
  }
}
