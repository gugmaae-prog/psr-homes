import assert from "node:assert/strict";
import test from "node:test";
import { deleteMediaObject, putMediaObject } from "../worker/media-storage";

function mediaMock() {
  const puts: Array<{ key: string; body: unknown; options: unknown }> = [];
  const deletes: string[] = [];
  return {
    puts,
    deletes,
    bucket: {
      async put(key: string, body: unknown, options: unknown) {
        puts.push({ key, body, options });
        return null;
      },
      async delete(key: string) {
        deletes.push(key);
      },
    },
  };
}

test("R2 remains the primary store when Amazon credentials are absent", async () => {
  const media = mediaMock();
  const mirrored = await putMediaObject({ MEDIA: media.bucket } as never, "reports/brief.pdf", new Uint8Array([1, 2, 3]), {
    httpMetadata: { contentType: "application/pdf" },
  });
  assert.equal(mirrored, false);
  assert.equal(media.puts.length, 1);
  assert.equal(media.puts[0].key, "reports/brief.pdf");
});

test("configured writes and deletes are signed and mirrored to the private S3 path", async () => {
  const media = mediaMock();
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(null, { status: 200 });
  };
  const env = {
    MEDIA: media.bucket,
    AWS_S3_BUCKET: "psrhomes-assets-test",
    AWS_S3_REGION: "me-central-1",
    AWS_S3_PREFIX: "psrhomes",
    AWS_S3_ACCESS_KEY_ID: "AKIATESTKEY",
    AWS_S3_SECRET_ACCESS_KEY: "test-secret-key",
  } as never;
  try {
    assert.equal(await putMediaObject(env, "private briefs/one.pdf", new Uint8Array([4, 5, 6]), {
      httpMetadata: { contentType: "application/pdf", cacheControl: "private, no-store" },
    }), true);
    assert.equal(await deleteMediaObject(env, "private briefs/one.pdf"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(media.puts.length, 1);
  assert.deepEqual(media.deletes, ["private briefs/one.pdf"]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, "https://psrhomes-assets-test.s3.me-central-1.amazonaws.com/psrhomes/private%20briefs/one.pdf");
  assert.equal(requests[0].init?.method, "PUT");
  assert.equal(requests[1].init?.method, "DELETE");
  const headers = new Headers(requests[0].init?.headers);
  assert.match(headers.get("authorization") || "", /^AWS4-HMAC-SHA256 Credential=AKIATESTKEY\//);
  assert.equal(headers.get("content-type"), "application/pdf");
  assert.doesNotMatch(headers.get("authorization") || "", /test-secret-key/);
});

test("an Amazon failure is isolated after the R2 write succeeds", async () => {
  const media = mediaMock();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("denied", { status: 403 });
  try {
    const mirrored = await putMediaObject({
      MEDIA: media.bucket,
      AWS_S3_BUCKET: "psrhomes-assets-test",
      AWS_S3_REGION: "me-central-1",
      AWS_S3_ACCESS_KEY_ID: "AKIATESTKEY",
      AWS_S3_SECRET_ACCESS_KEY: "test-secret-key",
    } as never, "inbox/file.pdf", new Uint8Array([7]));
    assert.equal(mirrored, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(media.puts.length, 1);
});
