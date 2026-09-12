import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getStrategicScenario } from "../../../../lib/scenario-catalog";
import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";
import { recordAuditEvent } from "../../../../server/domain/audit-service";
import { buildScenarioEstimate, parseScenarioRequest } from "../../../../server/domain/scenario-analysis";

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "issues" in error) return "ورودی سناریو معتبر نیست.";
  return error instanceof Error ? error.message : "تحلیل سناریو ناموفق بود.";
}

function statusFor(error: unknown, message: string): number {
  if (error && typeof error === "object" && "issues" in error) return 400;
  if (/Unauthorized|Invalid or expired session/.test(message)) return 401;
  if (message.includes("خارج از دسترسی")) return 403;
  return 400;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = parseScenarioRequest(await request.json());
    if (user.role !== "CEO" && input.projectIds?.some((id) => !user.projectIds.includes(id))) {
      return NextResponse.json({ error: "یکی از پروژه‌های انتخاب‌شده خارج از دسترسی شماست." }, { status: 403 });
    }
    if (user.role !== "CEO" && input.teamIds?.some((id) => !user.teamIds.includes(id))) {
      return NextResponse.json({ error: "یکی از تیم‌های انتخاب‌شده خارج از دسترسی شماست." }, { status: 403 });
    }

    const catalogSnapshot = input.catalogScenarioId === undefined
      ? null
      : getStrategicScenario(input.catalogScenarioId) ?? null;
    if (input.catalogScenarioId !== undefined && catalogSnapshot === null) {
      return NextResponse.json({ error: "سناریوی کاتالوگ پیدا نشد." }, { status: 400 });
    }

    const estimate = buildScenarioEstimate(input, catalogSnapshot);
    if (estimate.cases.some((item) => item.technical.selectedDomainIds.length !== input.domainIds.length)) {
      return NextResponse.json({ error: "یکی از دامنه‌های انتخاب‌شده در کاتالوگ وجود ندارد." }, { status: 400 });
    }

    const analysis = await prisma.scenarioAnalysis.create({
      data: {
        title: input.title,
        description: input.description || null,
        selectedDomainIds: input.domainIds as Prisma.InputJsonValue,
        projectIds: (input.projectIds ?? []) as Prisma.InputJsonValue,
        teamIds: (input.teamIds ?? []) as Prisma.InputJsonValue,
        assumptions: ({ ...input, catalogSnapshot } as unknown) as Prisma.InputJsonValue,
        estimate: estimate as unknown as Prisma.InputJsonValue,
        createdById: user.userId,
      },
    });
    await recordAuditEvent({
      actorId: user.userId,
      action: "SCENARIO_ANALYZED",
      targetType: "ScenarioAnalysis",
      targetId: analysis.id,
      metadata: {
        modelVersion: estimate.modelVersion,
        catalogScenarioId: input.catalogScenarioId ?? null,
        caseCount: estimate.cases.length,
        domainCount: input.domainIds.length,
      },
    }).catch(() => undefined);
    return NextResponse.json({ analysis, estimate }, { status: 201 });
  } catch (error) {
    const message = errorMessage(error);
    return NextResponse.json({ error: message }, { status: statusFor(error, message) });
  }
}
