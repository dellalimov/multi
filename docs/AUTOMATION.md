# Automation

MULTI has two kinds of work:

| Work | Needs Claude? | How to run it automatically |
|---|---|---|
| Weekly cycle, daily engagement drafts, publishing | yes | Claude scheduled tasks (desktop app) |
| Pulling inbox, Telegram summary, Telegram buttons | no (plain Node) | cron / launchd on your Mac |

## Claude scheduled tasks

In the Claude desktop app, with the folder that holds your workspace connected, create scheduled tasks like these (or ask Claude: "schedule the MULTI runs"):

| When | Prompt |
|---|---|
| Daily 07:10 | `Run /multi:multi-daily-engagement for all brands in ~/MULTI/multi-workspace.` |
| Monday 06:40 | `Run /multi:multi-weekly for all brands in ~/MULTI/multi-workspace, then run multi notify.` |
| Daily 18:20 | `Run /multi:multi-publish for items I approved in ~/MULTI/multi-workspace.` |
| Sunday 19:15 | `Run the multi-analyst agent for all brands in ~/MULTI/multi-workspace.` |

Scheduled runs never approve anything: they fill the review and engagement queues, and publish only what you approved.

## Inbox and Telegram on macOS (launchd)

Install once:

```bash
npm i -g github:dellalimov/multi        # gives you the `multi` command
multi secrets                           # then fill ~/.multi/secrets.json
```

Inbox every 30 minutes + Telegram bot always on. Save as `~/Library/LaunchAgents/com.multi.telegram.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.multi.telegram</string>
  <key>ProgramArguments</key><array>
    <string>/bin/zsh</string><string>-lc</string>
    <string>multi telegram --workspace ~/MULTI/multi-workspace</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/multi-telegram.log</string>
  <key>StandardErrorPath</key><string>/tmp/multi-telegram.log</string>
</dict></plist>
```

and `~/Library/LaunchAgents/com.multi.inbox.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.multi.inbox</string>
  <key>ProgramArguments</key><array>
    <string>/bin/zsh</string><string>-lc</string>
    <string>multi inbox --workspace ~/MULTI/multi-workspace</string>
  </array>
  <key>StartInterval</key><integer>1800</integer>
  <key>StandardOutPath</key><string>/tmp/multi-inbox.log</string>
  <key>StandardErrorPath</key><string>/tmp/multi-inbox.log</string>
</dict></plist>
```

Load both:

```bash
launchctl load ~/Library/LaunchAgents/com.multi.telegram.plist
launchctl load ~/Library/LaunchAgents/com.multi.inbox.plist
```

Linux: the same commands work from cron (`*/30 * * * * multi inbox --workspace ...`) and a systemd user service for `multi telegram`.

## Dashboard from your phone

The dashboard listens on localhost only. For phone access either use the Telegram bot, or expose it privately with Cloudflare Tunnel plus Cloudflare Access (email login):

```bash
cloudflared tunnel --url http://localhost:4747
```

Put Cloudflare Access in front before sharing the URL; the dashboard has no login of its own.
