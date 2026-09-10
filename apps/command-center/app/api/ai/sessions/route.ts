import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { listAgentSessions } from "../../../../server/agents/session-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const projectId = new URL(request.url).searchParams.get("projectId") || undefined;
    return NextResponse.json(await listAgentSessions({ userId: user.userId, role: user.role, projectIds: user.projectIds, teamIds: user.teamIds }, projectId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "دریافت sessionهای Hermes ناموفق بود.";
    return NextResponse.json({ error: /Unauthorized|Invalid or expired session/.test(message) ? "نشست شما معتبر نیست." : message }, { status: /Unauthorized|Invalid or expired session/.test(message) ? 401 : 403 });
  }
}
