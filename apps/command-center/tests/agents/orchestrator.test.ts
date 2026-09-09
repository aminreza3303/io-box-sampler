import { describe, expect, it } from "vitest";
import { dispatchToMother, agentRoster } from "../../server/agents/orchestrator";
import type { AgentRuntimeAdapter } from "../../server/agents/types";

const fake: AgentRuntimeAdapter = { health: async () => ({ available: true, detail: "fake" }), run: async (request) => ({ kind: "proposal", runId: request.runId, output: "proposal" }), stop: async () => undefined };
describe("agent orchestrator", () => {
  it("keeps the mother and three child roles explicit", () => { expect(agentRoster.map((agent) => agent.id)).toEqual(["hermes-mother", "product-analyst", "builder", "reviewer"]); });
  it("dispatches only through the mother adapter boundary", async () => { await expect(dispatchToMother("review this", process.cwd(), { hermes: fake, omp: fake })).resolves.toMatchObject({ kind: "proposal", output: "proposal" }); });
});
