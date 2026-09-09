import { prisma } from "../../lib/db";
import { evaluateScenario, type RuleEvaluation } from "./rule-evaluator";

export async function evaluateStoredScenario(scenarioId: string, snapshot: Record<string, unknown>): Promise<RuleEvaluation> {
  const scenario = await prisma.scenario.findFirst({ where: { id: scenarioId, enabled: true, archivedAt: null } });
  if (!scenario) throw new Error("scenario not found");
  return evaluateScenario(scenario.rules as never, snapshot);
}
