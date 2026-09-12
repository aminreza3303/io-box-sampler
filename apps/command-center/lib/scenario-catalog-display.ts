import type { StrategicScenario } from "./scenario-types";

export const travelScenarioOrderNote = "ترتیب هر مسیر، ترتیب پیشنهادی سند است؛ این رتبه‌بندی به‌معنای تصویب یا اولویت اجرایی نیست.";

export function orderScenarioLaneForDisplay(scenarios: readonly StrategicScenario[]): StrategicScenario[] {
  return [...scenarios].sort((left, right) =>
    (left.priority?.suggestedOrder ?? Number.POSITIVE_INFINITY)
    - (right.priority?.suggestedOrder ?? Number.POSITIVE_INFINITY));
}
