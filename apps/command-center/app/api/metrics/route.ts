import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { getProjectMetrics } from "../../../server/domain/metrics-service";

export async function GET(request: Request) { try { const user = await requireUser(request); const params = new URL(request.url).searchParams; return NextResponse.json(await getProjectMetrics({ projectId: params.get("projectId") || undefined, teamId: params.get("teamId") || undefined }, { role: user.role, projectIds: user.projectIds, teamIds: user.teamIds })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطا" }, { status: 400 }); } }
