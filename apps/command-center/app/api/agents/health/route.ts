import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { createAgentAdapters, agentRoster } from "../../../../server/agents/orchestrator";

export async function GET(request: Request) {
  try { await requireUser(request); const adapters = createAgentAdapters(); const [hermes, omp] = await Promise.all([adapters.hermes.health(), adapters.omp.health()]); return NextResponse.json({ roster: agentRoster, runtimes: { hermes, omp } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 }); }
}
