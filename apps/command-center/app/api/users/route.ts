import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/db";

export async function GET(request: Request) {
  try { const user = await requireUser(request); const users = await prisma.user.findMany({ where: { archivedAt: null, ...(user.role === "CEO" ? {} : { teamMemberships: { some: { userId: user.userId, archivedAt: null } } }) }, select: { id: true, email: true, displayName: true, role: true }, orderBy: { displayName: "asc" } }); return NextResponse.json(users); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطا" }, { status: 401 }); }
}
