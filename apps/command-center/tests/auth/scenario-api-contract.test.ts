import { describe, expect, it } from "vitest";
import { canViewScenarioAnalysis, parseScenarioRequest } from "../../server/domain/scenario-analysis";

describe("scenario API contract", () => {
  it("rejects empty titles and unknown-shaped assumptions", () => {
    expect(() => parseScenarioRequest({ title: "", domainIds: ["transfer"] })).toThrow();
    expect(() => parseScenarioRequest({ title: "سناریو", domainIds: ["transfer"], assumptions: { secret: "no" } })).toThrow();
  });

  it("bounds domain inputs and preserves a missing rate", () => {
    const parsed = parseScenarioRequest({ title: "انتقال", domainIds: ["transfer"], assumptions: { teamCount: 2, weeklyCapacity: 5 } });
    expect(parsed.assumptions?.personDayRate).toBeUndefined();
    expect(() => parseScenarioRequest({ title: "انتقال", domainIds: [] })).toThrow();
  });

  it("allows CEO history while keeping other users to their own analyses", () => {
    expect(canViewScenarioAnalysis({ role: "CEO", userId: "ceo" }, "member")).toBe(true);
    expect(canViewScenarioAnalysis({ role: "MANAGER", userId: "manager" }, "member")).toBe(false);
    expect(canViewScenarioAnalysis({ role: "MEMBER", userId: "member" }, "member")).toBe(true);
  });
});
