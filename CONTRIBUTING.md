# Contributing

Thanks for helping MULTI grow.

- **Agents** live in `agents/` as short markdown files. Keep them specific: what the agent reads, what it writes, which platform rules apply. Every agent ends with the shared "Always" rules (no autonomous posting, humanizer last, sources for facts).
- **Workspace format** is defined in `docs/WORKSPACE.md`. If you add a field or folder, update that file, `lib/doctor.mjs`, and the dashboard if it should show it.
- **Dashboard and CLI** have zero runtime dependencies on purpose. Node 18+ standard library only.
- Run `npm test` and `node cli/multi.mjs doctor --workspace examples/workspace` before opening a PR.

Ground rules for contributions: nothing that automates posting, commenting, DMs or follows without a human; nothing that hides that a message comes from a brand; no scraping behind logins.
