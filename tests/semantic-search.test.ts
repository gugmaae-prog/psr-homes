import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { interpretSemanticSearchDeterministically } from "../lib/semantic-search";
import { handleSemanticSearch } from "../worker/semantic-search";

const source = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("extracts bounded CRM, inbox and lead filters from natural language", () => {
  assert.deepEqual(interpretSemanticSearchDeterministically("show active investors tagged marina", "crm"), {
    query: "show active investors tagged marina",
    terms: ["investors", "marina"],
    status: "active",
    timeframe: "",
    interpretedByAi: false,
  });
  const inbox = interpretSemanticSearchDeterministically("unread messages from Ahmed", "inbox");
  assert.deepEqual(inbox.terms, ["ahmed"]);
  assert.equal(inbox.status, "unread");
  const leads = interpretSemanticSearchDeterministically("new website leads this week", "leads");
  assert.deepEqual(leads.terms, ["website"]);
  assert.equal(leads.status, "new");
  assert.equal(leads.timeframe, "last_7_days");
});

test("uses Workers AI without accepting invented search entities", async () => {
  const response = await handleSemanticSearch(
    new Request("https://psrhomes.ae/api/search/interpret", {
      method: "POST",
      headers: { origin: "https://psrhomes.ae", "content-type": "application/json" },
      body: JSON.stringify({ query: "unread messages from Ahmed", scope: "inbox" }),
    }),
    {
      AI: {
        run: async () => ({ response: { terms: ["Ahmed", "invented person"], status: "unread", timeframe: "" } }),
      },
    } as never,
  );
  assert.ok(response);
  assert.equal(response?.status, 200);
  const payload = await response?.json() as { intent: { terms: string[]; status: string; interpretedByAi: boolean } };
  assert.deepEqual(payload.intent.terms, ["ahmed"]);
  assert.equal(payload.intent.status, "unread");
  assert.equal(payload.intent.interpretedByAi, true);
});

test("does not let AI reintroduce generic scope labels removed by the fallback", async () => {
  const response = await handleSemanticSearch(
    new Request("https://psrhomes.ae/api/search/interpret", {
      method: "POST",
      headers: { origin: "https://psrhomes.ae", "content-type": "application/json" },
      body: JSON.stringify({ query: "show developers active around Dubai Marina", scope: "developers" }),
    }),
    {
      AI: {
        run: async () => ({ response: { terms: ["developers", "dubai marina"], status: "", timeframe: "" } }),
      },
    } as never,
  );
  assert.ok(response);
  const payload = await response?.json() as { intent: { terms: string[] } };
  assert.deepEqual(payload.intent.terms, ["dubai marina"]);
});

test("every visible search family retains its AI interpretation path without UI replacement", () => {
  assert.match(source("app/page.tsx"), /action=\{withBasePath\("\/projects"\)\}[\s\S]*?AI-powered property search/);
  assert.match(source("components/ProjectCatalogue.tsx"), /\/api\/projects\/interpret-search/);
  assert.match(source("components/DeveloperDirectory.tsx"), /useSemanticSearch\(query, "developers"\)/);
  assert.match(source("components/CommunityDirectory.tsx"), /useSemanticSearch\(query, "communities"\)/);
  assert.match(source("components/AgentCrm.tsx"), /useSemanticSearch\(search, "crm"\)/);
  assert.match(source("components/AgentWorkspace.tsx"), /useSemanticSearch\(query, "agent-options"\)/);
  assert.match(source("worker/agent-backend.ts"), /interpretProjectSearch\(projectQuery, env\)/);
  assert.match(source("worker/inbox-backend.ts"), /interpretSemanticSearch\(query, "inbox", env\)/);
  assert.match(source("worker/leads-backend.ts"), /interpretSemanticSearch\(query, "leads", env\)/);
});
