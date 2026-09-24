export type ProjectFinanceStatus = "ready" | "off-plan";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export function projectFinanceStatus(handover = "", statusLabel = "", now = new Date()): ProjectFinanceStatus {
  const status = `${statusLabel} ${handover}`.trim();
  if (/\b(?:ready|completed|complete|handed over)\b/i.test(status)) return "ready";
  if (/\b(?:off[- ]plan|launch|under construction)\b/i.test(statusLabel)) return "off-plan";

  const year = Number(handover.match(/20\d{2}/)?.[0] || 0);
  if (!year || year > now.getFullYear()) return "off-plan";
  if (year < now.getFullYear()) return "ready";

  const quarter = Number(handover.match(/\bQ([1-4])\b/i)?.[1] || 0);
  if (quarter) {
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    return quarter < currentQuarter ? "ready" : "off-plan";
  }

  const handoverMonth = MONTHS.findIndex((month) => new RegExp(`\\b${month.slice(0, 3)}(?:${month.slice(3)})?\\b`, "i").test(handover));
  if (handoverMonth >= 0) return handoverMonth < now.getMonth() ? "ready" : "off-plan";

  // A year-only estimate does not prove that handover has occurred.
  return "off-plan";
}
