import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";

export async function GET(request: Request) { try { const user = await requireUser(request); const goals = await prisma.goal.findMany({ where: { archivedAt: null, ...(user.role === "CEO" ? {} : { projectId: { in: user.projectIds ?? [] } }) }, orderBy: { dueDate: "asc" } }); return NextResponse.json(goals); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطا" }, { status: 401 }); } }
export async function POST(request: Request) { try { const user = await requireUser(request); if (user.role === "MEMBER") return NextResponse.json({ error: "اجازه ندارید" }, { status: 403 }); const input = await request.json(); if (user.role !== "CEO" && !user.projectIds?.includes(input.projectId)) return NextResponse.json({ error: "اجازه ندارید" }, { status: 403 }); return NextResponse.json(await prisma.goal.create({ data: { ...input, ownerId: user.userId } }), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطا" }, { status: 400 }); } }
