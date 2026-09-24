import socialCalendarMarkup from "./psr-instagram-calendar.html?raw";

const headers = {
  "cache-control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400",
  "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "content-type": "text/html; charset=utf-8",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

const document = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <meta name="description" content="PSR Homes four-week social media calendar and Instagram grid.">
    <title>PSR Social Media Calendar | PSR Homes</title>
    <link rel="icon" href="/favicon-light-32.png" type="image/png">
    <style>
      :root { color-scheme: dark; background: #080808; }
      html, body { min-height: 100%; }
      body { margin: 0; padding: clamp(0px, 2vw, 28px); background: #080808; }
      main { width: min(100%, 1440px); margin: 0 auto; }
      @media (max-width: 520px) { body { padding: 0; } }
    </style>
  </head>
  <body>
    <main>${socialCalendarMarkup}</main>
  </body>
</html>`;

export async function GET() {
  return new Response(document, { headers });
}

export async function HEAD() {
  return new Response(null, { headers });
}
