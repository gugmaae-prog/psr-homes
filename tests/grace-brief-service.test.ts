import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGracePreferences } from "../lib/grace-finder";
import {
  generateGraceClientBrief,
  pruneExpiredGraceClientBriefs,
  validatedGraceNarrativePriorities,
} from "../worker/grace-brief-service";

test("replaces terse AI field keys with complete diligence actions", () => {
  const fallback = [
    "Confirm the exact unit, net area, view, orientation, current price and dated payment schedule.",
    "Validate recent like-for-like transactions and competing live inventory before reservation.",
    "Model achievable rent, service charges, vacancy, management, financing and acquisition costs before quoting net yield.",
    "Reconfirm developer instructions, fees, contract milestones and cancellation terms before paying.",
  ];
  assert.deepEqual(
    validatedGraceNarrativePriorities(
      ["pricing", "transactions", "rentalIncome", "serviceCharges", "netYield"],
      fallback,
    ),
    fallback,
  );
});

test("Sonu generates, stores and emails a grounded private PDF", async () => {
  const preferences = normalizeGracePreferences({
    goal: "investment",
    propertyTypes: ["Apartment"],
    bedrooms: "2 bedrooms",
    household: "not-sure",
    lifestyle: "beachfront",
    priorities: ["High rental yield"],
    budget: "2m-5m",
    emirate: "Dubai",
    community: "Dubai Marina",
    timeline: "Within 3 months",
    financing: "not-sure",
    investmentStrategy: "income",
    goldenVisaInterest: false,
  });
  assert.ok(preferences);

  let storedPdf: Uint8Array | null = null;
  let emailedPdf: Uint8Array | null = null;
  const writes: string[] = [];
  const db = {
    prepare(sql: string) {
      return {
        async first() {
          return sql.includes("FROM hg_daily_insights") ? {
            title: "Dubai real estate transactions reach AED 252 billion in Q1 2026",
            dek: "Dubai Land Department recorded 60,303 real-estate transactions in the quarter.",
            market_date: "2026-08-23",
            source_label: "Dubai Land Department",
            source_url: "https://dubailand.gov.ae/en/news-media/dubai-s-real-estate-transactions-surge-31-to-reach-aed-252-billion-in-q1-2026",
            source_published_at: "2026-04-09T00:00:00.000Z",
          } : null;
        },
        bind() {
          return {
            async run() {
              writes.push(sql);
              return { success: true };
            },
          };
        },
      };
    },
  };
  const env = {
    DB: db,
    MEDIA: {
      async put(_key: string, value: Uint8Array) {
        storedPdf = value;
      },
    },
    EMAIL: {
      async send(message: { attachments?: Array<{ content: Uint8Array }> }) {
        emailedPdf = message.attachments?.[0]?.content || null;
        return { messageId: "test-message" };
      },
    },
  };

  const result = await generateGraceClientBrief({
    env: env as never,
    leadId: 42,
    clientName: "Keiffer Japeth",
    email: "keiffer@example.com",
    preferences,
  });

  assert.equal(result.sent, true);
  assert.match(result.downloadUrl, /^\/api\/client-briefs\/[a-f0-9]{64}$/);
  assert.ok(result.recommendations.length > 0);
  assert.ok(result.recommendations.every((project) => /dubai marina/i.test(`${project.title} ${project.area}`)));
  assert.equal(result.marketEvidence?.sourceLabel, "Dubai Land Department");
  const storedBytes = storedPdf as unknown as Uint8Array;
  const emailedBytes = emailedPdf as unknown as Uint8Array;
  assert.ok(storedBytes);
  assert.ok(emailedBytes);
  assert.equal(new TextDecoder().decode(storedBytes.slice(0, 4)), "%PDF");
  assert.equal(emailedBytes.byteLength, storedBytes.byteLength);
  assert.ok(writes.some((sql) => sql.includes("psr_public_brief_downloads")));
  assert.ok(writes.some((sql) => sql.includes("hg_client_briefs")));
});

test("expired private brief tokens and R2 objects are pruned together", async () => {
  const deletedObjects: string[] = [];
  const deletedTokens: string[] = [];
  const env = {
    MEDIA: {
      async delete(key: string) {
        deletedObjects.push(key);
      },
    },
    DB: {
      prepare(sql: string) {
        return {
          async all() {
            return sql.includes("FROM psr_public_brief_downloads") ? {
              results: [
                { token_hash: "one", object_key: "private-briefs/1/one.pdf" },
                { token_hash: "two", object_key: "private-briefs/2/two.pdf" },
              ],
            } : { results: [] };
          },
          bind(token: string) {
            return { token };
          },
        };
      },
      async batch(statements: Array<{ token: string }>) {
        deletedTokens.push(...statements.map((statement) => statement.token));
        return [];
      },
    },
  };

  assert.equal(await pruneExpiredGraceClientBriefs(env as never), 2);
  assert.deepEqual(deletedObjects, ["private-briefs/1/one.pdf", "private-briefs/2/two.pdf"]);
  assert.deepEqual(deletedTokens, ["one", "two"]);
});
