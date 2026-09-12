import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { ScenarioEstimate } from "../../../../../lib/scenario-types";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { parseScenarioDecision } from "../../../../../server/domain/scenario-analysis";

type RouteContext = { params: Promise<{ id: string }> };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireUser(request);
    if (actor.role !== "CEO") return NextResponse.json({ error: "ثبت تصمیم فقط برای مدیرعامل مجاز است." }, { status: 403 });

    const { id: sourceAnalysisId } = await context.params;
    if (!sourceAnalysisId.trim()) return NextResponse.json({ error: "شناسهٔ تحلیل معتبر نیست." }, { status: 400 });
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "بدنهٔ درخواست معتبر نیست." }, { status: 400 });
    }
    const decision = parseScenarioDecision(payload);
    const source = await prisma.scenarioAnalysis.findUnique({ where: { id: sourceAnalysisId } });
    if (!source) return NextResponse.json({ error: "تحلیل موردنظر پیدا نشد." }, { status: 404 });

    if (!isObject(source.estimate) || source.estimate.modelVersion !== "scenario-business-case/v1") {
      return NextResponse.json({ error: "برای تحلیل قدیمی، ابتدا یک تحلیل نسخه‌دار جدید بسازید." }, { status: 409 });
    }
    const sourceEstimate = source.estimate as unknown as ScenarioEstimate;
    const nextEstimate: ScenarioEstimate = { ...sourceEstimate, gateDecision: decision };

    const snapshot = await prisma.$transaction(async (transaction) => {
      const created = await transaction.scenarioAnalysis.create({
        data: {
          title: source.title,
          description: source.description,
          selectedDomainIds: source.selectedDomainIds as Prisma.InputJsonValue,
          projectIds: (source.projectIds ?? []) as Prisma.InputJsonValue,
          teamIds: (source.teamIds ?? []) as Prisma.InputJsonValue,
          assumptions: ({ sourceAnalysisId, sourceAssumptions: source.assumptions, decision } as unknown) as Prisma.InputJsonValue,
          estimate: nextEstimate as unknown as Prisma.InputJsonValue,
          createdById: actor.userId,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorId: actor.userId,
          action: "SCENARIO_DECISION_RECORDED",
          targetType: "ScenarioAnalysis",
          targetId: created.id,
          metadata: { sourceAnalysisId, decision } as Prisma.InputJsonValue,
        },
      });
      return created;
    });

    return NextResponse.json({ analysis: snapshot, sourceAnalysisId, decision }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "تصمیم سناریو معتبر نیست." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "ثبت تصمیم سناریو ناموفق بود.";
    const status = /Unauthorized|Invalid or expired session/.test(message) ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? "نشست شما معتبر نیست." : message }, { status });
  }
}
