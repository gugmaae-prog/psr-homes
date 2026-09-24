import assert from "node:assert/strict";
import test from "node:test";
import {
  isTrackableAnalyticsPath,
  normalizeAnalyticsEvent,
  normalizeAnalyticsPath,
} from "../worker/analytics-backend";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";
const visitorId = "2f1c76c6-a872-4fc5-b5db-8a06714850c8";

test("normalizes base paths without retaining queries or fragments", () => {
  assert.equal(normalizeAnalyticsPath("/h&g/properties/projects/example?campaign=private#gallery"), "/projects/example");
  assert.equal(normalizeAnalyticsPath("/projects/example/"), "/projects/example");
  assert.equal(normalizeAnalyticsPath("https://psr.espacios.me/projects/example"), "");
});

test("never tracks protected management surfaces", () => {
  assert.equal(isTrackableAnalyticsPath("/admin"), false);
  assert.equal(isTrackableAnalyticsPath("/admin/users"), false);
  assert.equal(isTrackableAnalyticsPath("/analytics"), false);
  assert.equal(isTrackableAnalyticsPath("/analytics/detail"), false);
  assert.equal(isTrackableAnalyticsPath("/leads"), false);
  assert.equal(isTrackableAnalyticsPath("/agent/documents"), false);
  assert.equal(isTrackableAnalyticsPath("/projects/example"), true);
});

test("accepts bounded anonymous interaction signals", () => {
  const event = normalizeAnalyticsEvent({
    sessionId,
    visitorId,
    eventType: "click",
    path: "/projects/example?private=value",
    target: "  View   project  ",
    xPct: 112,
    yPct: -4,
    scrollDepth: 57.8,
    viewportWidth: 1440,
    viewportHeight: 900,
    deviceType: "desktop",
    referrerHost: "https://www.google.com/search?q=private",
    durationSeconds: 17,
  });
  assert.ok(event);
  assert.equal(event.path, "/projects/example");
  assert.equal(event.target, "View project");
  assert.equal(event.xPct, 100);
  assert.equal(event.yPct, 0);
  assert.equal(event.scrollDepth, 58);
  assert.equal(event.referrerHost, "www.google.com");
});

test("rejects malformed identifiers, event types and private paths", () => {
  assert.equal(normalizeAnalyticsEvent({
    sessionId: "not-a-session",
    visitorId,
    eventType: "page_view",
    path: "/",
  }), null);
  assert.equal(normalizeAnalyticsEvent({
    sessionId,
    visitorId,
    eventType: "key_press",
    path: "/",
  }), null);
  assert.equal(normalizeAnalyticsEvent({
    sessionId,
    visitorId,
    eventType: "page_view",
    path: "/leads",
  }), null);
});
