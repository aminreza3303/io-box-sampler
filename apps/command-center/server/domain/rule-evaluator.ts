export type RuleCondition = { field: "status" | "priority" | "projectId" | "progress" | "dueDate" | "riskCount"; operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains"; value: string | number };
export type RuleGroup = { logic: "AND" | "OR"; conditions: RuleCondition[] };
export type RuleEvaluation = { matched: boolean; explanation: string[] };

function compare(actual: unknown, condition: RuleCondition) {
  if (condition.operator === "contains") return String(actual ?? "").toLowerCase().includes(String(condition.value).toLowerCase());
  if (condition.operator === "eq") return actual === condition.value;
  if (condition.operator === "neq") return actual !== condition.value;
  const left = Number(actual); const right = Number(condition.value);
  if (condition.operator === "gt") return left > right;
  if (condition.operator === "gte") return left >= right;
  if (condition.operator === "lt") return left < right;
  return left <= right;
}

export function evaluateScenario(group: RuleGroup, snapshot: Record<string, unknown>): RuleEvaluation {
  const results = group.conditions.map((condition) => { const matched = compare(snapshot[condition.field], condition); return `${condition.field} ${condition.operator} ${String(condition.value)}: ${matched ? "matched" : "not matched"}`; });
  const matches = group.conditions.map((condition) => compare(snapshot[condition.field], condition));
  return { matched: group.logic === "AND" ? matches.every(Boolean) : matches.some(Boolean), explanation: results };
}
