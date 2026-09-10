import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const analyses = await prisma.scenarioAnalysis.findMany({
      where: user.role === "CEO" ? {} : { createdById: user.userId },
      select: { id: true, title: true, description: true, selectedDomainIds: true, projectIds: true, teamIds: true, assumptions: true, estimate: true, createdById: true, createdAt: true, updatedAt: true, createdBy: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(analyses);
  } catch (error) {
    const message = error instanceof Error ? error.message : "نشست شما معتبر نیست.";
    return NextResponse.json({ error: /Unauthorized|Invalid or expired session/.test(message) ? "نشست شما معتبر نیست." : message }, { status: 401 });
  }
}
