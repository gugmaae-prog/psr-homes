import assert from "node:assert/strict";
import test from "node:test";

import { handlePresentationAccess } from "../worker/presentation-access";

function testEnv(count = 1) {
  const DB = {
    prepare() {
      return {
        bind() {
          return {
            async first() { return { count }; },
            async run() { return { success: true }; },
          };
        },
      };
    },
  } as unknown as D1Database;
  return {
    DB,
    JUMANAH_PRESENTATION_ACCESS_CODE: "1234",
    JUMANAH_PRESENTATION_COOKIE_SECRET: "test-only-cookie-signing-secret-with-sufficient-length",
  } as Env & {
    JUMANAH_PRESENTATION_ACCESS_CODE: string;
    JUMANAH_PRESENTATION_COOKIE_SECRET: string;
  };
}

test("unrelated routes bypass the Jumanah presentation gate", async () => {
  const response = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah"), testEnv());
  assert.equal(response, null);
});

test("the presentation returns a private no-store access screen without exposing its code", async () => {
  const response = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south"), testEnv());
  assert.ok(response);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.match(response.headers.get("x-robots-tag") || "", /noindex/);
  const body = await response.text();
  assert.match(body, /Private client access/);
  assert.match(body, /pattern="\[0-9\]\{4\}"/);
  assert.match(body, /jumanah@psrhomes\.ae/);
  assert.match(body, /\+971 58 680 1148/);
  assert.doesNotMatch(body, />1234</);
});

test("the correct code creates a signed HttpOnly session and unlocks the presentation", async () => {
  const env = testEnv();
  const unlock = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://psrhomes.ae",
      "cf-connecting-ip": "203.0.113.10",
    },
    body: "code=1234",
  }), env);
  assert.ok(unlock);
  assert.equal(unlock.status, 303);
  assert.equal(unlock.headers.get("location"), "/advisors/jumanah/dubai-south");
  const cookie = unlock.headers.get("set-cookie") || "";
  assert.match(cookie, /^psr_jumanah_dubai_south=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);

  const sessionCookie = cookie.split(";")[0];
  const unlocked = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south", {
    headers: { cookie: sessionCookie },
  }), env);
  assert.equal(unlocked, null);
});

test("local preview origins can submit across Wrangler's forwarded development port", async () => {
  const response = await handlePresentationAccess(new Request("http://127.0.0.1:8787/advisors/jumanah/dubai-south", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "http://localhost:4175",
      "cf-connecting-ip": "127.0.0.1",
    },
    body: "code=1234",
  }), testEnv());

  assert.ok(response);
  assert.equal(response.status, 303);
});

test("an opaque in-app-browser origin requires same-origin fetch metadata", async () => {
  const local = await handlePresentationAccess(new Request("http://localhost:4175/advisors/jumanah/dubai-south", {
    method: "POST",
    headers: { origin: "null", "sec-fetch-site": "same-origin", "content-type": "application/x-www-form-urlencoded" },
    body: "code=1234",
  }), testEnv());
  assert.equal(local?.status, 303);

  const publicRequest = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south", {
    method: "POST",
    headers: { origin: "null", "content-type": "application/x-www-form-urlencoded" },
    body: "code=1234",
  }), testEnv());
  assert.equal(publicRequest?.status, 403);
});

test("incorrect and rate-limited access attempts stay locked", async () => {
  const incorrect = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://psrhomes.ae",
      "cf-connecting-ip": "203.0.113.11",
    },
    body: "code=0000",
  }), testEnv());
  assert.ok(incorrect);
  assert.equal(incorrect.status, 401);
  assert.match(await incorrect.text(), /access code is incorrect/i);

  const limited = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://psrhomes.ae",
      "cf-connecting-ip": "203.0.113.12",
    },
    body: "code=1234",
  }), testEnv(6));
  assert.ok(limited);
  assert.equal(limited.status, 429);
  assert.match(await limited.text(), /wait 15 minutes/i);
});

test("private downloads cannot bypass the signed presentation session", async () => {
  let reads = 0;
  const env = Object.assign(testEnv(), {
    MEDIA: { async get() { reads++; return null; }, async head() { reads++; return null; } } as unknown as R2Bucket,
  });
  for (const file of ["ready.pdf", "under.pdf", "above.pdf", "presentation.pptx"]) {
    const response = await handlePresentationAccess(new Request(`https://psrhomes.ae/advisors/jumanah/dubai-south/files/${file}`), env);
    assert.equal(response?.status, 303);
    assert.equal(response?.headers.get("location"), "/advisors/jumanah/dubai-south");
    assert.match(response?.headers.get("cache-control") || "", /private, no-store/);
  }
  assert.equal(reads, 0);
  const unknown = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south/files/other.pdf"), env);
  assert.equal(unknown?.status, 404);
});

test("signed downloads stream only allowlisted versioned objects, including HEAD", async () => {
  const keys: string[] = [];
  const env = Object.assign(testEnv(), {
    MEDIA: {
      async get(key: string) { keys.push(key); return { size: 4, body: new Response("test").body }; },
      async head(key: string) { keys.push(key); return { size: 4 }; },
    } as unknown as R2Bucket,
  });
  const login = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "code=1234",
  }), env);
  const cookie = login!.headers.get("set-cookie")!.split(";")[0];
  for (const method of ["GET", "HEAD"]) {
    const response = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south/files/ready.pdf", { method, headers: { cookie } }), env);
    assert.equal(response?.status, 200);
    assert.equal(response?.headers.get("content-type"), "application/pdf");
    assert.match(response?.headers.get("content-disposition") || "", /attachment/);
    assert.equal(await response!.text(), method === "GET" ? "test" : "");
  }
  assert.deepEqual(keys, Array(2).fill("client-presentations/jumanah/dubai-south/2026-09-12/ready.pdf"));
  const tampered = await handlePresentationAccess(new Request("https://psrhomes.ae/advisors/jumanah/dubai-south/files/ready.pdf", { headers: { cookie: cookie + "bad" } }), env);
  assert.equal(tampered?.status, 303);
});
