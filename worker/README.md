# PSR Worker Rules

These rules apply to Cloudflare Worker responses, AI prompts, chat replies,
emails, generated reports, and interface content returned by backend routes.

## No emoji

- Do not add emoji to public, mobile, authenticated, administrator, chat,
  email, or PDF content.
- Use the existing CSS or SVG icon language when a visual indicator is needed.
- Keep every icon accessible with a text label or `aria-label`.
- Run the design-system tests before deployment. They scan application and
  Worker source and fail if emoji characters are introduced.

## Grounded recommendations

- Do not invent inventory, pricing, return, availability, or unit-level facts.
- Keep project entry prices separate from unit prices.
- Do not use apartment bedroom inventory to satisfy a villa, townhouse, or
  mansion request.
- Keep navigation routes as real PSR links so every recommended project opens
  its canonical detail page.
