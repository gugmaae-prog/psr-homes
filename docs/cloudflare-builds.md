# Cloudflare Builds — PSR Homes

## Goal

Connect `gugmaae-prog/psr-homes` so Worker builds for `psr-property` (and later companions) come from this repo.

## Connect (dashboard)

1. Open Cloudflare Dashboard → Workers & Pages → **psr-property**
2. **Settings** → **Builds** → **Connect**
3. Authorize GitHub if prompted
4. Select repository **`gugmaae-prog/psr-homes`**, branch **`main`**
5. Leave auto-deploy **off**. The lean app tree is now in this repo, minus `public/` (served via R2 / the live site). Connect Builds only after the release gate below is green.

## Release gate

Do not treat Builds as production deploy until:

- The exact commit to ship is known (lean source is present; `public/` assets stay on R2 / live)
- Manifest / tests / rollback target verified
- No Espacios map Workers, map assets, or secrets are in the tree

Companion Workers (`psr-home-edge`, `psr-media-edge`, `psr-roadshow-dates`, …) get their own Builds connects after their sources live here.
