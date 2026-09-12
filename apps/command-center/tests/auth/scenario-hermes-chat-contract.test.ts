import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  actor: { userId: "owner", role: "MEMBER", projectIds: [] as string[], teamIds: [] as string[] },
  analysis: { id: "analysis-1", createdById: "owner", assumptions: { title: "Saved scenario", domainIds: ["wallet"] }, estimate: { modelVersion: "scenario-business-case/v1", title: "Saved estimate", cases: [], private: "stored-secret" } },
  proposal: null as unknown,
  dispatch: vi.fn(),
  createRun: vi.fn(),
  updateRun: vi.fn(),
  findAnalysis: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireUser: vi.fn(async () => state.actor) }));
vi.mock("../../lib/workspaces", () => ({ getProcessById: vi.fn(() => null) }));
vi.mock("../../lib/db", () => ({ prisma: {
  scenarioAnalysis: { findUnique: state.findAnalysis },
  agentRun: { create: state.createRun, update: state.updateRun },
} }));
vi.mock("../../server/agents/orchestrator", () => ({ dispatchToMother: state.dispatch }));
vi.mock("../../server/domain/audit-service", () => ({ recordAuditEvent: vi.fn(async () => undefined) }));
vi.mock("../../server/agents/prompt-service", () => ({ loadAgentPrompt: vi.fn(async (name: string) => `instructions:${name}`) }));
vi.mock("../../server/agents/session-service", () => ({ getOrCreateAgentSession: vi.fn(async () => null) }));
vi.mock("../../server/agents/proposal-parser", () => ({ parseAgentProposal: vi.fn(() => state.proposal), parseAgentProposalValue: vi.fn(() => null) }));

import { POST } from "../../app/api/ai/chat/route";

describe("scenario Hermes chat contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.actor = { userId: "owner", role: "MEMBER", projectIds: [], teamIds: [] };
    state.analysis = { id: "analysis-1", createdById: "owner", assumptions: { title: "Saved scenario", domainIds: ["wallet"] }, estimate: { modelVersion: "scenario-business-case/v1", title: "Saved estimate", cases: [], private: "stored-secret" } };
    state.proposal = null;
    state.findAnalysis.mockImplementation(async () => state.analysis);
    state.createRun.mockResolvedValue({ id: "run-1" });
    state.updateRun.mockResolvedValue({ id: "run-1" });
    state.dispatch.mockResolvedValue({ kind: "result", output: "Hermes summary" });
  });

  it("does not dispatch when a non-owner requests another creator's snapshot", async () => {
    state.actor = { userId: "other", role: "MEMBER", projectIds: [], teamIds: [] };
    const response = await POST(new Request("http://localhost/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "analyze", scenarioAnalysisId: "analysis-1", scenarioContext: { secret: "client" } }) }));
    expect(response.status).toBe(404);
    expect(state.dispatch).not.toHaveBeenCalled();
    expect(state.createRun).not.toHaveBeenCalled();
  });

  it("uses the stored whitelist snapshot, ignores client scenario context and blocks proposal/task creation", async () => {
    state.proposal = { title: "Task from scenario", summary: "forbidden", projectId: "p1", teamId: "t1", task: { title: "task", description: "task", priority: "P2" } };
    const response = await POST(new Request("http://localhost/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      message: "explain", scenarioAnalysisId: "analysis-1", context: "forged client context", scenarioContext: { secret: "CLIENT-SECRET" },
    }) }));
    const payload = await response.json() as { proposal?: unknown; proposalError?: string };
    expect(response.status).toBe(200);
    expect(state.findAnalysis).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "analysis-1" } }));
    expect(state.dispatch).toHaveBeenCalledTimes(1);
    const prompt = String(state.dispatch.mock.calls[0]?.[0]);
    expect(prompt).toContain("Saved scenario");
    expect(prompt).toContain("Saved estimate");
    expect(prompt).toContain("scenario-hermes-context/v1");
    expect(prompt).toContain("هیچ بلوک proposal تولید نکن");
    expect(prompt).not.toContain("CLIENT-SECRET");
    expect(prompt).not.toContain("forged client context");
    expect(prompt).not.toContain("stored-secret");
    expect(payload.proposal).toBeNull();
    expect(payload.proposalError).toContain("فقط تفسیری");
  });
});
