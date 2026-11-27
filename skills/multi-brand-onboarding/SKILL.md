---
name: multi-brand-onboarding
description: Add a brand to MULTI - interviews the user (or reads their site and existing docs) and writes brands/BRAND/brief.md, voice-samples.md and setup tasks for missing accounts. Use when the user says "add a brand", "onboard BRAND", or a weekly run finds a brand without a brief.
---

# MULTI brand onboarding

Workspace: `$MULTI_WORKSPACE` or `./multi-workspace`.

1. Ask for (or read from the website and any docs the user points to): what the business sells, to whom, in which markets, prices/offers, proof (cases, numbers), competitors, tone, things never to say, regulated topics, which accounts exist on which platforms, scheduler (Metricool brand id or Postiz workspace).
   Ask at most 6 questions at once; fill the rest from the site and mark guesses with `(confirm)`.
2. Copy `templates/brief.md` from the plugin to `brands/<slug>/brief.md` and fill every section. Leave a section with `TODO` rather than inventing.
3. Ask the user for 3–10 real things they wrote (DMs, posts, emails) and save them to `brands/<slug>/voice-samples.md`. The humanizer uses them to sound like the owner.
4. For every platform marked `setup` (no account yet), run `multi-account-setup` and create tasks for the human.
5. Create `brands/<slug>/learnings.md` with empty `## Do more` / `## Stop doing`.
6. Tell the user what is still `TODO` / `(confirm)` in one list.
