# psr-property

Primary PSR Homes site app (Next.js / ViNext). Production config is `wrangler.jsonc` at the repository root.

This directory is a stub. The application tree is not here. See `STATUS.md`.

## Routes

Declared in `wrangler.jsonc`:

| Pattern | Attachment |
|---------|------------|
| `psrhomes.ae/*` | zone `psrhomes.ae` |
| `www.psrhomes.ae/*` | zone `psrhomes.ae` |
| `psr.espacios.me` | `custom_domain: true` |

`workers_dev` is `false`.

## Entrypoint named by config

`main` is `./dist/server/index.js`. That build output is not in this repo (`/dist/` is gitignored).
