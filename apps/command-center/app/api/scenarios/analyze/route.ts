import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "../../../../lib/auth";
import { calculateScenarioEstimate } from "../../../../lib/scenario-planner";
import { parseScenarioRequest } from "../../../../server/domain/scenario-analysis";
import { prisma } from "../../../../lib/db";
import { recordAuditEvent } from "../../../../server/domain/audit-service";

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "issues" in error) return "ورودی سناریو معتبر نیست.";
  return error instanceof Error ? error.message : "تحلیل سناریو ناموفق بود.";
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = parseScenarioRequest(await request.json());
    const estimate = calculateScenarioEstimate(input);
    if (estimate.selectedDomainIds.length !== input.domainIds.length) return NextResponse.json({ error: "یکی از دامنه‌های انتخاب‌شده در کاتالوگ وجود ندارد." }, { status: 400 });
    if (user.role !== "CEO" && input.projectIds?.some((id) => !user.projectIds.includes(id))) return NextResponse.json({ error: "یکی از پروژه‌های انتخاب‌شده خارج از دسترسی شماست." }, { status: 403 });
    if (user.role !== "CEO" && input.teamIds?.some((id) => !user.teamIds.includes(id))) return NextResponse.json({ error: "یکی از تیم‌های انتخاب‌شده خارج از دسترسی شماست." }, { status: 403 });

    const analysis = await prisma.scenarioAnalysis.create({
      data: {
        title: input.title,
        description: input.description || null,
        selectedDomainIds: input.domainIds as Prisma.InputJsonValue,
        projectIds: (input.projectIds ?? []) as Prisma.InputJsonValue,
        teamIds: (input.teamIds ?? []) as Prisma.InputJsonValue,
        assumptions: (input.assumptions ?? {}) as Prisma.InputJsonValue,
        estimate: estimate as unknown as Prisma.InputJsonValue,
        createdById: user.userId,
      },
    });
    await recordAuditEvent({ actorId: user.userId, action: "SCENARIO_ANALYZED", targetType: "ScenarioAnalysis", targetId: analysis.id, metadata: { domainCount: estimate.changeVolume.domainCount, personDays: estimate.metrics.personDays, calendarWeeks: estimate.metrics.calendarWeeks } }).catch(() => undefined);
    return NextResponse.json({ analysis, estimate }, { status: 201 });
  } catch (error) {
    const message = errorMessage(error);
    const status = /Unauthorized|Invalid or expired session/.test(message) ? 401 : message.includes("خارج از دسترسی") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
