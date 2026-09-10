import { prisma } from "../../lib/db";
import type { DomainActor } from "../../lib/validators";
import { resolveProjectWorkspace, type ProjectWorkspace } from "./project-workspace";

const runtime = "hermes";

export type AgentSessionView = {
  project: { id: string; name: string; code: string };
  session: { id: string; sessionName: string; externalSessionId: string | null; status: string; lastRunAt: Date | null; updatedAt: Date } | null;
  workspace: { key: string; available: boolean; source?: ProjectWorkspace["source"]; error?: string };
};

function canAccessProject(actor: DomainActor, projectId: string) {
  return actor.role === "CEO" || Boolean(actor.projectIds?.includes(projectId));
}

export function makeSessionName(projectCode: string, ownerId: string) {
  return `command-center-${projectCode.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${ownerId}`.slice(0, 120);
}

export async function getOrCreateAgentSession(actor: DomainActor, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, archivedAt: null }, select: { id: true, name: true, code: true } });
  if (!project) throw new Error("پروژهٔ انتخاب‌شده پیدا نشد.");
  if (!canAccessProject(actor, project.id)) throw new Error("به این پروژه دسترسی ندارید.");

  const workspace = await resolveProjectWorkspace(project);
  if ("error" in workspace) throw new Error(workspace.error);
  const sessionName = makeSessionName(project.code, actor.userId);
  const existing = await prisma.agentSession.findUnique({ where: { ownerId_projectId_runtime: { ownerId: actor.userId, projectId: project.id, runtime } } });
  const session = existing
    ? await prisma.agentSession.update({ where: { id: existing.id }, data: { workspaceKey: workspace.key, workspacePath: workspace.path, status: "ACTIVE" } })
    : await prisma.agentSession.create({ data: { ownerId: actor.userId, projectId: project.id, runtime, sessionName, workspaceKey: workspace.key, workspacePath: workspace.path } });
  return { session, project, workspace, created: !existing };
}

export async function listAgentSessions(actor: DomainActor, projectId?: string): Promise<AgentSessionView[]> {
  if (projectId && actor.role !== "CEO" && !actor.projectIds?.includes(projectId)) throw new Error("به این پروژه دسترسی ندارید.");
  const projects = await prisma.project.findMany({
    where: { archivedAt: null, ...(projectId ? { id: projectId } : {}), ...(actor.role === "CEO" ? {} : { id: { in: actor.projectIds ?? [] } }) },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  const sessions = await prisma.agentSession.findMany({
    where: { ownerId: actor.userId, runtime, ...(projectId ? { projectId } : {}) },
    select: { id: true, projectId: true, sessionName: true, externalSessionId: true, status: true, lastRunAt: true, updatedAt: true },
  });
  return Promise.all(projects.map(async (project) => {
    const workspace = await resolveProjectWorkspace(project);
    const session = sessions.find((item) => item.projectId === project.id) ?? null;
    return {
      project,
      session,
      workspace: "error" in workspace ? { key: workspace.key, available: false, error: workspace.error } : { key: workspace.key, available: true, source: workspace.source },
    };
  }));
}
