import { prisma } from "../../lib/db";
import type { Prisma } from "@prisma/client";

export type AuditEventInput = { actorId: string; action: string; targetType: string; targetId: string; projectId?: string; teamId?: string; taskId?: string; metadata?: Record<string, unknown> };
export async function recordAuditEvent(event: AuditEventInput) { return prisma.auditEvent.create({ data: { ...event, metadata: event.metadata as Prisma.InputJsonValue | undefined } }); }
export async function listAuditEvents(actor: { role: string; userId: string; projectIds?: string[]; teamIds?: string[] }) { return prisma.auditEvent.findMany({ where: actor.role === "CEO" ? {} : { OR: [{ projectId: { in: actor.projectIds ?? [] } }, { teamId: { in: actor.teamIds ?? [] } }, { actorId: actor.userId }] }, orderBy: { createdAt: "desc" }, take: 200 }); }
