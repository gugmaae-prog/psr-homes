import type { LaunchPayment } from "@/data/curated-launches";

/** Keep the supplied sequence intact only when every row is complete and the
 * percentages account for the full purchase price. */
export function validLaunchPaymentSchedule(schedule: LaunchPayment[] = []): LaunchPayment[] {
  return schedule.length >= 2
    && schedule.every((row) => row
      && typeof row.stage === "string" && row.stage.trim().length > 0
      && typeof row.due === "string" && row.due.trim().length > 0
      && Number.isFinite(row.percentage) && row.percentage > 0 && row.percentage <= 100)
    && schedule.reduce((sum, row) => sum + row.percentage, 0) === 100
    ? schedule
    : [];
}

export function projectPaymentMilestones(paymentPlan: string, schedule?: LaunchPayment[]) {
  const supplied = validLaunchPaymentSchedule(schedule);
  if (supplied.length) return supplied.map((row) => row.percentage);
  const parts = paymentPlan.split("/").map(Number).filter((part) => Number.isFinite(part) && part > 0 && part <= 100);
  return parts.length >= 2 && parts.reduce((sum, part) => sum + part, 0) === 100 ? parts : [];
}
