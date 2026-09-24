export const DEFAULT_BOOKING_PERCENTAGE = 20;

export type LiquiditySchedule = [number, number, number];

export function validLiquiditySourceSchedule(milestones: number[] = []) {
  return milestones.length >= 2
    && milestones.every((part) => Number.isFinite(part) && part > 0 && part <= 100)
    && milestones.reduce((sum, part) => sum + part, 0) === 100
    ? milestones
    : [];
}

export function normalizeLiquiditySchedule(milestones: number[] = []): LiquiditySchedule {
  const published = validLiquiditySourceSchedule(milestones);

  if (!published.length) return [DEFAULT_BOOKING_PERCENTAGE, 40, 40];

  if (published.length === 2) {
    const [beforeHandover, handover] = published;
    const booking = Math.min(DEFAULT_BOOKING_PERCENTAGE, beforeHandover);
    return [booking, beforeHandover - booking, handover];
  }

  return [
    published[0],
    published.slice(1, -1).reduce((sum, part) => sum + part, 0),
    published.at(-1) || 0,
  ];
}

function boundedPercentage(value: number, maximum: number) {
  const numeric = Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(maximum, Math.max(0, numeric));
}

export function rebalanceLiquiditySchedule(
  schedule: LiquiditySchedule,
  changedIndex: number,
  nextValue: number,
): LiquiditySchedule {
  const [currentBooking, currentConstruction, currentHandover] = schedule;

  if (changedIndex === 0) {
    const booking = boundedPercentage(nextValue, 100 - currentHandover);
    return [booking, 100 - booking - currentHandover, currentHandover];
  }

  if (changedIndex === 1) {
    const construction = boundedPercentage(nextValue, 100 - currentBooking);
    return [currentBooking, construction, 100 - currentBooking - construction];
  }

  if (changedIndex === 2) {
    const handover = boundedPercentage(nextValue, 100 - currentBooking);
    return [currentBooking, 100 - currentBooking - handover, handover];
  }

  return [currentBooking, currentConstruction, currentHandover];
}
