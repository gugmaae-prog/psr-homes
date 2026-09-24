import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LaunchPayment } from "../data/curated-launches";
import { PaymentPlan } from "../components/PaymentPlan";
import { projectPaymentMilestones, validLaunchPaymentSchedule } from "../lib/launch-payment-schedule";
import { normalizeLiquiditySchedule } from "../lib/off-plan-liquidity";
import { getImportedProject } from "../lib/imported-projects";

// Synthetic dated fixture tests rendering independently of commercial data.
const schedule: LaunchPayment[] = [
  { stage: "Booking", due: "22 September 2026", percentage: 5 },
  { stage: "Instalment 2", due: "1 November 2026", percentage: 5 },
  { stage: "Instalment 3", due: "1 May 2027", percentage: 5 },
  { stage: "Instalment 4", due: "1 November 2027", percentage: 5 },
  { stage: "Instalment 5", due: "1 May 2028", percentage: 5 },
  { stage: "Instalment 6", due: "1 November 2028", percentage: 5 },
  { stage: "Instalment 7", due: "1 May 2029", percentage: 5 },
  { stage: "Instalment 8", due: "1 November 2029", percentage: 5 },
  { stage: "Handover", due: "31 December 2029", percentage: 60 },
];

test("renders all supplied payment dates and percentages without illustrative instalments", () => {
  const html = renderToStaticMarkup(createElement(PaymentPlan, { milestones: [40, 60], schedule }));
  assert.match(html, /<caption>Published payment schedule<\/caption>/);
  const rows = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || "";
  assert.equal((rows.match(/<tr>/g) || []).length, 9);
  for (const row of schedule) {
    assert.ok(rows.includes(`<th scope="row">${row.stage}</th><td>${row.due}</td><td>${row.percentage}%</td>`));
  }
  assert.match(html, /Total purchase price<\/th><td>100%<\/td>/);
  assert.doesNotMatch(html, /quarterly|for illustration|~3 months|Break down|class="payment-milestone"/i);
});

test("uses the exact 5 percent booking share in the calculator while retaining the 40/60 headline", () => {
  const project = { paymentPlan: "40/60", paymentSchedule: schedule };
  const milestones = projectPaymentMilestones(project.paymentPlan, project.paymentSchedule);
  assert.equal(project.paymentPlan, "40/60");
  assert.equal(milestones.reduce((sum, value) => sum + value, 0), 100);
  assert.deepEqual(normalizeLiquiditySchedule(milestones), [5, 35, 60]);
});

test("keeps existing undated payment plans and their interactive circles", () => {
  const milestones = projectPaymentMilestones("20/30/50");
  assert.deepEqual(milestones, [20, 30, 50]);
  const html = renderToStaticMarkup(createElement(PaymentPlan, { milestones, handover: "Q2 2029" }));
  assert.equal((html.match(/class="payment-milestone"/g) || []).length, 3);
  assert.match(html, /typical quarterly UAE cadence for illustration/);
  assert.doesNotMatch(html, /payment-schedule-table/);
});

test("does not publish incomplete or unbalanced dated schedules", () => {
  for (const invalid of [
    schedule.slice(1),
    schedule.map((row, index) => index === 0 ? { ...row, percentage: Number.NaN } : row),
    schedule.map((row, index) => index === 0 ? { ...row, due: "" } : row),
    schedule.map((row, index) => index === 0 ? { ...row, stage: " " } : row),
  ]) {
    assert.deepEqual(validLaunchPaymentSchedule(invalid), []);
    assert.deepEqual(projectPaymentMilestones("40/60", invalid), [40, 60]);
    const html = renderToStaticMarkup(createElement(PaymentPlan, { milestones: [40, 60], schedule: invalid }));
    assert.doesNotMatch(html, /payment-schedule-table/);
  }
});

test("preserves Radisson launch details and the supplied dates through project mapping", async () => {
  const project = await getImportedProject("radisson-residences-al-reem-island-abu-dhabi");
  assert.ok(project);
  assert.equal(project.paymentPlan, "40/60");
  assert.equal(project.paymentSchedule?.length, 9);
  assert.deepEqual(project.paymentSchedule?.map((row) => row.due), [
    "On booking", "On signing the sale and purchase agreement", "30 April 2027",
    "30 September 2027", "28 February 2028", "30 July 2028", "30 December 2028",
    "30 April 2029", "30 September 2029",
  ]);
  assert.deepEqual(normalizeLiquiditySchedule(projectPaymentMilestones(project.paymentPlan, project.paymentSchedule)), [5, 35, 60]);
  assert.ok(project.launchDetails?.some((detail) => detail.title === "EOI submission"));
  assert.ok(project.launchDetails?.some((detail) => detail.title === "Sales closing documents"));
  const html = renderToStaticMarkup(createElement(PaymentPlan, { milestones: [40, 60], schedule: project.paymentSchedule }));
  assert.match(html, /30 April 2027/);
  assert.match(html, /30 September 2029/);
  assert.doesNotMatch(html, /quarterly|for illustration|~3 months|Break down/i);
});
