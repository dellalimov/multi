# Security

MULTI touches brand accounts, so it is built to fail closed.

## Design

| Risk | Protection |
|---|---|
| Stolen API keys | Keys live only in `~/.multi/secrets.json` (outside the workspace and the repo). MULTI refuses to read it if other users can (`chmod 600`). Agents never read it. `multi doctor` fails if a token-shaped string appears anywhere in the workspace. |
| Another website talking to your local dashboard (CSRF, DNS rebinding) | The dashboard binds to 127.0.0.1, answers only to `localhost`/`127.0.0.1` Host names (plus hosts you allow), accepts writes only as same-origin `application/json`. |
| Exposing the dashboard through a tunnel | `--allow-host` forces a random token; the token becomes an HttpOnly, SameSite=Strict (Secure over HTTPS) cookie. Put Cloudflare Access or similar in front as a second layer. |
| Script injection in the dashboard | Strict Content-Security-Policy: the only script allowed is the page's own, by SHA-256 hash; no inline handlers, no eval, no framing. All workspace text is HTML-escaped; links must be http(s). Media is served from `assets/` only, sandboxed, with path-traversal checks. |
| Prompt injection through comments, DMs, web pages | Every agent treats outside text as data, never instructions; inbox files are marked `untrusted: true` and capped in length. Agents cannot post, comment, DM or follow on their own; a human approves or sends everything. |
| Telegram bot abuse | The bot obeys only the configured `chat_id`. |
| Leaking private brand data to the public repo | `.gitignore` excludes workspaces and secrets; CI fails if a workspace or secrets file is committed; gitleaks scans every push and the full history weekly; CodeQL (security-extended) scans the code. |
| Supply chain | Zero runtime dependencies. Node standard library only. |

## Recommended GitHub settings (owner)

- Two-factor authentication on the account.
- Settings → Code security: enable **Secret scanning** and **Push protection**, **Dependabot alerts**, **Private vulnerability reporting**.
- Settings → Branches: protect `main` (require pull request + status checks `test` and `security`).

## Reporting

Report vulnerabilities privately through GitHub's **Report a vulnerability** button on this repository. Please don't open public issues for security problems.
