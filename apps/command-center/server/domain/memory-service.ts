import { prisma } from "../../lib/db";
import { type DomainActor } from "../../lib/validators";

export type MemoryInput = { content: string; scope: "PRIVATE" | "TEAM" | "PROJECT" | "ORGANIZATION"; projectId?: string; teamId?: string; taskId?: string };

function canSee(actor: DomainActor, memory: { scope: string; projectId: string | null; teamId: string | null; authorId: string }) {
  if (actor.role === "CEO") return true;
  if (memory.scope === "ORGANIZATION") return false;
  if (memory.scope === "PRIVATE") return memory.authorId === actor.userId;
  return Boolean((memory.projectId && actor.projectIds?.includes(memory.projectId)) || (memory.teamId && actor.teamIds?.includes(memory.teamId)));
}

export async function searchMemory(query: string, scope: MemoryInput["scope"] | undefined, actor: DomainActor) {
  const memories = await prisma.memory.findMany({ where: { archivedAt: null, ...(scope ? { scope } : {}), OR: [{ content: { contains: query, mode: "insensitive" } }, { content: { startsWith: query, mode: "insensitive" } }] }, orderBy: { updatedAt: "desc" } });
  return memories.filter((memory) => canSee(actor, memory));
}

export async function createMemory(input: MemoryInput, actor: DomainActor) {
  if (input.scope === "ORGANIZATION" && actor.role !== "CEO") throw new Error("not allowed to write organization memory");
  if (input.projectId && actor.role !== "CEO" && !actor.projectIds?.includes(input.projectId)) throw new Error("not allowed for this project");
  if (input.teamId && actor.role !== "CEO" && !actor.teamIds?.includes(input.teamId)) throw new Error("not allowed for this team");
  return prisma.$transaction(async (transaction) => {
    const memory = await transaction.memory.create({ data: { ...input, authorId: actor.userId } });
    await transaction.auditEvent.create({ data: { actorId: actor.userId, projectId: input.projectId, teamId: input.teamId, taskId: input.taskId, action: "MEMORY_CREATED", targetType: "Memory", targetId: memory.id } });
    return memory;
  });
}
