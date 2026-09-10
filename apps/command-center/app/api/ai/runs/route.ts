import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const runs = await prisma.agentRun.findMany({
      where: user.role === "CEO" ? {} : { actorId: user.userId },
      select: { id: true, runtime: true, prompt: true, status: true, resultKind: true, output: true, error: true, context: true, createdAt: true, completedAt: true, actor: { select: { displayName: true } }, agentSession: { select: { sessionName: true, project: { select: { name: true, code: true } } } }, messages: { select: { id: true, role: true, content: true, createdAt: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return NextResponse.json(runs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: /Unauthorized|Invalid or expired session/.test(message) ? "نشست شما معتبر نیست." : message }, { status: 401 });
  }
}
