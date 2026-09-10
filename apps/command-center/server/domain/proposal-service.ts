import { prisma } from "../../lib/db";
import type { Prisma } from "@prisma/client";
import { createTaskSchema, taskPhaseTypes, type DomainActor } from "../../lib/validators";

export type ProposalInput = { title: string; summary?: string; scope: "PRIVATE" | "TEAM" | "PROJECT" | "ORGANIZATION"; projectId?: string; teamId?: string; createdById: string; payload: Record<string, unknown> };

export async function listProposals(actor: DomainActor) {
  const where = actor.role === "CEO"
    ? { status: "PROPOSED" as const }
    : {
      status: "PROPOSED" as const,
      OR: [
        { scope: "PRIVATE" as const, createdById: actor.userId },
        ...(actor.teamIds?.length ? [{ scope: "TEAM" as const, teamId: { in: actor.teamIds } }] : []),
        ...(actor.projectIds?.length ? [{ scope: "PROJECT" as const, projectId: { in: actor.projectIds } }] : []),
      ],
    };

  return prisma.planProposal.findMany({
    where,
    include: { project: true, team: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProposalFromAgent(input: ProposalInput) {
  if (input.scope === "ORGANIZATION" && !input.projectId && input.teamId) throw new Error("invalid organization proposal scope");
  return prisma.planProposal.create({ data: { ...input, payload: input.payload as Prisma.InputJsonValue } });
}

export async function approveProposal(proposalId: string, actor: DomainActor) {
  if (actor.role !== "CEO") throw new Error("only the CEO can approve proposals");
  return prisma.$transaction(async (transaction) => {
    const proposal = await transaction.planProposal.findFirst({ where: { id: proposalId, status: "PROPOSED" } });
    if (!proposal) throw new Error("proposal not found or already reviewed");
    const payload = proposal.payload as { action?: string; task?: Record<string, unknown> };
    let createdTaskId: string | undefined;
    if (payload.action === "CREATE_TASK" && payload.task) {
      const taskInput = createTaskSchema.parse({ ...payload.task, dependencyTaskIds: [] });
      if (taskInput.projectId !== proposal.projectId || (proposal.teamId && taskInput.teamId !== proposal.teamId)) throw new Error("proposal task scope does not match its project/team");
      const team = await transaction.team.findFirst({ where: { id: taskInput.teamId, projectId: taskInput.projectId, archivedAt: null, project: { archivedAt: null } }, select: { id: true } });
      if (!team) throw new Error("proposal task team is not active in its project");
      if (taskInput.assigneeId && !await transaction.teamMember.findFirst({ where: { teamId: taskInput.teamId, userId: taskInput.assigneeId, archivedAt: null, user: { archivedAt: null } }, select: { id: true } })) throw new Error("proposal task assignee is not an active team member");
      const task = await transaction.task.create({ data: { title: taskInput.title, description: taskInput.description, projectId: taskInput.projectId, teamId: taskInput.teamId, sprintId: taskInput.sprintId, backlogItemId: taskInput.backlogItemId, assigneeId: taskInput.assigneeId, priority: taskInput.priority, dueDate: taskInput.dueDate, createdById: actor.userId, phases: { create: taskPhaseTypes.map((phaseType) => ({ phaseType })) } } });
      createdTaskId = task.id;
    }
    const updated = await transaction.planProposal.update({ where: { id: proposal.id }, data: { status: "ACCEPTED", reviewedById: actor.userId } });
    await transaction.auditEvent.create({ data: { actorId: actor.userId, projectId: proposal.projectId, teamId: proposal.teamId, action: "PROPOSAL_APPROVED", targetType: "PlanProposal", targetId: proposal.id, metadata: createdTaskId ? { createdTaskId } : undefined } });
    return { status: "APPLIED" as const, proposal: updated, createdTaskId };
  });
}

export async function rejectProposal(proposalId: string, actor: DomainActor, reason: string) {
  if (actor.role !== "CEO") throw new Error("only the CEO can reject proposals");
  return prisma.$transaction(async (transaction) => {
    const proposal = await transaction.planProposal.update({ where: { id: proposalId, status: "PROPOSED" }, data: { status: "REJECTED", reviewedById: actor.userId, reviewReason: reason } });
    await transaction.auditEvent.create({ data: { actorId: actor.userId, projectId: proposal.projectId, teamId: proposal.teamId, action: "PROPOSAL_REJECTED", targetType: "PlanProposal", targetId: proposal.id, metadata: { reason } } });
    return proposal;
  });
}
