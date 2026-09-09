import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { listAuditEvents } from "../../../server/domain/audit-service";

export async function GET(request: Request) { try { const user = await requireUser(request); return NextResponse.json(await listAuditEvents({ role: user.role, userId: user.userId, projectIds: user.projectIds, teamIds: user.teamIds })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 }); } }
