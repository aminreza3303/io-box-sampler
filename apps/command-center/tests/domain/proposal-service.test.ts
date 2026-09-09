import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({ prisma: { planProposal: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() }, task: { create: vi.fn() }, auditEvent: { create: vi.fn() }, $transaction: vi.fn() } }));
vi.mock("../../lib/db", () => ({ prisma }));
import { approveProposal, createProposalFromAgent, rejectProposal } from "../../server/domain/proposal-service";

describe("proposal service", () => {
  beforeEach(() => { vi.resetAllMocks(); prisma.$transaction.mockImplementation(async (callback) => callback(prisma)); prisma.planProposal.create.mockResolvedValue({ id: "proposal-1", status: "PROPOSED" }); prisma.planProposal.update.mockResolvedValue({ id: "proposal-1", status: "ACCEPTED" }); prisma.auditEvent.create.mockResolvedValue({ id: "audit-1" }); });
  it("creates a proposal without applying it", async () => { await createProposalFromAgent({ title: "پیشنهاد", scope: "ORGANIZATION", createdById: "agent", payload: { action: "CREATE_TASK" } }); expect(prisma.planProposal.create).toHaveBeenCalled(); expect(prisma.task.create).not.toHaveBeenCalled(); });
  it("requires CEO approval and applies a task proposal atomically", async () => { prisma.planProposal.findFirst.mockResolvedValue({ id: "proposal-1", status: "PROPOSED", scope: "PROJECT", projectId: "project-1", payload: { action: "CREATE_TASK", task: { projectId: "project-1", teamId: "team-1", title: "کار جدید" } } }); prisma.task.create.mockResolvedValue({ id: "task-1" }); await expect(approveProposal("proposal-1", { userId: "manager", role: "MANAGER", teamIds: ["team-1"], projectIds: ["project-1"] })).rejects.toThrow("only the CEO"); await expect(approveProposal("proposal-1", { userId: "ceo", role: "CEO", teamIds: [], projectIds: [] })).resolves.toMatchObject({ status: "APPLIED", createdTaskId: "task-1" }); });
  it("rejects proposals with a reason", async () => { prisma.planProposal.update.mockResolvedValue({ id: "proposal-1", status: "REJECTED", reviewReason: "ریسک بالا" }); await expect(rejectProposal("proposal-1", { userId: "ceo", role: "CEO", teamIds: [], projectIds: [] }, "ریسک بالا")).resolves.toMatchObject({ status: "REJECTED" }); });
});
