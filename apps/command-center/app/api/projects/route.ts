import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { createProject } from "../../../server/domain/project-service";
import { prisma } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const projects = await prisma.project.findMany({ where: { archivedAt: null, ...(user.role === "CEO" ? {} : { teams: { some: { memberships: { some: { userId: user.userId, archivedAt: null } } } } }) }, orderBy: { name: "asc" } });
    return NextResponse.json(projects);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطا" }, { status: 401 }); }
}

export async function POST(request: Request) {
  try { const user = await requireUser(request); return NextResponse.json(await createProject(await request.json(), { userId: user.userId, role: user.role, teamIds: user.teamIds }), { status: 201 }); }
  catch (error) { const message = error instanceof Error ? error.message : "خطا"; return NextResponse.json({ error: message }, { status: /Unauthorized|Invalid or expired session/.test(message) ? 401 : 400 }); }
}
