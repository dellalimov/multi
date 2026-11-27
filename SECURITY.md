# Security

- API keys belong in `~/.multi/secrets.json`, never in the workspace or the repo.
- The dashboard binds to 127.0.0.1 and rejects cross-origin writes. If you expose it (tunnel), put authentication in front of it.
- Workspace media is served sandboxed from `/assets/` only.

Report vulnerabilities privately through GitHub security advisories on this repository.
