# Cloudflare Builds — PSR Homes

## Goal

Connect `gugmaae-prog/psr-homes` so Worker builds for `psr-property` (and later companions) come from this repo.

## Connect (dashboard)

1. Open Cloudflare Dashboard → Workers & Pages → **psr-property**
2. **Settings** → **Builds** → **Connect**
3. Authorize GitHub if prompted
4. Select repository **`gugmaae-prog/psr-homes`**, branch **`main`**
5. Set build/deploy commands only after full app source is synced (do not enable auto-deploy while the tree is docs/scaffold only)

## Release gate

Do not treat Builds as production deploy until:

- Source authority for the full app is in this repo
- Exact commit is known
- Manifest / tests / rollback target verified

Companion Workers (`psr-home-edge`, `psr-media-edge`, `psr-roadshow-dates`, …) get their own Builds connects after their sources live here.
