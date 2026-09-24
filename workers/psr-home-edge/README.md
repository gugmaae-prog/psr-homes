# psr-home-edge

Role recorded in `workers/README.md`: homepage edge rewrites / cache.

Config: `wrangler.home-edge.jsonc`. This directory is a stub. The file named by `main` (`worker/home-edge.ts`) is not in the repo.

## Routes

Declared in `wrangler.home-edge.jsonc`:

| Pattern | Zone |
|---------|------|
| `psrhomes.ae/` | `psrhomes.ae` |
| `www.psrhomes.ae/` | `psrhomes.ae` |

`workers_dev` is `false`.

Service binding in that config: `ORIGIN` → Worker `psr-property`, environment `production`.
