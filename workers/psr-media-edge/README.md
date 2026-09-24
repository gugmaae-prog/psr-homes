# psr-media-edge

Role recorded in `workers/README.md`: `/projects*`, `/media/*`, and roadshow routing.

Config: `wrangler.media-edge.jsonc`. This directory is a stub. The file named by `main` (`worker/media-edge.ts`) is not in the repo.

The route list in that config is wider than the role line above. Patterns below are copied from the config only.

## Routes

Declared in `wrangler.media-edge.jsonc` (zone `psrhomes.ae` on every row):

| Pattern |
|---------|
| `psrhomes.ae/media/external/*` |
| `www.psrhomes.ae/media/external/*` |
| `psrhomes.ae/events/roadshow` |
| `psrhomes.ae/events/roadshow/` |
| `www.psrhomes.ae/events/roadshow` |
| `www.psrhomes.ae/events/roadshow/` |
| `psrhomes.ae/events/roadshow*` |
| `www.psrhomes.ae/events/roadshow*` |
| `psrhomes.ae/projects` |
| `psrhomes.ae/projects/` |
| `www.psrhomes.ae/projects` |
| `www.psrhomes.ae/projects/` |
| `psrhomes.ae/` |
| `www.psrhomes.ae/` |
| `psrhomes.ae/*` |
| `www.psrhomes.ae/*` |

`workers_dev` is `false`.

## Service bindings in that config

All `environment: production`.

| Binding | Worker |
|---------|--------|
| `HOME` | `psr-home-video-guard` |
| `ROADSHOW` | `psr-roadshow-dates` |
| `ROADSHOW_BROCHURE` | `psr-roadshow-brochure` |
| `ROADSHOW_PLAN` | `psr-roadshow-plan` |
| `ROADSHOW_NURTURE` | `psr-roadshow-nurture` |
| `PROJECTS` | `psr-projects-clean` |
| `SHELL` | `psr-shell-events` |

R2 binding: `MEDIA` → bucket `psr-property-media`.

This repo stubs only the non-map companions named in `workers/README.md`. It does not add source for the other service names above, and it does not add map Workers.
