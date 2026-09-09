import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { listCommandCenterSnapshot } from "../../../server/domain/project-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const params = new URL(request.url).searchParams;
    const snapshot = await listCommandCenterSnapshot({
      projectId: params.get("projectId") || undefined,
      teamId: params.get("teamId") || undefined,
      assigneeId: params.get("assigneeId") || undefined,
      status: params.get("status") || undefined,
      phase: params.get("phase") || undefined,
      zoom: params.get("zoom") || undefined,
    } as Parameters<typeof listCommandCenterSnapshot>[0], { userId: user.userId, role: user.role, teamIds: user.teamIds });
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطا در دریافت snapshot";
    return NextResponse.json({ error: message }, { status: /Unauthorized|Invalid or expired session/.test(message) ? 401 : 400 });
  }
}
