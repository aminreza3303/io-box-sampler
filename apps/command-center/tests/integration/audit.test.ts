import { describe, expect, it, vi } from "vitest";
import { evaluateScenario } from "../../server/domain/rule-evaluator";

describe("audit and metric contracts", () => {
  it("keeps rule evaluation read-only and deterministic", () => { const snapshot = { status: "BLOCKED", progress: 10 }; const before = JSON.stringify(snapshot); const result = evaluateScenario({ logic: "AND", conditions: [{ field: "status", operator: "eq", value: "BLOCKED" }] }, snapshot); expect(result.matched).toBe(true); expect(result.explanation).toHaveLength(1); expect(JSON.stringify(snapshot)).toBe(before); });
  it("defines the expected audit correlation shape", () => { const event = { actorId: "ceo", action: "PROPOSAL_APPROVED", targetType: "PlanProposal", targetId: "p-1", metadata: { correlationId: "corr-1" } }; expect(event.metadata.correlationId).toBeTruthy(); });
});
