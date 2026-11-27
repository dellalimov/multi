---
name: multi-publish
description: Schedule every MULTI content item the human approved (status approved) through the connected scheduler (Metricool or Postiz MCP), then mark them scheduled. Use when the user says "publish approved", "schedule what I approved", or invokes /multi:multi-publish.
---

# MULTI publish

Workspace: `$MULTI_WORKSPACE` or `./multi-workspace`.

1. List `content/*/*.md` with `status: approved`. If none, say so and stop.
2. Detect the scheduler: Metricool tools (`createScheduledPost`, `createScheduledPostForReview`) or Postiz (MCP/CLI). If neither is connected, stop and tell the user to connect one.
3. Show the user the list (brand · platform · time · first line) and wait for a yes, unless they already said "publish all approved" in this request.
4. Run `multi-publisher` for each item. Media: pass file paths/URLs listed under `## Assets`; if an asset is only a prompt, skip that item and create a task "render asset for <id>".
5. Report scheduled / skipped / failed with reasons.
