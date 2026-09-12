import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findSource: vi.fn(),
  createSnapshot: vi.fn(),
  createAudit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("../../lib/db", () => ({
  prisma: {
    scenarioAnalysis: { findUnique: mocks.findSource },
    $transaction: mocks.transaction,
  },
}));

import { POST as recordScenarioDecision } from "../../app/api/scenarios/[id]/decision/route";

const sourceEstimate = () => ({
  modelVersion: "scenario-business-case/v1",
  title: "پس‌انداز گردشی",
  description: "فرضیه",
  catalogSnapshot: null,
  cases: [],
  comparison: { metrics: [], differingInputs: [] },
  kpiEvaluations: [],
  gateDecision: { decision: null, reason: "", evidence: "", owner: "", reviewDate: null },
  priority: null,
  evidenceCompleteness: { recorded: 0, missing: 0, missingFields: [] },
  warnings: [],
  limitations: [],
});

const sourceRecord = () => ({
  id: "analysis-source",
  title: "پس‌انداز گردشی",
  description: "فرضیه",
  selectedDomainIds: ["wallet"],
  projectIds: ["newcash"],
  teamIds: ["product"],
  assumptions: { title: "پس‌انداز گردشی", cases: [] },
  estimate: sourceEstimate(),
  createdById: "author-1",
});

const decision = {
  decision: "continue",
  reason: "ادامه تا gate بعدی",
  evidence: "نمونهٔ پایلوت",
  owner: "مدیرعامل",
  reviewDate: "2026-10-01",
};

describe("CEO scenario decision endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ userId: "ceo-1", role: "CEO", teamIds: [], projectIds: [] });
    mocks.findSource.mockResolvedValue(sourceRecord());
    mocks.createSnapshot.mockResolvedValue({ id: "analysis-decision" });
    mocks.createAudit.mockResolvedValue({ id: "audit-decision" });
    const tx = {
      scenarioAnalysis: { create: mocks.createSnapshot },
      auditEvent: { create: mocks.createAudit },
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
  });

  const post = (payload: unknown = decision) => recordScenarioDecision(
    new Request("http://localhost/api/scenarios/analysis-source/decision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id: "analysis-source" }) },
  );

  it("creates a new immutable decision snapshot and audit event in one transaction", async () => {
    const source = sourceRecord();
    mocks.findSource.mockResolvedValue(source);
    const response = await post();
    const body = await response.json();
    const createData = mocks.createSnapshot.mock.calls[0][0].data;

    expect(response.status).toBe(201);
    expect(body.sourceAnalysisId).toBe(source.id);
    expect(createData.assumptions).toEqual({
      sourceAnalysisId: source.id,
      sourceAssumptions: source.assumptions,
      decision,
    });
    expect(createData.estimate.gateDecision).toEqual(decision);
    expect(source.estimate.gateDecision.decision).toBeNull();
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.createAudit).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "SCENARIO_DECISION_RECORDED",
        targetType: "ScenarioAnalysis",
        targetId: "analysis-decision",
        metadata: { sourceAnalysisId: source.id, decision },
      }),
    }));
  });

  it("is CEO-only and does not read or write the record for a non-CEO", async () => {
    mocks.requireUser.mockResolvedValue({ userId: "member-1", role: "MEMBER", teamIds: [], projectIds: [] });
    const response = await post();

    expect(response.status).toBe(403);
    expect(mocks.findSource).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns not found and refuses legacy analyses without changing either", async () => {
    mocks.findSource.mockResolvedValue(null);
    expect((await post()).status).toBe(404);
    mocks.findSource.mockResolvedValue({ ...sourceRecord(), estimate: { metrics: { personDays: 3 } } });
    expect((await post()).status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an incomplete or malformed decision", async () => {
    expect((await post({ ...decision, evidence: " " })).status).toBe(400);
    expect((await post({ ...decision, decision: "approve" })).status).toBe(400);
    expect(mocks.findSource).not.toHaveBeenCalled();
  });

  it("returns a stable 400 for malformed JSON without reading or writing a snapshot", async () => {
    const response = await recordScenarioDecision(
      new Request("http://localhost/api/scenarios/analysis-source/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      { params: Promise.resolve({ id: "analysis-source" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "بدنهٔ درخواست معتبر نیست." });
    expect(mocks.findSource).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
