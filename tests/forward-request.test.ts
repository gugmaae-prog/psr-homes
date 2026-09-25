import assert from "node:assert/strict";
import esbuild from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Miniflare } from "miniflare";
import { ServiceBodyTooLargeError, serviceRequest } from "../worker/forward-request";

test("service forwarding copies a request body and finishes the incoming stream", async () => {
  const payload = JSON.stringify({ path: "/", events: [] });
  const request = new Request("https://psrhomes.ae/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  });
  const forwarded = await serviceRequest(request);
  assert.equal(request.bodyUsed, true);
  assert.equal(await forwarded.text(), payload);
  assert.equal(forwarded.headers.get("content-type"), "application/json");
  assert.equal(forwarded.method, "POST");
});

test("an oversized service request is rejected after the incoming body is finished", async () => {
  const request = new Request("https://psrhomes.ae/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": "40" },
    body: "0123456789abcdef0123456789abcdef01234567",
  });
  await assert.rejects(serviceRequest(request, 8), ServiceBodyTooLargeError);
  assert.equal(request.bodyUsed, true);
});

test("a service binding can ignore a POST body without the request-stream error", async () => {
  const bundled = await esbuild.build({
    entryPoints: [new URL("../worker/forward-request.ts", import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
  });
  const directory = mkdtempSync(path.join(tmpdir(), "psr-forward-"));
  writeFileSync(path.join(directory, "forward-request.mjs"), bundled.outputFiles[0].text);
  writeFileSync(path.join(directory, "index.mjs"), `
    import { serviceRequest } from "./forward-request.mjs";
    export default {
      async fetch(request, env) {
        const forwarded = await serviceRequest(request);
        return env.SHELL.fetch(forwarded);
      },
    };
  `);
  const logs = [];
  const originalError = console.error;
  const originalWrite = process.stderr.write.bind(process.stderr);
  console.error = (...args) => {
    logs.push(args.map((arg) => String(arg)).join(" "));
    originalError(...args);
  };
  process.stderr.write = ((chunk: Uint8Array | string, ...args: unknown[]) => {
    logs.push(String(chunk));
    return originalWrite(chunk as never, ...(args as never[]));
  }) as typeof process.stderr.write;
  const upstream = `
    export default {
      async fetch() {
        return Response.json({ accepted: 0 }, { status: 202 });
      },
    };
  `;
  const mf = new Miniflare({
    verbose: true,
    workers: [
      { name: "upstream", modules: true, script: upstream, compatibilityDate: "2026-07-28" },
      {
        name: "edge",
        modules: true,
        modulesRoot: directory,
        scriptPath: path.join(directory, "index.mjs"),
        compatibilityDate: "2026-07-28",
        routes: ["psrhomes.ae/*"],
        serviceBindings: { SHELL: "upstream" },
      },
    ],
  });
  try {
    const response = await mf.dispatchFetch("https://psrhomes.ae/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://psrhomes.ae" },
      body: JSON.stringify({ events: [] }),
    });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { accepted: 0 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(logs.some((line) => line.includes("Can't read from request stream after response has been sent")), false);
  } finally {
    console.error = originalError;
    process.stderr.write = originalWrite;
    await mf.dispose();
  }
});
