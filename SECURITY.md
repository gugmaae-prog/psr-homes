# Security Policy

This repository is public. Treat all commits, branches, pull requests, and history as internet-visible.

## Never commit

- Cloudflare API tokens, Wrangler authentication state, D1/R2 credentials, email credentials, or secret values
- Supabase service-role/secret keys, database passwords, OAuth tokens, or private API keys
- PSR leads, CRM exports, event attendee exports, agent conversations, customer messages, KYC data, or private staff data
- Sonu private memory or private prompt/context data
- `.env` files, production backups, database dumps, or raw logs containing private records

Non-secret resource IDs and secret **names** may be documented. Secret values stay in the platform secret store.

## PSR / Sonu boundary

Sonu is PSR-only. Grace data and credentials belong to Haus & Grace and must not appear in PSR runtime data.

## Production deployment

Do not enable Cloudflare Builds for `psr-property` or companion Workers until the full source tree for that Worker is present in this repository and the live bindings/routes have been reconciled.

## Security incident reporting

Do not paste a discovered secret or private record into a public issue. Contact the owner privately, revoke/rotate the credential, and assess Git history exposure.
