import { z } from "zod";

export const roleValues = ["CEO", "MANAGER", "MEMBER"] as const;
export type DomainRole = (typeof roleValues)[number];

export type DomainActor = {
  userId: string;
  role: DomainRole;
  teamIds?: string[];
  projectIds?: string[];
};

export const taskPhaseTypes = ["PRODUCT", "DESIGN", "DEVELOPMENT", "DELIVERY"] as const;
export type TaskPhaseType = (typeof taskPhaseTypes)[number];

const optionalDate = z.coerce.date().optional();

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(4_000).optional(),
});

export const createTaskSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(10_000).optional(),
  projectId: z.string().min(1),
  teamId: z.string().min(1),
  sprintId: z.string().min(1).optional(),
  backlogItemId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: optionalDate,
  dependencyTaskIds: z.array(z.string().min(1)).default([]),
});

export const updateTaskPhaseSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETE"]).optional(),
  notes: z.string().trim().max(10_000).nullable().optional(),
  dueDate: optionalDate.nullable(),
});

export const commandCenterSnapshotFiltersSchema = z.object({
  projectId: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]).optional(),
  phase: z.enum(taskPhaseTypes).optional(),
  zoom: z.enum(["day", "week", "month"]).default("day"),
}).default({ zoom: "day" });

export const createTeamSchema = z.object({ name: z.string().trim().min(1).max(120), slug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/), projectId: z.string().min(1) });
export const addTeamMemberSchema = z.object({ teamId: z.string().min(1), userId: z.string().min(1), role: z.enum(roleValues).default("MEMBER") });
export const createSprintSchema = z.object({ projectId: z.string().min(1), teamId: z.string().min(1).optional(), name: z.string().trim().min(1).max(120), goal: z.string().trim().max(4_000).optional(), startDate: z.coerce.date(), endDate: z.coerce.date() }).refine((value) => value.endDate > value.startDate, { message: "end date must be after start date", path: ["endDate"] });
export const riskIssueSchema = z.object({ kind: z.enum(["RISK", "ISSUE"]), id: z.string().min(1).optional(), projectId: z.string().min(1), teamId: z.string().min(1).optional(), taskId: z.string().min(1).optional(), title: z.string().trim().min(1).max(240), description: z.string().trim().max(10_000).optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"), status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]).default("TODO"), mitigation: z.string().trim().max(10_000).optional(), dueDate: z.coerce.date().optional() });

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskPhasePatch = z.input<typeof updateTaskPhaseSchema>;
export type CommandCenterSnapshotFilters = z.input<typeof commandCenterSnapshotFiltersSchema>;
export type CreateTeamInput = z.input<typeof createTeamSchema>;
export type AddTeamMemberInput = z.input<typeof addTeamMemberSchema>;
export type CreateSprintInput = z.input<typeof createSprintSchema>;
export type RiskIssueInput = z.input<typeof riskIssueSchema>;
