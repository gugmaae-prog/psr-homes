# PSR Workers (non-map)

`psr-property` application source now lives at the repository root (lean tree, without `public/`). See `workers/psr-property/STATUS.md`. Companion Worker entrypoints that shipped with the app are under `worker/`; the table below is the non-map inventory.

| Worker | Role |
|--------|------|
| `psr-property` | Primary site app |
| `psr-home-edge` | Homepage edge rewrites / cache |
| `psr-media-edge` | `/projects*`, `/media/*`, roadshow routing |
| `psr-roadshow-dates` | Singapore roadshow date HTML rewrite |
| `psr-projects-clean` | `/projects` index proxy tweaks |
| `psr-shell-events` | Events shell routing |

**Excluded:** `psr-portfolio-map*`, `psr-map-*` previews — Espacios map boundary.
