import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { updateTaskPhase } from "../../../../server/domain/task-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireUser(request);
    const body = await request.json() as { phaseType?: string; patch?: Record<string, unknown> };
    const result = await updateTaskPhase((await params).taskId, body.phaseType ?? "", body.patch ?? {}, { userId: user.userId, role: user.role, teamIds: user.teamIds });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطا در ویرایش فاز" }, { status: 400 });
  }
}
