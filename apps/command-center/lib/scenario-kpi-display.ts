export type ScenarioKpiDisplayResult = "met" | "not_met" | "unmeasured";

export function evaluateKpiActual(actual: unknown, target: unknown, operator: unknown): ScenarioKpiDisplayResult {
  if (typeof actual !== "number" || !Number.isFinite(actual)) return "unmeasured";
  if (typeof target !== "number" || !Number.isFinite(target)) return "unmeasured";
  if (operator === "gte") return actual >= target ? "met" : "not_met";
  if (operator === "lte") return actual <= target ? "met" : "not_met";
  return "unmeasured";
}
