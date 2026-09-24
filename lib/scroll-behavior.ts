export function preferredScrollBehavior(reducedMotion?: boolean): ScrollBehavior {
  const shouldReduce = reducedMotion ?? (
    typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  return shouldReduce ? "auto" : "smooth";
}
