import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/db";
import { createTeam } from "../../../server/domain/portfolio-service";

export async function GET(request: Request) {
  try { const user = await requireUser(request); const teams = await prisma.team.findMany({ where: { archivedAt: null, ...(user.role === "CEO" ? {} : { memberships: { some: { userId: user.userId, archivedAt: null } } }) }, include: { project: { select: { name: true } }, memberships: { where: { archivedAt: null }, include: { user: { select: { id: true, displayName: true, role: true } } } } }, orderBy: { name: "asc" } }); return NextResponse.json(teams); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطا" }, { status: 401 }); }
}

export async function POST(request: Request) {
  try { const user = await requireUser(request); return NextResponse.json(await createTeam(await request.json(), { userId: user.userId, role: user.role, teamIds: user.teamIds, projectIds: user.projectIds }), { status: 201 }); }
  catch (error) { const message = error instanceof Error ? error.message : "خطا"; return NextResponse.json({ error: message }, { status: /Unauthorized|Invalid or expired session/.test(message) ? 401 : 400 }); }
}
