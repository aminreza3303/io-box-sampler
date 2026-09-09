import { describe, expect, it } from "vitest";
import { evaluateScenario } from "../../server/domain/rule-evaluator";

describe("scenario rule evaluator", () => {
  it("evaluates AND and OR groups read-only with explanations", () => {
    const snapshot = { status: "BLOCKED", progress: 20, projectId: "newcash" };
    expect(evaluateScenario({ logic: "AND", conditions: [{ field: "status", operator: "eq", value: "BLOCKED" }, { field: "progress", operator: "lt", value: 50 }] }, snapshot).matched).toBe(true);
    expect(evaluateScenario({ logic: "OR", conditions: [{ field: "status", operator: "eq", value: "DONE" }, { field: "projectId", operator: "eq", value: "newcash" }] }, snapshot).matched).toBe(true);
    expect(evaluateScenario({ logic: "AND", conditions: [{ field: "status", operator: "eq", value: "DONE" }] }, snapshot).explanation[0]).toContain("not matched");
  });
});
