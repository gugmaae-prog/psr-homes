# PSR Cloudflare route boundary

Verified 24 September 2026.

## Public edge

`psr-media-edge` is the outer router for `psrhomes.ae/*` and `www.psrhomes.ae/*`.

Public fingerprint evidence:

- `/` carries `x-psr-home-edge: 3` and `x-psr-media-cutover: r2-v2`.
- `/events/roadshow` is 200 in production but 404 on direct `psr-property` origin.
- `/projects` carries the media-edge marker and differs from the origin body.
- Jumanah's Dubai South presentation differs from the origin body and is handled by its dedicated edge.

## Origin Worker

`psr-property` is the application/service origin.

It is reached through:

- Cloudflare service bindings from edge Workers
- custom origin domain `psr.espacios.me`

It must **not** also claim the public wildcard route.

This boundary prevents a future `psr-property` deployment (including the Sonu Durable
Object migration) from replacing the media-edge production route.
