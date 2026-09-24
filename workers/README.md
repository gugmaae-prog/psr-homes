# PSR Workers (non-map)

Documentation stubs only. Full application trees are not in these directories.

| Worker | Role | Stub |
|--------|------|------|
| `psr-property` | Primary site app | [`psr-property/README.md`](psr-property/README.md) |
| `psr-home-edge` | Homepage edge rewrites / cache | [`psr-home-edge/README.md`](psr-home-edge/README.md) |
| `psr-media-edge` | `/projects*`, `/media/*`, roadshow routing | [`psr-media-edge/README.md`](psr-media-edge/README.md) |
| `psr-roadshow-dates` | Singapore roadshow date HTML rewrite | [`psr-roadshow-dates/README.md`](psr-roadshow-dates/README.md) |
| `psr-projects-clean` | `/projects` index proxy tweaks | [`psr-projects-clean/README.md`](psr-projects-clean/README.md) |
| `psr-shell-events` | Events shell routing | [`psr-shell-events/README.md`](psr-shell-events/README.md) |

Routes in those stubs come from `wrangler.jsonc`, `wrangler.home-edge.jsonc`, and `wrangler.media-edge.jsonc`. The last three Workers have no Wrangler file here, so their stubs do not invent routes.

`psr-property` app status: [`psr-property/STATUS.md`](psr-property/STATUS.md).

**Excluded:** `psr-portfolio-map*`, `psr-map-*` previews — Espacios map boundary.
