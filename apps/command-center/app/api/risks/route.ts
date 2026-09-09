import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { updateRiskOrIssue } from "../../../server/domain/portfolio-service";

export async function POST(request: Request) {
  try { const user = await requireUser(request); return NextResponse.json(await updateRiskOrIssue(await request.json(), { userId: user.userId, role: user.role, teamIds: user.teamIds, projectIds: user.projectIds }), { status: 201 }); }
  catch (error) { const message = error instanceof Error ? error.message : "خطا"; return NextResponse.json({ error: message }, { status: /Unauthorized|Invalid or expired session/.test(message) ? 401 : 400 }); }
}
