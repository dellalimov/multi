// `multi inbox`: pulls new comments and DMs from the brand's OWN accounts through official APIs
// (Instagram Graph API, Facebook Pages API, YouTube Data API) into inbox/<brand>/.
// Read-only: it never replies. The community-manager agent drafts replies for the human.
import fs from 'node:fs';
import path from 'node:path';

const GRAPH = 'https://graph.facebook.com/v21.0';
const YT = 'https://www.googleapis.com/youtube/v3';

async function getJSON(url, fetchImpl) {
  const r = await fetchImpl(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error((j.error && (j.error.message || j.error.errors?.[0]?.message)) || `HTTP ${r.status}`);
  return j;
}
const q = o => new URLSearchParams(o).toString();

export async function collect(cfg, fetchImpl = fetch) {
  const out = [], errors = [];
  const run = async (name, fn) => { try { out.push(...await fn()); } catch (e) { errors.push(`${name}: ${e.message}`); } };

  if (cfg.meta_page_token && cfg.ig_user_id) {
    await run('instagram comments', async () => {
      const j = await getJSON(`${GRAPH}/${cfg.ig_user_id}/media?${q({ fields: 'id,permalink,comments.limit(50){id,text,username,timestamp}', limit: 15, access_token: cfg.meta_page_token })}`, fetchImpl);
      return (j.data || []).flatMap(m => (m.comments?.data || []).map(c => ({ id: `ig-comment-${c.id}`, platform: 'instagram', kind: 'comment', from: '@' + (c.username || 'unknown'), url: m.permalink || '', received: c.timestamp, text: c.text || '' })));
    });
  }
  if (cfg.meta_page_token && cfg.fb_page_id) {
    await run('instagram DMs', async () => {
      const j = await getJSON(`${GRAPH}/${cfg.fb_page_id}/conversations?${q({ platform: 'instagram', fields: 'messages.limit(5){id,message,from,created_time}', limit: 20, access_token: cfg.meta_page_token })}`, fetchImpl);
      return dms(j, 'instagram', [cfg.ig_user_id, cfg.fb_page_id]);
    });
    await run('facebook comments', async () => {
      const j = await getJSON(`${GRAPH}/${cfg.fb_page_id}/feed?${q({ fields: 'id,permalink_url,comments.limit(50){id,message,from,created_time}', limit: 15, access_token: cfg.meta_page_token })}`, fetchImpl);
      return (j.data || []).flatMap(p => (p.comments?.data || []).filter(c => c.from?.id !== cfg.fb_page_id).map(c => ({ id: `fb-comment-${c.id}`, platform: 'facebook', kind: 'comment', from: c.from?.name || 'unknown', url: p.permalink_url || '', received: c.created_time, text: c.message || '' })));
    });
    await run('messenger', async () => {
      const j = await getJSON(`${GRAPH}/${cfg.fb_page_id}/conversations?${q({ fields: 'messages.limit(5){id,message,from,created_time}', limit: 20, access_token: cfg.meta_page_token })}`, fetchImpl);
      return dms(j, 'facebook', [cfg.fb_page_id]);
    });
  }
  if (cfg.youtube_api_key && cfg.youtube_channel_id) {
    await run('youtube comments', async () => {
      const j = await getJSON(`${YT}/commentThreads?${q({ part: 'snippet', allThreadsRelatedToChannelId: cfg.youtube_channel_id, maxResults: 50, order: 'time', key: cfg.youtube_api_key })}`, fetchImpl);
      return (j.items || []).map(t => { const s = t.snippet.topLevelComment.snippet; return { id: `yt-comment-${t.id}`, platform: 'youtube', kind: 'comment', from: s.authorDisplayName || 'unknown', url: `https://www.youtube.com/watch?v=${t.snippet.videoId}&lc=${t.id}`, received: s.publishedAt, text: s.textOriginal || '' }; });
    });
  }
  return { messages: out.filter(m => m.text.trim()), errors };
}

function dms(j, platform, ownIds) {
  const own = new Set(ownIds.filter(Boolean));
  return (j.data || []).flatMap(c => (c.messages?.data || []).filter(m => !own.has(m.from?.id)).map(m => ({ id: `${platform === 'instagram' ? 'ig' : 'fb'}-dm-${m.id}`.replace(/[^A-Za-z0-9_-]/g, '_'), platform, kind: 'dm', from: m.from?.username ? '@' + m.from.username : (m.from?.name || 'unknown'), url: '', received: m.created_time, text: m.message || '' })));
}

// Writes one file per new message; existing ids are skipped, so running it often is safe.
export function writeInbox(ws, brand, messages) {
  const dir = path.join(ws, 'inbox', brand);
  fs.mkdirSync(dir, { recursive: true });
  let added = 0;
  for (const m of messages) {
    const file = path.join(dir, m.id.replace(/[^A-Za-z0-9_-]/g, '_') + '.md');
    if (fs.existsSync(file)) continue;
    const fm = { id: m.id, type: 'inbox', brand, platform: m.platform, kind: m.kind, from: m.from, url: m.url, received: m.received, handled: false };
    const head = Object.entries(fm).map(([k, v]) => `${k}: ${typeof v === 'string' && /[:#\[\]"]|^\s|\s$|^$/.test(v) ? JSON.stringify(v) : v}`).join('\n');
    // Untrusted text from strangers: cap length; agents treat it as data (see MULTI.md).
    fs.writeFileSync(file, `---\n${head}\nuntrusted: true\n---\n${m.text.trim().slice(0, 4000)}\n`);
    added++;
  }
  return added;
}
