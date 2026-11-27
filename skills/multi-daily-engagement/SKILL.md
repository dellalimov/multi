---
name: multi-daily-engagement
description: MULTI daily engagement run - social listening, inbound comments/DMs, outbound reply opportunities, LinkedIn connection notes, lead follow-ups. Produces drafts in a queue the human sends. Use when the user says "engagement", "replies for today", "check DMs/comments", or invokes /multi:multi-daily-engagement.
---

# MULTI daily engagement

Workspace: `$MULTI_WORKSPACE` or `./multi-workspace`. Read `MULTI.md` first.

Everything this skill produces is a **draft** in `engagement/<brand>/` with `status: pending`. The human reads, edits and sends each one from their own account (the dashboard has a copy button and opens the target link). Agents do not post, comment, DM or send connection requests, and do not drive a browser to do so.

## Steps (per brand)

1. `multi-listening`: mentions, competitor moves, pain-point conversations from the last 24–48 h.
2. `multi-community-manager`: inbound on the brand's own accounts (Metricool inbox, platform APIs, or messages the user pastes). Drafts replies; FAQ topics the brief allows may be marked `auto_ok: true` for an official auto-reply tool.
3. `multi-engagement-scout` (+ `multi-x-intelligence` for X): up to 20 outbound reply drafts, each disclosed as the brand or its founder, each useful without the link.
4. `multi-linkedin-networker` (B2B brands): up to 15 connection notes.
5. `multi-lead-router`: qualify new leads, draft follow-ups, flag leads older than 48 h.
6. `multi-crisis-desk` only if a complaint was flagged.
7. `humanizer` on every draft, with `brands/<brand>/voice-samples.md`.

## Report

```
MULTI · engagement <date>
<brand>: <n> drafts (<platform counts>) · <n> new leads · <n> escalations
```
