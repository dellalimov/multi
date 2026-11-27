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
  brands/<brand>/kit/              brand kit: kit.md (palette, type, rules) + logo files
  assets/<brand>/<id>/             generated or uploaded media for one content item
  inbox/<brand>/<id>.md            raw inbound comments/DMs pulled by `multi inbox` (official APIs)
  metrics/<brand>/<YYYY-MM-DD>.json  weekly metrics snapshot written by the analyst
  tasks/<id>.md                    something only the human can do (connect an account, record a video...)
  log/<YYYY-MM-DD>.md              short run log written by the CMO agent
```

Frontmatter is flat `key: value` pairs (strings, numbers, `true/false`, or
`[a, b]` lists). No nesting, so any tool can parse it.

## content/&lt;brand&gt;/&lt;id&gt;.md

```markdown
---
id: 2026-12-01-lumen-instagram-neck-reset
type: content
brand: lumen
platform: instagram          # youtube|instagram|tiktok|x|linkedin|threads|pinterest|reddit|blog|facebook
format: reel                 # reel|carousel|post|story|short|video|thread|pin|article|comment
status: draft                # idea → draft → review → approved → scheduled → published  (or rejected)
owner: instagram-lead        # agent currently responsible
pillar: desk-pain
hook: "Your neck after a 3-hour Zoom. Fix it before your next call."
scheduled_at: 2026-12-02T18:30+00:00
publish_ref:                 # id returned by Metricool/Postiz after scheduling
lang: en                     # content language; localized copies are <id>.<lang>.md with source: <id>
dir: ltr                     # rtl for Arabic, Hebrew, Farsi, Urdu
ai_generated: false          # true if it shows realistic AI-generated people, voices or scenes
ai_label:                    # required → publisher must set the platform's AI label
review_note:                 # why the human or a lead sent it back
created: 2026-12-01
---
## Caption
...
## Script / slides
...
## Assets
- url: https://... | file: assets/<brand>/<id>/cover.jpg | kind: image
- prompt: <image prompt still to render>
## Sources
- link for every fact used
```

## engagement/&lt;brand&gt;/&lt;id&gt;.md

```markdown
---
id: 2026-12-01-lumen-reddit-neck
type: engagement
brand: lumen
platform: reddit
kind: comment                # comment|reply|dm|connection|mention
status: pending              # pending → approved → sent   (or skipped)
target_url: https://reddit.com/r/lisbon/comments/...
target_author: u/someone
reason: Asks for a yoga class for desk neck pain; subreddit allows recommendations
disclosure: "I teach at Lumen, so I'm biased"   # how the brand is identified in the message
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
id: 2026-12-02-lumen-ig-dm-team
type: lead
brand: lumen
platform: instagram
status: new                  # new → contacted → qualified → won | lost
name: "@handle"
intent: Asks about weekly classes for a 12-person team
value: medium                # low|medium|high
next_step: Send corporate pricing and offer a trial date
created: 2026-12-02
---
Conversation notes...
```

## tasks/&lt;id&gt;.md

```markdown
---
id: lumen-linkedin-page
type: task
brand: lumen
status: open                 # open → done
priority: high               # low|medium|high
created: 2026-12-01
---
Create the Lumen LinkedIn company page and connect it in Postiz.
```

## metrics/&lt;brand&gt;/&lt;date&gt;.json

```json
{
  "brand": "lumen",
  "week_ending": "2026-12-07",
  "platforms": {
    "instagram": { "followers": 4210, "reach": 18400, "engagement": 960, "saves": 210, "clicks": 88, "leads": 4, "posts": 5 },
    "tiktok": { "followers": 1300, "reach": 22100, "engagement": 1400, "clicks": 12, "leads": 1, "posts": 3 }
  }
}
```

Any metric may be missing. The dashboard charts whatever weeks exist.

## inbox/&lt;brand&gt;/&lt;id&gt;.md

Written by `multi inbox`. The community manager turns each into an engagement draft and sets `handled: true`.

```markdown
---
id: ig-comment-17890000000000000
type: inbox
brand: lumen
platform: instagram
kind: comment                # comment | dm
from: "@someone"
url: https://www.instagram.com/p/...
received: 2026-12-01T09:12:00Z
handled: false
---
Do you have classes on Sunday?
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
