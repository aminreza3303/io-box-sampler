import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "../../../../lib/auth";
import { getProcessById } from "../../../../lib/workspaces";
import { prisma } from "../../../../lib/db";
import { dispatchToMother } from "../../../../server/agents/orchestrator";
import { recordAuditEvent } from "../../../../server/domain/audit-service";
import { loadAgentPrompt } from "../../../../server/agents/prompt-service";

const MAX_MESSAGE_LENGTH = 8_000;
const MAX_CONTEXT_LENGTH = 8_000;

function statusForResult(kind: string) {
  if (kind === "blocked") return "BLOCKED" as const;
  if (kind === "error") return "FAILED" as const;
  return "SUCCEEDED" as const;
}

export async function POST(request: Request) {
  let runId: string | undefined;
  try {
    const user = await requireUser(request);
    const body = await request.json() as { message?: unknown; context?: unknown; processId?: unknown; domainId?: unknown; scenarioContext?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim().slice(0, MAX_CONTEXT_LENGTH) : "";
    const processId = typeof body.processId === "string" ? body.processId : undefined;
    const domainId = typeof body.domainId === "string" ? body.domainId : undefined;
    const scenarioContext = body.scenarioContext && typeof body.scenarioContext === "object" ? JSON.stringify(body.scenarioContext).slice(0, 12_000) : "";
    if (!message) return NextResponse.json({ error: "پیام دستیار الزامی است." }, { status: 400 });
    if (message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: "پیام بیش از حد طولانی است." }, { status: 400 });

    const selectedProcess = getProcessById(processId);
    const contextPayload = { text: context || undefined, processId, domainId, processTitle: selectedProcess?.title };
    const [hermesInstructions, analystInstructions, builderInstructions, reviewerInstructions] = await Promise.all([
      loadAgentPrompt("hermes", process.cwd()),
      loadAgentPrompt("analyst", process.cwd()),
      loadAgentPrompt("builder", process.cwd()),
      loadAgentPrompt("reviewer", process.cwd()),
    ]);
    const prompt = [
      hermesInstructions,
      `قرارداد زیرعامل‌های OMP:\nتحلیلگر محصول: ${analystInstructions}\nسازنده: ${builderInstructions}\nبازبین: ${reviewerInstructions}`,
      "هدف: کمک به مدیر برای برنامه‌ریزی، روشن‌کردن وابستگی‌ها و ساخت پیشنهاد اجرایی برای سه پروژه نیوکاش، شاطی و تراز.",
      "قواعد: هیچ کاری را انجام‌شده اعلام نکن مگر runtime نتیجه موفق واقعی برگرداند. اگر runtime یا داده کافی نداری، شفاف بگو مسدود هستی.",
      "قواعد مالی: فقط تحلیل، شبیه‌سازی و پیشنهاد بده؛ تغییر موجودی، پرداخت، معامله، تسویه یا سیاست مالی را اجرا نکن. اقدام حساس باید پیشنهاد و سپس تأیید مدیرعامل باشد.",
      "قواعد اجرا: در صورت نیاز کار را به تحلیلگر محصول، سازنده یا بازبین OMP واگذار کن و خروجی را با مالک، موعد، ریسک و معیار پذیرش برگردان.",
      selectedProcess ? `زمینه فرایند انتخاب‌شده: ${selectedProcess.title} — ${selectedProcess.summary}. کنترل‌های اجباری: ${selectedProcess.controls.join("، ")}.` : "زمینه فرایند انتخاب نشده است.",
      context ? `یادداشت زمینه‌ای مدیر: ${context}` : "",
      scenarioContext ? `خلاصهٔ ساختاریافتهٔ سناریو برای تحلیل: ${scenarioContext}` : "",
      `پیام مدیر: ${message}`,
    ].filter(Boolean).join("\n\n");

    const run = await prisma.agentRun.create({
      data: {
        actorId: user.userId,
        runtime: "hermes",
        prompt: message,
        context: { ...contextPayload, scenarioContext: scenarioContext || undefined } as Prisma.InputJsonValue,
        messages: { create: { role: "USER", content: message } },
      },
    });
    runId = run.id;
    await prisma.agentRun.update({ where: { id: run.id }, data: { status: "RUNNING" } });

    let result;
    try {
      result = await dispatchToMother(prompt, process.cwd());
    } catch {
      result = { kind: "error" as const, runId: run.id, output: "", error: "اجرای Hermes با خطای غیرمنتظره متوقف شد." };
    }
    const status = statusForResult(result.kind);
    const safeOutput = typeof result.output === "string" ? result.output.slice(0, 20_000) : "";
    const safeError = typeof result.error === "string" ? result.error.slice(0, 2_000) : undefined;
    await prisma.agentRun.update({ where: { id: run.id }, data: { status, resultKind: result.kind, output: safeOutput || null, error: safeError, completedAt: new Date(), messages: { create: { role: "ASSISTANT", content: safeOutput || safeError || "نتیجه‌ای از runtime دریافت نشد." } } } });
    await recordAuditEvent({ actorId: user.userId, action: "AI_CHAT_COMPLETED", targetType: "AgentRun", targetId: run.id, metadata: { resultKind: result.kind, status, processId, domainId } }).catch(() => undefined);

    const payload = { runId: run.id, kind: result.kind, output: safeOutput, error: safeError, proposal: result.data ?? null };
    if (result.kind === "blocked") return NextResponse.json(payload, { status: 503 });
    if (result.kind === "error") return NextResponse.json(payload, { status: 502 });
    return NextResponse.json(payload);
  } catch (error) {
    if (runId) await prisma.agentRun.update({ where: { id: runId }, data: { status: "FAILED", error: "درخواست دستیار کامل نشد.", completedAt: new Date() } }).catch(() => undefined);
    const message = error instanceof Error ? error.message : "درخواست دستیار کامل نشد.";
    return NextResponse.json({ error: /Unauthorized|Invalid or expired session/.test(message) ? "نشست شما معتبر نیست." : message }, { status: /Unauthorized|Invalid or expired session/.test(message) ? 401 : 400 });
  }
}
