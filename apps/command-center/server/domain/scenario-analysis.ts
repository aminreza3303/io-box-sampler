import { z } from "zod";

const assumptionsSchema = z.object({
  teamCount: z.number().finite().min(1).max(20).optional(),
  weeklyCapacity: z.number().finite().min(1).max(40).optional(),
  personDayRate: z.number().finite().int().min(0).max(1_000_000_000).nullable().optional(),
  bufferPercent: z.number().finite().min(0).max(100).optional(),
}).strict();

export const scenarioRequestSchema = z.object({
  title: z.string().trim().min(1, "عنوان سناریو الزامی است.").max(120),
  description: z.string().trim().max(4_000).optional(),
  domainIds: z.array(z.string().trim().min(1)).min(1).max(28).refine((ids) => new Set(ids).size === ids.length, "دامنه تکراری است."),
  projectIds: z.array(z.string().trim().min(1)).max(20).optional(),
  teamIds: z.array(z.string().trim().min(1)).max(20).optional(),
  assumptions: assumptionsSchema.optional(),
});

export type ScenarioRequest = z.infer<typeof scenarioRequestSchema>;

export function parseScenarioRequest(input: unknown) {
  return scenarioRequestSchema.parse(input);
}

export function canViewScenarioAnalysis(actor: { role: string; userId: string }, creatorId: string) {
  return actor.role === "CEO" || actor.userId === creatorId;
}
