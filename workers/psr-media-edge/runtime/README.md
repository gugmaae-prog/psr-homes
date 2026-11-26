# PSR Terms and FAQ content release — 26 November 2026

The user-supplied Terms & Conditions and Frequently Asked Questions PDFs are the copy authority. `document-content.mjs` preserves every substantive heading, paragraph and answer: 16 Terms sections, 7 FAQ categories and 41 Q&As. Only PDF running headings, page numbers and line wrapping are removed. The Terms date remains “Last updated: November 2026.” Source SHA-256 values are recorded in the content module.

The source application also renders the same text through `data/legal-content.ts`, `app/terms/page.tsx` and `app/faq/page.tsx`. Its shared footer and sitemap include `/faq`.

## Production integration

The checked-in main application is older than production. This content release must not rebuild or deploy that old app or `worker/media-edge.ts` over the current runtime.

The live content handler is added to the exact deployed `psr-media-edge` source. It serves only `/terms` and `/faq` on the PSR apex and www hosts, canonicalizes `/faqs` and trailing-slash aliases, and adds a FAQ link to public HTML footers. Full document navigation prevents the old client router from restoring the superseded Terms body. The original application, media handling, service bindings and storage behavior remain in place. Neither PDF is uploaded to R2 or Supabase by this release.

The original runtime is not republished in this repository. `apply-live-patch.mjs` accepts a previously downloaded, verified live module and checks its exact SHA-256 before applying three narrow changes. Reconcile any newer live version instead of bypassing the guard.

The upload comprises four module files: the patched `worker.mjs`, `public-documents.mjs`, `document-content.mjs`, and `document-chrome.mjs`. Preserve the live compatibility settings and all existing bindings. No secret values are required or changed. `document-chrome.mjs` preserves the current site's header/footer appearance, with native mobile navigation and theme controls; these supplied English documents do not expose inactive translation controls.

## Verification and rollback

Before promotion, render both pages, compare every section/question/answer to the supplied documents, check desktop/mobile layout, and verify the new version using a version override while the previous version retains 100% of ordinary traffic. Confirm the release header as well as HTTP status. Verify navigation from a live public page to each document. Keep the previous deployment version available for rollback.

The baseline before this release is `998be34b-9c55-4357-b079-d441cb54f83d` (deployment `5bb2f4f8-9911-44ff-9a59-d0c3cd99ad68`). Rollback consists of deploying that version to 100%; this release has no database or storage migration to reverse.

The source application sitemap update takes effect with a future reconciled application release; this targeted production release exposes the FAQ through live footer and document-page links without changing sitemap route ownership.
