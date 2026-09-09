import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { dispatchToMother } from "../../../../server/agents/orchestrator";

export async function POST(request: Request) {
  try { const user = await requireUser(request); if (user.role === "MEMBER") return NextResponse.json({ error: "فقط مدیر یا مدیرعامل می‌تواند اجرای agent را آغاز کند" }, { status: 403 }); const body = await request.json() as { prompt?: string }; if (!body.prompt?.trim()) return NextResponse.json({ error: "prompt الزامی است" }, { status: 400 }); return NextResponse.json(await dispatchToMother(body.prompt), { status: 202 }); }
  catch (error) { const message = error instanceof Error ? error.message : "خطا"; return NextResponse.json({ error: message }, { status: /Unauthorized|Invalid or expired session/.test(message) ? 401 : 400 }); }
}
