# MULTI workspace format

Every agent reads and writes plain markdown files with YAML frontmatter in one
folder: the **workspace**. The dashboard reads the same files. Nothing else
holds state, so the workspace can live in git, Dropbox or iCloud and sync
between machines.

Default location: `./multi-workspace` (override with `MULTI_WORKSPACE=/path`).

```
multi-workspace/
  brands/<brand>/brief.md          brand brief: voice, audience, offers, rules
  brands/<brand>/voice-samples.md  real messages/posts written by the owner (humanizer input)
  brands/<brand>/learnings.md      what worked / what flopped (written by the analyst)
  content/<brand>/<id>.md          one piece of content (post, reel, thread, video...)
  engagement/<brand>/<id>.md       a drafted comment / reply / DM / connection note waiting for a human
  leads/<brand>/<id>.md            a person who showed buying intent
  trends/<brand>/<YYYY-MM-DD>.md   trend + virality report for the week
  tasks/<id>.md                    something only the human can do (connect an account, record a video...)
  log/<YYYY-MM-DD>.md              short run log written by the CMO agent
```

Frontmatter is flat `key: value` pairs (strings, numbers, `true/false`, or
`[a, b]` lists). No nesting, so any tool can parse it.

## content/&lt;brand&gt;/&lt;id&gt;.md

```markdown
---
id: 2026-12-01-visio-instagram-arrival-card-trap
type: content
brand: visio
platform: instagram          # youtube|instagram|tiktok|x|linkedin|threads|pinterest|reddit|blog|facebook
format: reel                 # reel|carousel|post|story|short|video|thread|pin|article|comment
status: draft                # idea → draft → review → approved → scheduled → published  (or rejected)
owner: instagram-lead        # agent currently responsible
pillar: fear-hook
hook: "They let you board. Then Bali sent you back."
scheduled_at: 2026-12-03T19:00+08:00
publish_ref:                 # id returned by Metricool/Postiz after scheduling
review_note:                 # why the human or a lead sent it back
created: 2026-12-01
---
## Caption
...
## Script / slides
...
## Assets
- prompt or file path for each visual
## Sources
- link for every fact used
```

## engagement/&lt;brand&gt;/&lt;id&gt;.md

```markdown
---
id: 2026-12-01-visio-reddit-voa-question
type: engagement
brand: visio
platform: reddit
kind: comment                # comment|reply|dm|connection|mention
status: pending              # pending → approved → sent   (or skipped)
target_url: https://reddit.com/r/bali/comments/...
target_author: u/someone
reason: Asks how long VoA extension takes; we can answer from experience
disclosure: "I run Visio, a visa tracker"   # how the brand is identified in the message
created: 2026-12-01
---
## Their post (summary)
...
## Draft
...
```

A human sends every engagement item. Agents never post comments, DMs or
connection requests by themselves.

## leads/&lt;brand&gt;/&lt;id&gt;.md

```markdown
---
id: 2026-12-02-movd-ig-dm-sofa
type: lead
brand: movd
platform: instagram
status: new                  # new → contacted → qualified → won | lost
name: "@handle"
intent: Wants to sell a sofa before moving out on Dec 20
value: medium                # low|medium|high
next_step: Send listing link + pickup slots
created: 2026-12-02
---
Conversation notes...
```

## tasks/&lt;id&gt;.md

```markdown
---
id: connect-dealbridge-linkedin
type: task
brand: dealbridge
status: open                 # open → done
priority: high               # low|medium|high
created: 2026-12-01
---
Create the DealBridge LinkedIn company page and connect it in Metricool.
```

## Status rules

- `idea → draft`: the platform team writes it.
- `draft → review`: only the platform **Lead**, after Brand Guardian and the
  humanizer pass. `review` means "the team signed off, waiting for the human".
- `review → approved | rejected`: only the **human**, in the dashboard.
- `approved → scheduled`: the publisher agent, after Metricool/Postiz accepts it.
- `scheduled → published`: the publisher or analyst, once it is live.
- `rejected` and `skipped` items stay on disk so the analyst can learn from them.
- Every agent that changes a status appends one line to `log/<date>.md`.
