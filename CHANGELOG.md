# Changelog

## 0.3.0
- Security: Host allowlist (DNS rebinding), optional token login with HttpOnly SameSite cookie (forced when exposed), script-hash CSP and security headers, JSON-only same-origin writes, secrets file permission check, `doctor` secret scan, prompt-injection rules for all agents, `untrusted` inbox files, gitleaks + CodeQL + private-data CI.
- Dashboard: Team org chart with live agent activity from the logs, "Waiting on your yes" hero, "What interrupts the loop" panel, Telegram/WhatsApp/Quora/Medium/Substack channel colors.

## 0.2.0
- 56 agents: localization (RU, AR with RTL), media producer, Telegram, Facebook, Quora / Medium / Substack, newsletter and WhatsApp Channel teams.
- AI-content disclosure: `ai_generated` / `ai_label` checked by compliance and the publisher.
- Dashboard: media previews in phone frames, inline editing, bulk approve, RTL, calendar, analytics charts.
- CLI: `doctor`, `secrets`, `inbox` (Instagram, Facebook, YouTube official APIs), `notify` and `telegram` (approve from your phone).
- Brand kits: `brands/<brand>/kit/`.
- Docs: INTEGRATIONS.md, AUTOMATION.md. CI on Node 18/20/22.

## 0.1.x
- First release: 46 agents, weekly cycle, engagement queue, local dashboard.
