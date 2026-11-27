---
name: multi-weekly
description: Run MULTI's weekly social media cycle for one brand or all brands in the workspace - trends, plan, produce drafts per platform team, lead review, batch for human approval, analytics. Use when the user says "run the week", "weekly cycle", "plan content for <brand>", or invokes /multi:multi-weekly.
---

# MULTI weekly cycle

Workspace: `$MULTI_WORKSPACE` or `./multi-workspace`. Read `MULTI.md` there first; it defines every file and status.

If the user named a brand, run for that brand only. Otherwise run for every folder in `brands/`.

If subagents are available (Claude Code), dispatch each step to the named `multi-*` agent and run independent brands/platforms in parallel. If not, play each role yourself in order, reading that agent's file in the plugin's `agents/` folder for its instructions.

## Steps

1. **Preflight** (you). For each brand check `brands/<brand>/brief.md` exists and has `## Active platforms`. List open `tasks/` with `priority: high`. If a brief is missing, stop that brand and run the `multi-brand-onboarding` skill instead.
2. **Research**: `multi-trend-scout` → `multi-listening` → `multi-virality-analyst`. Output: `trends/<brand>/<today>.md`.
3. **Plan**: `multi-cmo` creates `idea` files with quotas per platform.
4. **Produce**: for each active platform, its `<platform>-lead` assigns ideas, the team writes drafts. Repurposer fans approved long pieces out to other platforms.
5. **Localize**: `multi-localizer` creates `<id>.<lang>.md` copies for every language in the brief's `## Languages` table that targets this platform (RTL rules for Arabic).
6. **Produce media**: `multi-media-producer` renders image/video prompts into hosted assets with the brand kit and pipeline, and sets `ai_generated`.
7. **Review**: each lead runs `multi-brand-guardian` (+ `multi-compliance` for regulated topics, ads and anything `ai_generated`), the `humanizer` skill on all human-facing text, then moves passing items to `review`.
8. **Hand-off** (you). Run `multi doctor` and fix any error it reports. Tell the user how many items per brand are in `review`, the top 3 to look at first, and every open task that blocks next week. Point them to the dashboard: `npx github:dellalimov/multi dashboard` from the folder that holds the workspace (or `node cli/multi.mjs dashboard` in a clone).
9. **After approval** (when the user says so, or next run): `multi-publisher` schedules `approved` items.
10. **End of week**: `multi-analyst` updates `learnings.md` and writes `metrics/<brand>/<date>.json`; `multi-paid-amplifier` proposes boosts; `multi-newsletter-writer` and `multi-longform-syndicator` reuse the week's best pieces.

If `multi notify` is set up (Telegram), run it at the end so the human gets the batch on their phone.

## Limits

- Default quotas come from the brief. Without one: per active platform 3 posts/week, YouTube 1 long + 3 Shorts, blog 1 article.
- Never set anything to `approved`, `scheduled` or `sent`: that is the human's and the publisher's job.
- Keep a run under the brand's `## Weekly budget` (tokens/credits for media) if the brief sets one; skip media generation and leave prompts if it would exceed it.

## Report format

```
MULTI · week of <date>
<brand>: <n> in review (<platform counts>) · <n> engagement drafts · <n> new leads
Look first: <id> — <why>
Blocked: <task ids>
```
