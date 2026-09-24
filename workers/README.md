# PSR Workers (non-map)

Placeholder layout for Cloudflare Worker sources. Full application trees sync next.

| Worker | Role |
|--------|------|
| `psr-property` | Primary site app |
| `psr-home-edge` | Homepage edge rewrites / cache |
| `psr-media-edge` | `/projects*`, `/media/*`, roadshow routing |
| `psr-roadshow-dates` | Singapore roadshow date HTML rewrite |
| `psr-projects-clean` | `/projects` index proxy tweaks |
| `psr-shell-events` | Events shell routing |

**Excluded:** `psr-portfolio-map*`, `psr-map-*` previews — Espacios map boundary.
