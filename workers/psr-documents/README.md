# Complete PSR Terms and FAQ — 26 November 2026

The user-supplied Terms & Conditions and Frequently Asked Questions PDFs are the copy authority. `document-content.mjs` preserves all 16 Terms sections, 7 FAQ categories and 41 question-and-answer pairs in source order. Only repeated PDF running headings, page numbers and line wrapping are removed. The Terms date remains “Last updated: November 2026.” Source PDF hashes are recorded alongside the text.

The application source also renders this content through `data/legal-content.ts`, `app/terms/page.tsx` and `app/faq/page.tsx`; its footer and sitemap include `/faq`. The application repository predates the live deployment and must not be rebuilt over production until the existing parity gate is satisfied.

## Live integration

Use the current deployed sources of two existing Workers:

- `psr-shell-events`: serve `/terms` and `/faq` before calling the main application; canonicalize www, trailing-slash and `/faqs` variants; add document navigation and the FAQ footer link to successful public HTML.
- `psr-projects-clean`: apply the same navigation helper to the project catalogue HTML, preserving its existing transformations.

The two Workers have service bindings only. This release introduces no storage binding or database migration and uploads neither PDF to R2 or Supabase. The main edge Worker and all route ownership remain unchanged.

An attempted media-edge staging deployment was rejected by Cloudflare with code 10136 because its existing R2 bucket is disabled. Uploaded media-edge version `13bb6263-6540-4e65-a1fa-e32d1bd48759` was never deployed and is not this release's implementation. Do not promote it or enable R2 for this content change.

`apply-live-patch.mjs` checks the exact downloaded live module's SHA-256 before making the narrow integration patch. The original live bundles are not republished in this repository. Reconcile a newer version instead of bypassing the hash guard.

The shell upload contains the patched entry module plus `public-documents.mjs`, `document-navigation.mjs`, `document-content.mjs`, and `document-chrome.mjs`. The catalogue upload contains its patched entry module plus `document-navigation.mjs`. Preserve each Worker's live compatibility settings and service bindings.

Full navigation ensures that the older client router cannot restore the superseded Terms page or treat the new FAQ route as missing. The document pages use the live site's appearance, native mobile navigation and theme controls. All answers remain visible and the FAQ schema is generated from the same complete text.

## Verification and rollback

Compare the rendered headings, paragraphs, questions and answers against the source PDFs. Check desktop/mobile layouts, canonical URLs, theme and mobile menu controls, and ordinary navigation to both documents. Stage each new version at 0% while the previous version retains 100%, then verify using a version override and release markers before promotion.

Baseline versions:

- Shell: `8d498bc0-9114-40a4-8ec5-2aa3ee540859`, deployment `959c24fb-3198-44f0-ac2d-e63c0e04abab`.
- Catalogue: `f8fbb81b-6d65-44b6-86a5-52799b3905c3`, deployment `884c4fc6-a13c-41d9-b389-fc5ee3b081b8`.

Rollback sets the respective baseline version to 100%; there is no storage migration to reverse. The source application's sitemap addition takes effect with a future reconciled application release. This targeted release exposes the FAQ through live links and preserves existing sitemap route ownership.
