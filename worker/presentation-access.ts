const PRESENTATION_PATH = "/advisors/jumanah/dubai-south";
const ACCESS_COOKIE = "psr_jumanah_dubai_south";
const SESSION_SECONDS = 12 * 60 * 60;
const MAX_LOGIN_ATTEMPTS = 5;
const PRIVATE_FILES = new Map([
  ["ready.pdf", "application/pdf"],
  ["under.pdf", "application/pdf"],
  ["above.pdf", "application/pdf"],
  ["presentation.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
]);
const FILE_PREFIX = "client-presentations/jumanah/dubai-south/2026-09-12/";

type PresentationAccessEnv = Env & {
  JUMANAH_PRESENTATION_ACCESS_CODE?: string;
  JUMANAH_PRESENTATION_COOKIE_SECRET?: string;
};

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replaceAll("\0", "").trim().slice(0, max)
    : "";
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

async function constantTimeMatch(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < Math.min(leftBytes.length, rightBytes.length); index += 1) {
    mismatch |= leftBytes[index] ^ rightBytes[index];
  }
  return mismatch === 0;
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function cookieValue(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(value.join("="));
    } catch {
      return "";
    }
  }
  return "";
}

function sessionCookie(token: string) {
  return `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=${PRESENTATION_PATH}; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

async function createSessionToken(secret: string) {
  const expires = Date.now() + SESSION_SECONDS * 1_000;
  const payload = `${expires}.${crypto.randomUUID().replaceAll("-", "")}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function hasValidPresentationSession(request: Request, env: PresentationAccessEnv) {
  const secret = clean(env?.JUMANAH_PRESENTATION_COOKIE_SECRET, 512);
  const token = cookieValue(request, ACCESS_COOKIE);
  if (!secret || token.length < 90 || token.length > 220) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresValue, nonce, signature] = parts;
  const expires = Number(expiresValue);
  if (!Number.isFinite(expires) || expires <= Date.now() || expires > Date.now() + SESSION_SECONDS * 1_000) return false;
  if (!/^[a-f0-9]{32}$/i.test(nonce) || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return constantTimeMatch(signature, await hmac(secret, `${expiresValue}.${nonce}`));
}

function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const isLocalHost = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1";
  try {
    const requestUrl = new URL(request.url);
    if (origin === "null") return request.headers.get("sec-fetch-site") === "same-origin";
    const originUrl = new URL(origin);
    if (originUrl.host === requestUrl.host) return true;
    return isLocalHost(originUrl.hostname) && isLocalHost(requestUrl.hostname);
  } catch {
    return false;
  }
}

async function rateLimitKey(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  return `jumanah-dubai-south:${hex(await sha256(ip))}`;
}

async function enforceLoginRateLimit(request: Request, env: PresentationAccessEnv) {
  const key = await rateLimitKey(request);
  const row = await env.DB.prepare(
    `INSERT INTO hg_agent_rate_limits ("key", window_started_at, "count")
     VALUES (?, CURRENT_TIMESTAMP, 1)
     ON CONFLICT("key") DO UPDATE SET
       "count" = CASE
         WHEN datetime(window_started_at, '+15 minutes') <= CURRENT_TIMESTAMP THEN 1
         ELSE "count" + 1
       END,
       window_started_at = CASE
         WHEN datetime(window_started_at, '+15 minutes') <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
         ELSE window_started_at
       END
     RETURNING "count"`,
  ).bind(key).first<{ count: number }>();
  return { allowed: (row?.count ?? MAX_LOGIN_ATTEMPTS + 1) <= MAX_LOGIN_ATTEMPTS, key };
}

function accessPage(request: Request, message = "", status = 200) {
  const isHead = request.method === "HEAD";
  const error = message
    ? `<p class="error" role="alert">${message}</p>`
    : "";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
  <title>Private Dubai South presentation | PSR Homes</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,Arial,sans-serif;background:#05070a;color:#f4f6f8}*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;background:radial-gradient(circle at 76% 18%,rgba(180,151,96,.12),transparent 28rem),#05070a}main{width:min(1120px,calc(100% - 32px));min-height:min(700px,calc(100vh - 32px));display:grid;grid-template-columns:minmax(0,1.22fr) minmax(330px,.78fr);overflow:hidden;border:1px solid rgba(229,235,243,.17);border-radius:24px;background:#0c0f14;box-shadow:0 36px 90px rgba(0,0,0,.46)}.cover{position:relative;min-height:560px;overflow:hidden;background:#0a0d11}.cover>img{width:100%;height:100%;display:block;object-fit:cover;object-position:50% 45%}.cover:after{position:absolute;inset:0;content:"";background:linear-gradient(90deg,rgba(3,5,8,.88),rgba(3,5,8,.38) 62%,rgba(3,5,8,.12)),linear-gradient(0deg,rgba(3,5,8,.58),transparent 54%)}.cover-copy{position:absolute;z-index:1;inset:38px;display:grid;align-content:space-between}.cover-copy>img{width:68px;height:68px;object-fit:contain}.cover-copy div{display:grid;gap:8px}.eyebrow{margin:0;color:#d3dae3;font-size:10px;font-weight:650;letter-spacing:.17em;text-transform:uppercase}.cover-copy h1{margin:0;font-size:clamp(58px,7vw,96px);font-weight:380;letter-spacing:-.06em;line-height:.9}.cover-copy h2{margin:0;color:#e2e7ed;font-size:clamp(18px,2vw,28px);font-weight:430;letter-spacing:-.02em}.access{padding:clamp(30px,5vw,64px);display:grid;align-content:center;gap:26px}.access header{display:grid;gap:10px}.access h3{margin:0;font-size:clamp(30px,4vw,48px);font-weight:420;letter-spacing:-.045em;line-height:1}.access header p:last-child{margin:4px 0 0;color:#aeb7c3;font-size:13px;line-height:1.65}.details{margin:0;padding:16px 0;display:grid;gap:12px;border-block:1px solid rgba(229,235,243,.13)}.details div{display:grid;gap:4px}.details dt{color:#8f99a6;font-size:8px;font-weight:650;letter-spacing:.15em;text-transform:uppercase}.details dd{margin:0;color:#eff2f6;font-size:12px}.details a{color:inherit;text-decoration:none}form{display:grid;gap:12px}label{display:grid;gap:8px;color:#cbd2dc;font-size:9px;font-weight:650;letter-spacing:.13em;text-transform:uppercase}input{width:100%;height:52px;padding:0 16px;border:1px solid rgba(229,235,243,.22);border-radius:12px;outline:0;background:rgba(255,255,255,.055);color:#fff;font:500 20px/1 Inter,Arial,sans-serif;letter-spacing:.35em}input:focus{border-color:#d7dde5;box-shadow:0 0 0 3px rgba(215,221,229,.12)}button{height:48px;border:1px solid rgba(229,235,243,.28);border-radius:999px;background:linear-gradient(145deg,#edf1f6,#aeb8c5);color:#0b0e12;font:700 10px/1 Inter,Arial,sans-serif;letter-spacing:.13em;text-transform:uppercase;cursor:pointer}button:hover,button:focus-visible{filter:brightness(1.07)}.error{margin:0;padding:11px 13px;border:1px solid rgba(218,127,112,.38);border-radius:10px;background:rgba(138,48,38,.14);color:#ffc9bf;font-size:11px;line-height:1.45}.note{margin:0;color:#7f8996;font-size:10px;line-height:1.55}@media(max-width:760px){body{place-items:start center;padding:12px 0}main{grid-template-columns:1fr}.cover{min-height:400px}.cover-copy{inset:26px}.access{padding:30px 24px 36px}.cover-copy h1{font-size:58px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  </style>
</head>
<body>
  <main>
    <section class="cover" aria-label="Dubai South presentation cover">
      <img src="/presentations/dubai-south-investor-brief/cover/wasl-dome.webp" alt="Al Wasl Plaza dome at Expo City Dubai">
      <div class="cover-copy"><img src="/brand/psr-logo-light.png" alt="PSR Homes"><div><p class="eyebrow">Private client presentation</p><h1>Dubai South</h1><h2>Investor decision brief</h2></div></div>
    </section>
    <section class="access">
      <header><p class="eyebrow">Restricted presentation</p><h3>Private client access</h3><p>Enter the four-digit access code shared by Jumanah to open this investor presentation.</p></header>
      <dl class="details"><div><dt>Advisor</dt><dd>Jumanah · Managing Partner</dd></div><div><dt>Email</dt><dd><a href="mailto:jumanah@psrhomes.ae">jumanah@psrhomes.ae</a></dd></div><div><dt>Direct</dt><dd><a href="tel:+971586801148">+971 58 680 1148</a></dd></div></dl>
      ${error}
      <form method="post" action="${PRESENTATION_PATH}"><label>Access code<input name="code" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="one-time-code" autofocus required></label><button type="submit">Open presentation</button></form>
      <p class="note">Access is limited to recipients of the private code. Prices, availability and commercial terms may change.</p>
    </section>
  </main>
</body>
</html>`;
  return new Response(isHead ? null : html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
      "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
      "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function handlePresentationAccess(request: Request, env: PresentationAccessEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname.startsWith(`${PRESENTATION_PATH}/files/`)) {
    const filename = url.pathname.slice(`${PRESENTATION_PATH}/files/`.length);
    const headers = new Headers({
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    });
    if (!PRIVATE_FILES.has(filename)) return new Response("File not found.", { status: 404, headers });
    if (request.method !== "GET" && request.method !== "HEAD") {
      headers.set("allow", "GET, HEAD");
      return new Response("Method not allowed.", { status: 405, headers });
    }
    if (!(await hasValidPresentationSession(request, env))) {
      headers.set("location", PRESENTATION_PATH);
      return new Response(null, { status: 303, headers });
    }
    // The allowlisted object is streamed only after the signed session is checked.
    // Reports are not included in the public static-asset directory.
    try {
      const key = FILE_PREFIX + filename;
      const object = request.method === "HEAD" ? await env.MEDIA.head(key) : await env.MEDIA.get(key);
      if (!object) return new Response("File not found.", { status: 404, headers });
      headers.set("content-type", PRIVATE_FILES.get(filename)!);
      headers.set("content-disposition", `attachment; filename="PSR_Dubai_South_${filename}"`);
      headers.set("content-length", String(object.size));
      const body = request.method === "HEAD" ? null : (object as R2ObjectBody).body;
      return new Response(body, { status: 200, headers });
    } catch {
      console.error(JSON.stringify({ event: "private_presentation_download_unavailable", filename }));
      return new Response("This file is temporarily unavailable.", { status: 503, headers });
    }
  }
  if (url.pathname.replace(/\/$/, "") !== PRESENTATION_PATH) return null;

  if (request.method === "GET" || request.method === "HEAD") {
    return (await hasValidPresentationSession(request, env)) ? null : accessPage(request);
  }
  if (request.method !== "POST") return new Response("Method not allowed.", { status: 405, headers: { allow: "GET, HEAD, POST" } });
  if (!validOrigin(request)) return accessPage(request, "The access request could not be verified.", 403);

  const declared = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > 1_024) return accessPage(request, "The access request is too large.", 413);

  const expectedCode = clean(env.JUMANAH_PRESENTATION_ACCESS_CODE, 32);
  const sessionSecret = clean(env.JUMANAH_PRESENTATION_COOKIE_SECRET, 512);
  if (!expectedCode || !sessionSecret) return accessPage(request, "Private access is temporarily unavailable.", 503);

  const limit = await enforceLoginRateLimit(request, env);
  if (!limit.allowed) return accessPage(request, "Too many attempts. Please wait 15 minutes before trying again.", 429);

  let code = "";
  try {
    const form = await request.formData();
    code = clean(form.get("code"), 4);
  } catch {
    return accessPage(request, "Enter the four-digit access code.", 400);
  }
  if (!/^\d{4}$/.test(code) || !(await constantTimeMatch(code, expectedCode))) {
    return accessPage(request, "The access code is incorrect.", 401);
  }

  await env.DB.prepare("DELETE FROM hg_agent_rate_limits WHERE \"key\" = ?").bind(limit.key).run();
  const token = await createSessionToken(sessionSecret);
  return new Response(null, {
    status: 303,
    headers: {
      location: `${PRESENTATION_PATH}${url.search}`,
      "set-cookie": sessionCookie(token),
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
    },
  });
}
