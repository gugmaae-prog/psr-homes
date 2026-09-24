import assert from "node:assert/strict";
import test from "node:test";
import { handleLeadRatRequest, pushWebsiteLeadToLeadRat } from "../worker/leadrat-backend";
import type { AgentEnv, AgentSession } from "../worker/agent-backend";

type FetchCall = {
  url: string;
  method: string;
  body: string;
};

type FetchHandler = (request: Request) => Response | Promise<Response>;

const env = {
  LEADRAT_API_KEY: "test-key",
  LEADRAT_SECRET_KEY: "test-secret",
  LEADRAT_TENANT: "psrhomes",
} as AgentEnv;

const agent: AgentSession = {
  email: "agent.one@psrhomes.ae",
  name: "Agent One",
  role: "agent",
  phone: "",
  title: "Property Advisor",
  avatarUrl: "",
  expiresAt: "2099-01-01T00:00:00.000Z",
  mustChangePassword: false,
  onboardingRequired: false,
  teamName: "PSR Homes",
  access: ["crm"],
};

const admin: AgentSession = { ...agent, email: "admin@psrhomes.ae", name: "Admin", role: "admin" };

function request(path: string, method = "GET", body?: Record<string, unknown>, origin = "https://psrhomes.ae") {
  return new Request(`https://psrhomes.ae${path}`, {
    method,
    headers: body ? { "content-type": "application/json", origin } : { origin },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

async function responseBody<T>(response: Response) {
  return await response.json() as T;
}

function tokenResponse() {
  return json({ succeeded: true, data: { accessToken: "token" } });
}

async function withMockFetch<T>(handler: FetchHandler, run: (calls: FetchCall[]) => Promise<T>) {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    calls.push({ url: request.url, method: request.method, body: await request.clone().text() });
    return await handler(request);
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function leadRatFixture(request: Request, options?: {
  duplicateUser?: boolean;
  leadOwner?: string;
  generalOwner?: string;
  leadId?: string;
  userEmail?: string;
}) {
  const url = new URL(request.url);
  if (url.pathname === "/api/v1/authentication/token") return tokenResponse();
  if (url.pathname === "/api/v1/user") {
    const users = [{ id: "user-1", email: options?.userEmail || "agent.one@psrhomes.ae", name: "Agent One" }];
    if (options?.duplicateUser) users.push({ id: "user-duplicate", email: "agent.one@psrhomes.ae", name: "Agent Duplicate" });
    return json({ succeeded: true, data: { items: users, totalCount: users.length } });
  }
  if (url.pathname === "/api/v1/lead" && request.method === "GET") {
    const owner = url.searchParams.get("LeadVisibility") === "unassigned" ? options?.generalOwner || "" : options?.leadOwner || "user-1";
    return json({
      succeeded: true,
      data: {
        items: [{
          id: options?.leadId || "lead-12345678",
          name: "Buyer Lead",
          email: "buyer@example.com",
          contactNo: "+971501234567",
          sourceName: "Website",
          statusName: "New",
          assignTo: owner,
        }],
        totalCount: 1,
      },
    });
  }
  if (url.pathname === `/api/v1/lead/${options?.leadId || "lead-12345678"}`) {
    return json({ succeeded: true, data: { id: options?.leadId || "lead-12345678", assignTo: options?.leadOwner || "user-1" } });
  }
  if (url.pathname === `/api/v1/lead/notes/${options?.leadId || "lead-12345678"}` && request.method === "PUT") {
    return json({ succeeded: true });
  }
  return json({ succeeded: false, message: `Unexpected ${request.method} ${url.pathname}` }, { status: 404 });
}

test("LeadRat assigned view only returns leads owned by the matched PSR agent", async () => {
  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest), async (calls) => {
    const response = await handleLeadRatRequest(request("/api/agent/leadrat?scope=mine&page=2"), env, agent) as Response;
    assert.equal(response.status, 200);
    const body = await responseBody<{ scope: string; leads: Array<{ id: string; assignedTo: string; phone: string }>; mappingRequired: boolean }>(response);
    assert.equal(body.scope, "mine");
    assert.equal(body.mappingRequired, false);
    assert.equal(body.leads.length, 1);
    assert.equal(body.leads[0].id, "lead-12345678");
    assert.equal(body.leads[0].assignedTo, "user-1");
    assert.equal(body.leads[0].phone, "+971501234567");
    assert.ok(calls.some((call) => call.url.includes("AssignUser=user-1")));
  });
});

test("LeadRat assigned view can map a PSR email to the LeadRat admin user", async () => {
  const mappedEnv = {
    ...env,
    DB: {
      prepare: () => ({
        bind: (email: string) => ({
          first: async () => email === "prateek@psrhomes.ae" ? { leadrat_email: "admin@psrhomes.ae" } : null,
        }),
      }),
    },
  } as unknown as AgentEnv;
  const prateek: AgentSession = { ...agent, email: "prateek@psrhomes.ae", name: "Prateek Rawal" };

  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest, { userEmail: "admin@psrhomes.ae" }), async (calls) => {
    const response = await handleLeadRatRequest(request("/api/agent/leadrat?scope=mine"), mappedEnv, prateek) as Response;
    assert.equal(response.status, 200);
    const body = await responseBody<{ leads: Array<{ id: string; assignedTo: string }>; mappingRequired: boolean }>(response);
    assert.equal(body.mappingRequired, false);
    assert.equal(body.leads[0]?.assignedTo, "user-1");
    assert.ok(calls.some((call) => call.url.includes("AssignUser=user-1")));
  });
});

test("LeadRat push creates PSR website leads under the mapped admin user", async () => {
  const dbCalls: Array<{ sql: string; values: unknown[] }> = [];
  const mappedEnv = {
    ...env,
    DB: {
      prepare: (sql: string) => ({
        bind: (...values: unknown[]) => ({
          first: async () => sql.includes("psr_leadrat_user_mappings") ? { leadrat_email: "admin@psrhomes.ae" } : null,
          run: async () => {
            dbCalls.push({ sql, values });
            return {};
          },
        }),
      }),
    },
  } as unknown as AgentEnv;

  await withMockFetch((leadRatRequest) => {
    const url = new URL(leadRatRequest.url);
    if (url.pathname === "/api/v1/authentication/token") return tokenResponse();
    if (url.pathname === "/api/v1/user") {
      return json({ succeeded: true, data: { items: [{ id: "admin-user-id", email: "admin@psrhomes.ae", name: "Prateek Rawal" }], totalCount: 1 } });
    }
    if (url.pathname === "/api/v1/lead" && leadRatRequest.method === "POST") {
      return json({ succeeded: true, data: "leadrat-created-id" });
    }
    return json({ succeeded: false, message: `Unexpected ${leadRatRequest.method} ${url.pathname}` }, { status: 404 });
  }, async (calls) => {
    const result = await pushWebsiteLeadToLeadRat(mappedEnv, {
      websiteLeadId: 42,
      name: "Buyer Lead",
      email: "buyer@example.com",
      phone: "+971555555555",
      message: "Interested in a Dubai apartment.",
      source: "website",
      propertyReference: "sobha-central",
      propertyTitle: "Sobha Central",
    });
    assert.equal(result.ok, true);
    assert.equal(result.targetPsrEmail, "admin@psrhomes.ae");
    assert.equal(result.targetLeadRatEmail, "admin@psrhomes.ae");
    assert.equal(result.targetLeadRatUserId, "admin-user-id");

    const createCall = calls.find((call) => new URL(call.url).pathname === "/api/v1/lead" && call.method === "POST");
    assert.ok(createCall);
    const body = JSON.parse(createCall.body) as Record<string, unknown>;
    assert.equal(body.assignTo, "admin-user-id");
    assert.equal(body.assignedFrom, "admin-user-id");
    assert.equal(body.email, "buyer@example.com");
    assert.match(String(body.notes), /PSR website lead #42/);
    assert.match(String(body.notes), /Sobha Central/);
    assert.ok(dbCalls.some((call) => call.values.includes("synced") && call.values.includes("leadrat-created-id")));
  });
});

test("LeadRat assigned view fails closed when the upstream payload contains another owner", async () => {
  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest, { leadOwner: "user-2" }), async () => {
    const response = await handleLeadRatRequest(request("/api/agent/leadrat?scope=mine"), env, agent) as Response;
    assert.equal(response.status, 502);
    assert.match((await responseBody<{ error: string }>(response)).error, /outside the requested ownership scope/i);
  });
});

test("LeadRat duplicate email mappings require administrator cleanup before showing assigned leads", async () => {
  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest, { duplicateUser: true }), async (calls) => {
    const response = await handleLeadRatRequest(request("/api/agent/leadrat?scope=mine"), env, agent) as Response;
    assert.equal(response.status, 200);
    const body = await responseBody<{ leads: unknown[]; mappingRequired: boolean }>(response);
    assert.equal(body.mappingRequired, true);
    assert.deepEqual(body.leads, []);
    assert.equal(calls.some((call) => new URL(call.url).pathname === "/api/v1/lead"), false);
  });
});

test("LeadRat general pool is admin only and must remain unassigned", async () => {
  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest), async (calls) => {
    const agentResponse = await handleLeadRatRequest(request("/api/agent/leadrat?scope=general"), env, agent) as Response;
    assert.equal(agentResponse.status, 403);
    assert.equal(calls.length, 0);

    const adminResponse = await handleLeadRatRequest(request("/api/agent/leadrat?scope=general"), env, admin) as Response;
    assert.equal(adminResponse.status, 200);
    assert.ok(calls.some((call) => call.url.includes("LeadVisibility=unassigned")));
  });
});

test("LeadRat all-leads view is admin only and does not apply an ownership filter", async () => {
  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest), async (calls) => {
    const agentResponse = await handleLeadRatRequest(request("/api/agent/leadrat?scope=all"), env, agent) as Response;
    assert.equal(agentResponse.status, 403);
    assert.equal(calls.length, 0);

    const adminResponse = await handleLeadRatRequest(request("/api/agent/leadrat?scope=all"), env, admin) as Response;
    assert.equal(adminResponse.status, 200);
    const leadCall = calls.find((call) => new URL(call.url).pathname === "/api/v1/lead");
    assert.ok(leadCall);
    assert.doesNotMatch(leadCall.url, /AssignUser=|LeadVisibility=/);
  });
});

test("LeadRat general pool fails closed when upstream includes an assigned lead", async () => {
  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest, { generalOwner: "user-1" }), async () => {
    const response = await handleLeadRatRequest(request("/api/agent/leadrat?scope=general"), env, admin) as Response;
    assert.equal(response.status, 502);
    assert.match((await responseBody<{ error: string }>(response)).error, /outside the requested ownership scope/i);
  });
});

test("LeadRat note updates require same-origin requests and current ownership", async () => {
  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest), async (calls) => {
    const crossOrigin = await handleLeadRatRequest(
      request("/api/agent/leadrat/leads/lead-12345678/notes", "PATCH", { notes: "Follow up today." }, "https://example.com"),
      env,
      agent,
    ) as Response;
    assert.equal(crossOrigin.status, 403);
    assert.equal(calls.length, 0);

    const response = await handleLeadRatRequest(
      request("/api/agent/leadrat/leads/lead-12345678/notes", "PATCH", { notes: "Follow up today." }),
      env,
      agent,
    ) as Response;
    assert.equal(response.status, 200);
    const noteCall = calls.find((call) => new URL(call.url).pathname === "/api/v1/lead/notes/lead-12345678");
    assert.ok(noteCall);
    assert.deepEqual(JSON.parse(noteCall.body), { id: "lead-12345678", notes: "Follow up today." });
  });
});

test("LeadRat note updates reject unassigned or differently assigned leads", async () => {
  await withMockFetch((leadRatRequest) => leadRatFixture(leadRatRequest, { leadOwner: "user-2" }), async (calls) => {
    const response = await handleLeadRatRequest(
      request("/api/agent/leadrat/leads/lead-12345678/notes", "PATCH", { notes: "Follow up today." }),
      env,
      agent,
    ) as Response;
    assert.equal(response.status, 403);
    assert.equal(calls.some((call) => new URL(call.url).pathname === "/api/v1/lead/notes/lead-12345678"), false);
  });
});

test("LeadRat proxy rejects unexpectedly large upstream responses before parsing", async () => {
  await withMockFetch((leadRatRequest) => {
    const url = new URL(leadRatRequest.url);
    if (url.pathname === "/api/v1/authentication/token") return tokenResponse();
    return new Response("{}", { headers: { "content-length": "1000001" } });
  }, async () => {
    const response = await handleLeadRatRequest(request("/api/agent/leadrat?scope=mine"), env, agent) as Response;
    assert.equal(response.status, 502);
    assert.match((await responseBody<{ error: string }>(response)).error, /unexpectedly large/i);
  });
});
