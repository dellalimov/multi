# Integrations

Every key goes into **`~/.multi/secrets.json`** on your own computer (create it with `multi secrets`). That file lives outside the workspace, so syncing or committing the workspace never leaks a key. Agents never read it.

```json
{
  "telegram": { "bot_token": "123456:ABC...", "chat_id": "123456789" },
  "brands": {
    "visio": {
      "meta_page_token": "EAAG...", "fb_page_id": "1026...", "ig_user_id": "1784...",
      "youtube_api_key": "AIza...", "youtube_channel_id": "UCNv..."
    }
  }
}
```

The brand key (`visio`) must match the folder name in `brands/`.

| Integration | What it unlocks | Time |
|---|---|---|
| [Telegram bot](#1-telegram-bot) | Approve / send back posts from your phone; daily summary | 3 min |
| [Meta (Instagram + Facebook)](#2-meta-instagram--facebook-comments-and-dms) | Pull comments and DMs into the inbox | 15 min per brand |
| [YouTube Data API](#3-youtube-data-api) | Pull YouTube comments into the inbox | 5 min |
| [Scheduler: Metricool or Postiz](#4-scheduler) | Publishing approved posts | already connected / 10 min |
| [Media tools](#5-media-tools) | Media producer renders images and video | per tool |
| [Research: Apify](#6-research-apify-optional) | Trend scout reads TikTok/Instagram trends | 5 min |
| [Analytics: PostHog](#7-analytics-posthog-optional) | Leads and signups by channel | 10 min |

---

## 1. Telegram bot

1. In Telegram open **@BotFather**, send `/newbot`, pick a name like `MULTI Dell` and a username ending in `bot`. Copy the token.
2. Open your new bot and press **Start** (send it any message).
3. Get your chat id: open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy `message.chat.id`.
4. Put both into `telegram` in `~/.multi/secrets.json`.
5. Test: `multi notify` → you get a summary and cards with **Approve / Send back**.
6. Keep the button handler running: `multi telegram` (see [AUTOMATION.md](AUTOMATION.md) to start it automatically).

The bot obeys only your `chat_id`. Replying to a card you sent back adds that reply as the note for the team. Commands: `/status`, `/review`.

## 2. Meta: Instagram + Facebook comments and DMs

For your own business accounts you need **Standard Access only: no App Review**. Requirements: the Instagram account is Professional (Business or Creator) and linked to the brand's Facebook Page, and you are an admin of that Page.

1. Go to **developers.facebook.com/apps** → **Create app** → use case **Manage messaging and content on Instagram** → choose **API setup with Facebook Login**. Business portfolio: the one that owns the Page.
2. In the app, add the permissions: `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `pages_messaging`, `business_management`.
3. Open **Graph API Explorer** (developers.facebook.com/tools/explorer): select your app → **User or Page** → **Get Page Access Token** → tick the permissions above → choose the brand's Page.
4. Make it long-lived: open the **Access Token Debugger** (developers.facebook.com/tools/debug/accesstoken), paste the token → **Extend Access Token**. Then in Explorer call `me/accounts` with the extended user token and copy that Page's `access_token` (Page tokens from a long-lived user token don't expire).
5. In Explorer run `me?fields=id,name,instagram_business_account` with the Page token. Copy `id` → `fb_page_id`, `instagram_business_account.id` → `ig_user_id`.
6. Put `meta_page_token`, `fb_page_id`, `ig_user_id` under the brand in `secrets.json`.
7. Test: `multi inbox --brand visio`. New comments and DMs appear in `inbox/visio/`; the daily engagement run turns them into reply drafts.

Repeat steps 3–7 for each brand's Page (one app is enough for all four).

Notes: DMs are readable only for conversations in the last 30 days; replies are still sent by you (or later by an official auto-reply tool for FAQ topics the brief allows).

## 3. YouTube Data API

1. **console.cloud.google.com** → create a project `multi`.
2. **APIs & Services → Library → YouTube Data API v3 → Enable**.
3. **Credentials → Create credentials → API key**. Restrict it to *YouTube Data API v3*.
4. Put `youtube_api_key` and `youtube_channel_id` (the `UC...` id, Metricool shows it too) under each brand.
5. Test: `multi inbox --brand visio`.

Reading public comments needs only the API key. Replying through the API would need OAuth; MULTI leaves replies to you.

## 4. Scheduler

- **Metricool** (default): connect its connector in Claude. Brands Visio, DA Design Works and MOVD already exist there; add a DealBridge brand once its accounts exist, then put the brand id in `brands/dealbridge/brief.md`.
- **Postiz** (open source alternative): `npx skills add gitroomhq/postiz-agent` or connect its MCP server; set `scheduler: postiz` in the brief.

## 5. Media tools

The media producer uses whatever media connector Claude has: Higgsfield, fal, Kling, Canva, Figma. Generated files come back as hosted URLs, which Metricool can publish directly. For your own videos, upload them anywhere public (Google Drive with link sharing, R2, Supabase Storage) and paste the URL under `## Assets`.

## 6. Research: Apify (optional)

1. **console.apify.com** → Settings → API & Integrations → copy the token.
2. Connect the Apify MCP server in Claude (`https://mcp.apify.com`) with that token. The trend scout uses TikTok/Instagram trend actors through it.

## 7. Analytics: PostHog (optional)

Add UTM parameters to every link (`utm_source=<platform>&utm_medium=social&utm_campaign=<content id>`) and connect PostHog in Claude. The analyst then counts signups and leads per channel and per post.

## AI-content labels

TikTok, Meta and YouTube ask creators to label realistic AI-generated or altered content. Media the producer generates with realistic people gets `ai_generated: true`; compliance checks the current platform policy and the publisher turns the label on (or hands the post to you if the scheduler can't).
