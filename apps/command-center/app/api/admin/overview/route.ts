import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { createAgentAdapters, agentRoster } from "../../../../server/agents/orchestrator";
import { getProjectMetrics } from "../../../../server/domain/metrics-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (user.role === "MEMBER") return NextResponse.json({ error: "این نمای مدیریتی برای نقش شما فعال نیست." }, { status: 403 });
    const adapters = createAgentAdapters();
    const [metrics, hermes, omp] = await Promise.all([
      getProjectMetrics({}, { role: user.role, projectIds: user.projectIds, teamIds: user.teamIds }),
      adapters.hermes.health(),
      adapters.omp.health(),
    ]);
    return NextResponse.json({ metrics, health: { roster: agentRoster, runtimes: { hermes, omp } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "دریافت نمای ادمین ناموفق بود.";
    return NextResponse.json({ error: /Unauthorized|Invalid or expired session/.test(message) ? "نشست شما معتبر نیست." : message }, { status: 401 });
  }
}
