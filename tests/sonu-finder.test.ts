import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSonuPreferences,
  recommendSonuProjects,
  recommendSonuProjectsStrict,
} from "../lib/sonu-finder";

test("validates and ranks an investment-led SONU Finder brief", () => {
  const preferences = normalizeSonuPreferences({
    goal: "investment",
    propertyTypes: ["Apartment", "Penthouse"],
    bedrooms: "2 bedrooms",
    household: "adults",
    lifestyle: "central",
    priorities: ["High rental yield", "Capital appreciation", "Resale liquidity"],
    budget: "2m-5m",
    emirate: "Dubai",
    timeline: "Within 3 months",
  });
  assert.ok(preferences);
  const projects = recommendSonuProjects(preferences, 4);
  assert.equal(projects.length, 4);
  assert.ok(projects.every((project) => project.slug && project.title && project.image));
  assert.ok(projects.every((project) => {
    const price = Number(project.price.replace(/[^\d]/g, ""));
    return project.price.startsWith("From AED ") && price >= 250_000;
  }), "SONU must not expose per-square-foot, rental or placeholder values as total property prices");
  assert.ok(projects.every((project) => /transactions|rent|service costs|net yield/i.test(project.reason)));
  assert.ok(projects.every((project) => project.handover && project.paymentPlan && project.sourceUpdatedAt));
  assert.ok(projects.every((project) => ["official-source", "catalogue-verification-required"].includes(project.evidenceStatus)));
});

test("changes the recommendation explanation for a family brief", () => {
  const preferences = normalizeSonuPreferences({
    goal: "home",
    propertyTypes: ["Villa", "Townhouse"],
    bedrooms: "4 bedrooms",
    household: "children",
    lifestyle: "full-community",
    priorities: ["Schools", "Parks and family space", "Healthcare", "Larger layouts"],
    budget: "5m-10m",
    emirate: "Dubai",
    timeline: "This year",
  });
  assert.ok(preferences);
  const projects = recommendSonuProjects(preferences, 3);
  assert.equal(projects.length, 3);
  assert.ok(projects.every((project) => /school routes|parks|healthcare/i.test(project.reason)));
  assert.ok(projects.every((project) => project.propertyTypes.some((type) => /villa|townhouse/i.test(type))));
  assert.ok(projects.every((project) => project.bedrooms.some((bedroom) => /4/.test(bedroom))));
});

test("rejects incomplete or invented finder values", () => {
  assert.equal(normalizeSonuPreferences({
    goal: "investment",
    propertyTypes: [],
    bedrooms: "",
    household: "adults",
    lifestyle: "central",
    priorities: [],
    budget: "unlimited",
    emirate: "Mars",
    timeline: "Yesterday",
  }), null);
});

test("rejects studio and one-bedroom briefs when every requested type is a landed home", () => {
  const base = {
    goal: "home",
    household: "adults",
    lifestyle: "quiet-family",
    priorities: ["Privacy"],
    budget: "2m-5m",
    emirate: "Dubai",
    timeline: "Within 3 months",
  };
  assert.equal(normalizeSonuPreferences({ ...base, propertyTypes: ["Villa"], bedrooms: "1 bedroom" }), null);
  assert.equal(normalizeSonuPreferences({ ...base, propertyTypes: ["Townhouse"], bedrooms: "Studio" }), null);
  assert.ok(normalizeSonuPreferences({ ...base, propertyTypes: ["Villa"], bedrooms: "2 bedrooms" }));
  assert.ok(normalizeSonuPreferences({ ...base, propertyTypes: ["Apartment", "Villa"], bedrooms: "1 bedroom" }));
});

test("requires mansion-specific bedroom and planning-budget plausibility", () => {
  const base = {
    goal: "home",
    propertyTypes: ["Mansion"],
    household: "adults",
    lifestyle: "quiet-family",
    priorities: ["Privacy"],
    emirate: "Dubai",
    timeline: "Within 3 months",
  };
  assert.equal(normalizeSonuPreferences({ ...base, bedrooms: "1 bedroom", budget: "10m-plus" }), null);
  assert.equal(normalizeSonuPreferences({ ...base, bedrooms: "4 bedrooms", budget: "under-1m" }), null);
  assert.equal(normalizeSonuPreferences({ ...base, bedrooms: "4 bedrooms", budget: "2m-5m" }), null);
  assert.ok(normalizeSonuPreferences({ ...base, bedrooms: "4 bedrooms", budget: "5m-10m" }));
});

test("strict report matching preserves community, bedroom and budget constraints", () => {
  const preferences = normalizeSonuPreferences({
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
  });
  assert.ok(preferences);
  const projects = recommendSonuProjectsStrict(preferences, 4);
  assert.ok(projects.length > 0);
  assert.ok(projects.every((project) => /dubai marina/i.test(`${project.title} ${project.area}`)));
  assert.ok(projects.every((project) => project.bedrooms.some((bedroom) => /2/.test(bedroom))));
  assert.ok(projects.every((project) => Number(project.price.replace(/[^\d]/g, "")) <= 5_000_000));
});
