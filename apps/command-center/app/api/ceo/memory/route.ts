import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { createMemory, searchMemory } from "../../../../server/domain/memory-service";

export async function GET(request: Request) { try { const user = await requireUser(request); const params = new URL(request.url).searchParams; return NextResponse.json(await searchMemory(params.get("q") ?? "", (params.get("scope") as never) || undefined, { userId: user.userId, role: user.role, teamIds: user.teamIds, projectIds: user.projectIds })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطا" }, { status: 401 }); } }
export async function POST(request: Request) { try { const user = await requireUser(request); return NextResponse.json(await createMemory(await request.json(), { userId: user.userId, role: user.role, teamIds: user.teamIds, projectIds: user.projectIds }), { status: 201 }); } catch (error) { const message = error instanceof Error ? error.message : "خطا"; return NextResponse.json({ error: message }, { status: /Unauthorized|Invalid/.test(message) ? 401 : 400 }); } }
