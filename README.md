# MULTI

**A social media department for Claude.** 56 agents organised into platform teams, a weekly content cycle, a daily engagement queue, and a local dashboard where a human approves everything before it goes out.

Run every brand you own from one place: YouTube, Instagram, TikTok, X, LinkedIn, Threads, Pinterest, Reddit, Facebook, Telegram, SEO, Quora, Medium, Substack and your newsletter, each with its own team and a lead who signs off before you see it. Content is localized natively (Arabic with right-to-left layouts, Russian, any language in the brief).

[![test](https://github.com/dellalimov/multi/actions/workflows/test.yml/badge.svg)](https://github.com/dellalimov/multi/actions/workflows/test.yml) ![license](https://img.shields.io/badge/license-MIT-black) ![deps](https://img.shields.io/badge/dependencies-0-black)

![MULTI dashboard](docs/screenshots/overview.png)

## Why MULTI

Most "AI social media" tools are either a scheduler with a caption button, or a bot that posts on its own and gets the account flagged. MULTI works like a real agency instead:

- **Teams, not prompts.** Each platform has a lead plus specialists (scriptwriter, thumbnail designer, carousel designer, hook writer, SEO...). Shared roles research trends, break down why posts went viral, guard the brand, and learn from last week's numbers.
- **A human approves every post.** Leads move work to `review`; only you move it to `approved`. Comments, DMs and connection notes are drafts you send yourself.
- **It sounds like you.** Every human-facing line goes through a humanizer calibrated on things you actually wrote.
- **Plain files.** State is markdown in a folder. No database, no vendor lock-in; sync it with git, Dropbox or iCloud.
- **Many brands.** Each brand has its own brief, brand kit, voice, languages, platforms and quotas. One dashboard for all of them.
- **Approve from your phone.** A Telegram bot sends the batch with Approve / Send back buttons.
- **Real assets.** A media producer turns prompts into images and video with your connected tools, and AI-generated media gets the platform's AI label.

## Install

**As a Claude Code plugin**

```bash
/plugin marketplace add dellalimov/multi
/plugin install multi@multi
```

**Dashboard** (Node 18+, no dependencies)

```bash
npx github:dellalimov/multi init            # creates ./multi-workspace
npx github:dellalimov/multi dashboard       # opens http://localhost:4747
```

Try it with the example brand: `npm run demo` from a clone.

## Use

In Claude Code, inside the folder that holds your workspace:

| You say | What runs |
|---|---|
| `/multi:multi-brand-onboarding` | Interviews you, reads your site, writes the brand brief, voice samples and setup tasks |
| `/multi:multi-weekly` | Trends → virality patterns → plan → drafts per platform → lead review → batch in your dashboard |
| `/multi:multi-daily-engagement` | Listening, inbound replies, outbound reply drafts, LinkedIn notes, lead follow-ups |
| `/multi:multi-publish` | Schedules everything you approved through Metricool or Postiz |

And the CLI (no Claude needed):

```bash
multi dashboard     # local dashboard
multi doctor        # check every workspace file
multi secrets       # create ~/.multi/secrets.json for API keys
multi inbox         # pull comments and DMs (Instagram, Facebook, YouTube official APIs)
multi notify        # send the review batch to Telegram
multi telegram      # handle the Approve / Send back buttons
```

Setup for every API: [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md). Running it on a schedule: [`docs/AUTOMATION.md`](docs/AUTOMATION.md).

Then open the dashboard:

- **Companies and channels in the sidebar.** Pick a company, a channel, or both; every view filters to that scope, with live counters of what waits for you.
- **Team.** The whole org chart, the way a company looks: you → the Brain (CMO) → departments and platform teams, every agent with a live dot that lights up when it works.
- **Waiting on your yes + What interrupts the loop.** One number for everything that needs you, and the things agents hand back: hot leads, untouched leads, complaints, failed publishes, missing AI labels.
- **Coverage matrix.** Every company × channel at a glance: active, still to set up, or off, and how many items are waiting. Click a cell to jump into that pipeline.
- **Review.** Media previews in phone frames, edit the caption inline, approve one by one or all at once, or send back with a note the team reads next run. Arabic and other RTL languages render right to left.
- **Engagement.** Edit the draft, open the thread, copy, send it yourself, mark it sent.
- **Calendar and Analytics.** Two weeks of scheduled posts across every company, and weekly reach, engagement and leads per channel.
- **Pipeline, Leads, Needs you, Trends.** Kanban by stage, lead status, the tasks only you can do, the latest research.
- Dark and light themes, keyboard shortcuts `1`–`7` for the tabs, and live sync with the workspace files every few seconds.

Give each company its own accent with `color: "#hex"` in its brief.

| Review | Engagement (light) |
|---|---|
| ![Review](docs/screenshots/review.png) | ![Engagement](docs/screenshots/engagement.png) |

![Team](docs/screenshots/team.png)

| Calendar | Analytics |
|---|---|
| ![Calendar](docs/screenshots/calendar.png) | ![Analytics](docs/screenshots/analytics.png) |

## The org chart

```
You (approve)
└── CMO ─ sets quotas per brand × platform, assembles your batch
    ├── Research:  trend-scout · listening · virality-analyst · x-intelligence
    ├── Quality:   brand-guardian · compliance (incl. AI labels) · humanizer (skill)
    ├── Craft:     localizer (RU, AR/RTL, any language) · media-producer
    ├── Growth:    repurposer · analyst · paid-amplifier · creator-outreach
    ├── Inbound:   community-manager · lead-router · crisis-desk · reputation
    ├── Outbound:  engagement-scout · linkedin-networker · backlink-outreach
    ├── Ops:       publisher · account-setup
    └── Platform teams (lead + specialists)
        YouTube    lead · scriptwriter · thumbnail-designer · editor · seo
        Instagram  lead · reels-writer · carousel-designer · stories
        TikTok     lead · hook-writer · editor
        X          lead · writer · intelligence
        LinkedIn   lead · writer · carousel-designer · networker
        Threads    lead · writer
        Pinterest  lead · designer
        Reddit     lead · writer
        Facebook   lead · writer
        Telegram   lead · writer
        SEO        lead · strategist · writer · backlink-outreach
        Syndication lead · quora-writer · longform-syndicator (Medium, Substack) · newsletter-writer (email, WhatsApp Channel)
```

All agents live in [`agents/`](agents). Each one is a short markdown file you can edit.

## How a week runs

1. **Research.** Trend scout and listening collect what the brand's audience talks about this week; the virality analyst turns the best posts into rules.
2. **Plan.** The CMO creates ideas per brand × platform from the brief's quotas.
3. **Produce.** Each platform lead assigns ideas to its specialists. The repurposer turns one long piece into native posts for every other platform.
4. **Review.** Brand guardian (and compliance for regulated topics) checks every draft; the humanizer runs last; the lead moves it to `review`.
5. **You approve** in the dashboard. The publisher schedules approved items.
6. **Learn.** The analyst writes what worked into `learnings.md`, which every team reads next week.

## Workspace

```
multi-workspace/
  brands/<brand>/brief.md          voice, audience, offers, never-list, active platforms
  brands/<brand>/voice-samples.md  real things you wrote (humanizer input)
  brands/<brand>/learnings.md      do more / stop doing
  content/<brand>/*.md             posts, reels, threads, videos, articles
  engagement/<brand>/*.md          drafted comments, replies, DMs, connection notes
  leads/<brand>/*.md               people with buying intent
  trends/<brand>/<date>.md         weekly research
  brands/<brand>/kit/              palette, type, logo files
  assets/<brand>/<id>/             rendered media
  inbox/<brand>/*.md               comments and DMs pulled from official APIs
  metrics/<brand>/<date>.json      weekly numbers for the analytics view
  tasks/*.md                       things only you can do
```

Full format: [`docs/WORKSPACE.md`](docs/WORKSPACE.md).

## Publishing

MULTI does not hold your social logins. It schedules through a tool you already trust:

- **[Metricool](https://metricool.com)** via its MCP connector (supports "for review" posts).
- **[Postiz](https://github.com/gitroomhq/postiz-app)**, open source and self-hostable, via its MCP server or CLI.

Inbound comments and DMs come in through official APIs (`multi inbox`): Instagram and Facebook via a Meta app on Standard Access for your own Pages, YouTube via a Data API key. See [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

## Security

Built to fail closed: keys only in `~/.multi/secrets.json` (chmod 600, never in the workspace), a dashboard that answers only to localhost or a token, a strict script-hash Content-Security-Policy, CSRF and DNS-rebinding guards, prompt-injection rules for every agent, and CI with gitleaks and CodeQL. Details in [SECURITY.md](SECURITY.md).

## Ground rules

MULTI is built to grow real accounts, not to fake activity:

- Agents never post, comment, DM or send connection requests on their own, and never drive a browser to do it.
- Outbound replies are disclosed as the brand or its founder and must be useful without the link.
- No fake reviews, fake customer stories, sock-puppet accounts, link schemes or engagement pods.
- Platform rules and community rules (subreddit sidebars) win over quotas.

Accounts that work this way are far less likely to be restricted, and their audience trusts them.

## Works well with

- [humanizer](https://github.com/blader/humanizer) by Siqi Chen (bundled, MIT)
- [agency-agents](https://github.com/msitarzewski/agency-agents) for engineering, design and sales roles
- Media tools with MCP servers (Higgsfield, fal, Kling, Canva, Figma) for the editors and designers

## Contributing

New platform teams, better role prompts and dashboard views are welcome. Keep agents short and specific, run `npm test`, and open a PR.

## License

MIT. The bundled humanizer skill is MIT, © 2025 Siqi Chen.
