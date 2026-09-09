import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { createTask } from "../../../server/domain/task-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const task = await createTask(await request.json(), { userId: user.userId, role: user.role, teamIds: user.teamIds });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطا در ساخت فعالیت" }, { status: 400 });
  }
}
