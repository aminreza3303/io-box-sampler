import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { listProposals } from "../../../../server/domain/proposal-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(await listProposals({
      userId: user.userId,
      role: user.role,
      teamIds: user.teamIds,
      projectIds: user.projectIds,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطا در دریافت پیشنهادها";
    return NextResponse.json({ error: message }, { status: /Unauthorized|Invalid/.test(message) ? 401 : 400 });
  }
}
