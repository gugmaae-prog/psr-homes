import assert from "node:assert/strict";
import test from "node:test";
import {
  readSupabaseAgentMemory,
  supabaseMemoryConfigured,
} from "../worker/supabase-memory";

test("Supabase memory stays disabled without both server settings", () => {
  assert.equal(supabaseMemoryConfigured({}), false);
  assert.equal(supabaseMemoryConfigured({ SUPABASE_URL: "https://example.supabase.co" }), false);
  assert.equal(supabaseMemoryConfigured({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_test",
  }), true);
});

test("Supabase memory reads only from the PSR namespace", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return Response.json([]);
  }) as typeof fetch;

  try {
    const memory = await readSupabaseAgentMemory({
      SUPABASE_URL: "https://example.supabase.co/",
      SUPABASE_SECRET_KEY: "sb_secret_test",
    }, "advisor@psrhomes.ae");
    assert.equal(memory, null);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requests.length, 1);
  assert.match(requests[0], /\/rest\/v1\/psr_agent_memory\?/);
  assert.doesNotMatch(requests[0], /hg_agent_memory/);
});
