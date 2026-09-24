# psr-projects-clean

Role recorded in `workers/README.md`: `/projects` index proxy tweaks.

This directory is a stub. The repo has no Wrangler config and no source for this Worker, so **no routes are declared here**.

Known reference: `wrangler.media-edge.jsonc` binds service `PROJECTS` to `psr-projects-clean`, environment `production`. The `/projects` and `/projects/` patterns in that file are routes of `psr-media-edge`, not routes of this Worker.

A Worker named `psr-projects-clean` exists on the Cloudflare account. Its route list is not copied into this repo.
