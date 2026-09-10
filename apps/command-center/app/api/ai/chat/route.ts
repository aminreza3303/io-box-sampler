import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "../../../../lib/auth";
import { getProcessById } from "../../../../lib/workspaces";
import { prisma } from "../../../../lib/db";
import { dispatchToMother } from "../../../../server/agents/orchestrator";
import { recordAuditEvent } from "../../../../server/domain/audit-service";
import { loadAgentPrompt } from "../../../../server/agents/prompt-service";
import { getOrCreateAgentSession } from "../../../../server/agents/session-service";
import { parseAgentProposal, parseAgentProposalValue } from "../../../../server/agents/proposal-parser";
import { createTaskSchema, type DomainActor } from "../../../../lib/validators";

const MAX_MESSAGE_LENGTH = 8_000;
const MAX_CONTEXT_LENGTH = 8_000;

function statusForResult(kind: string) {
  if (kind === "blocked") return "BLOCKED" as const;
  if (kind === "error") return "FAILED" as const;
  return "SUCCEEDED" as const;
}

export async function POST(request: Request) {
  let runId: string | undefined;
  let sessionId: string | undefined;
  try {
    const user = await requireUser(request);
    const body = await request.json() as { message?: unknown; context?: unknown; processId?: unknown; domainId?: unknown; scenarioContext?: unknown; projectId?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim().slice(0, MAX_CONTEXT_LENGTH) : "";
    const processId = typeof body.processId === "string" ? body.processId : undefined;
    const domainId = typeof body.domainId === "string" ? body.domainId : undefined;
    const projectId = typeof body.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : undefined;
    const scenarioContext = body.scenarioContext && typeof body.scenarioContext === "object" ? JSON.stringify(body.scenarioContext).slice(0, 12_000) : "";
    if (!message) return NextResponse.json({ error: "پیام دستیار الزامی است." }, { status: 400 });
    if (message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: "پیام بیش از حد طولانی است." }, { status: 400 });

    const selectedProcess = getProcessById(processId);
    const sessionContext = projectId ? await getOrCreateAgentSession({ userId: user.userId, role: user.role, projectIds: user.projectIds, teamIds: user.teamIds }, projectId) : null;
    sessionId = sessionContext?.session.id;
    if (sessionContext?.created) await recordAuditEvent({ actorId: user.userId, projectId: sessionContext.project.id, action: "AI_SESSION_CREATED", targetType: "AgentSession", targetId: sessionContext.session.id, metadata: { runtime: "hermes", workspaceKey: sessionContext.workspace.key } }).catch(() => undefined);
    const contextPayload = { text: context || undefined, processId, domainId, processTitle: selectedProcess?.title, projectId: sessionContext?.project.id, projectName: sessionContext?.project.name, workspaceKey: sessionContext?.workspace.key };
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
      sessionContext ? `پروژهٔ فعال: ${sessionContext.project.name} (${sessionContext.project.code}). workspace کلید ${sessionContext.workspace.key} است. در این اجرا فقط پیشنهاد بساز؛ task مستقیم نساز.` : "این چت به پروژه‌ای وصل نیست و one-shot است.",
      sessionContext ? "اگر مدیر درخواست ساخت کار داد، دقیقاً یک بلوک <COMMAND_CENTER_PROPOSAL>{...}</COMMAND_CENTER_PROPOSAL> تولید کن. JSON باید شامل title، summary، scope=PROJECT، projectId پروژهٔ فعال، teamId معتبر و task با title، description و priority باشد. بیرون این بلوک توضیح انسانی بده.": "بدون پروژه بلوک proposal نساز.",
      selectedProcess ? `زمینه فرایند انتخاب‌شده: ${selectedProcess.title} — ${selectedProcess.summary}. کنترل‌های اجباری: ${selectedProcess.controls.join("، ")}.` : "زمینه فرایند انتخاب نشده است.",
      context ? `یادداشت زمینه‌ای مدیر: ${context}` : "",
      scenarioContext ? `خلاصهٔ ساختاریافتهٔ سناریو برای تحلیل: ${scenarioContext}` : "",
      `پیام مدیر: ${message}`,
    ].filter(Boolean).join("\n\n");

    const run = await prisma.agentRun.create({
      data: {
        actorId: user.userId,
        ...(sessionId ? { agentSessionId: sessionId } : {}),
        runtime: "hermes",
        prompt: message,
        context: { ...contextPayload, scenarioContext: scenarioContext || undefined } as Prisma.InputJsonValue,
        messages: { create: { role: "USER", content: message } },
      },
    });
    runId = run.id;
    await prisma.agentRun.update({ where: { id: run.id }, data: { status: "RUNNING" } });

    if (sessionContext) await prisma.agentSession.update({ where: { id: sessionContext.session.id }, data: { status: "RUNNING", lastRunAt: new Date() } });
    let result;
    try {
      result = await dispatchToMother(prompt, sessionContext?.workspace.path ?? process.cwd(), undefined, { sessionName: sessionContext?.session.sessionName });
    } catch {
      result = { kind: "error" as const, runId: run.id, output: "", error: "اجرای Hermes با خطای غیرمنتظره متوقف شد." };
    }
    const status = statusForResult(result.kind);
    const safeOutput = typeof result.output === "string" ? result.output.slice(0, 20_000) : "";
    const safeError = typeof result.error === "string" ? result.error.slice(0, 2_000) : undefined;
    await prisma.agentRun.update({ where: { id: run.id }, data: { status, resultKind: result.kind, output: safeOutput || null, error: safeError, completedAt: new Date(), messages: { create: { role: "ASSISTANT", content: safeOutput || safeError || "نتیجه‌ای از runtime دریافت نشد." } } } });
    if (sessionContext) await prisma.agentSession.update({ where: { id: sessionContext.session.id }, data: { status: "ACTIVE", ...(result.sessionId ? { externalSessionId: result.sessionId } : {}) } });
    let proposal: unknown = null;
    let proposalError: string | undefined;
    const parsedProposal = result.kind === "result" || result.kind === "proposal" ? parseAgentProposal(safeOutput) ?? parseAgentProposalValue(result.data) : null;
    if (parsedProposal && sessionContext) {
      const actor: DomainActor = { userId: user.userId, role: user.role, projectIds: user.projectIds, teamIds: user.teamIds };
      if (parsedProposal.projectId !== sessionContext.project.id) proposalError = "proposal به پروژهٔ انتخاب‌شده تعلق ندارد و ذخیره نشد.";
      else if (user.role !== "CEO" && !user.projectIds.includes(parsedProposal.projectId)) proposalError = "proposal خارج از دسترسی شماست و ذخیره نشد.";
      else if (user.role !== "CEO" && !user.teamIds.includes(parsedProposal.teamId)) proposalError = "تیم proposal خارج از دسترسی شماست و ذخیره نشد.";
      else {
        const team = await prisma.team.findFirst({ where: { id: parsedProposal.teamId, projectId: parsedProposal.projectId, archivedAt: null, project: { archivedAt: null } }, select: { id: true } });
        if (!team) proposalError = "تیم proposal به پروژهٔ فعال تعلق ندارد و ذخیره نشد.";
        else {
          const taskInput = createTaskSchema.parse({ ...parsedProposal.task, projectId: parsedProposal.projectId, teamId: parsedProposal.teamId, dependencyTaskIds: [] });
          if (taskInput.assigneeId && !await prisma.teamMember.findFirst({ where: { teamId: taskInput.teamId, userId: taskInput.assigneeId, archivedAt: null, user: { archivedAt: null } }, select: { id: true } })) proposalError = "مسئول proposal عضو فعال تیم نیست و proposal ذخیره نشد.";
          else {
            const { createProposalFromAgent } = await import("../../../../server/domain/proposal-service");
            proposal = await createProposalFromAgent({ title: parsedProposal.title, summary: parsedProposal.summary, scope: "PROJECT", projectId: parsedProposal.projectId, teamId: parsedProposal.teamId, createdById: actor.userId, payload: { action: "CREATE_TASK", task: taskInput } });
            await recordAuditEvent({ actorId: user.userId, projectId: parsedProposal.projectId, teamId: parsedProposal.teamId, action: "AGENT_PROPOSAL_CREATED", targetType: "PlanProposal", targetId: (proposal as { id: string }).id, metadata: { sessionId: sessionContext.session.id } }).catch(() => undefined);
          }
        }
      }
    } else if (parsedProposal && !sessionContext) {
      proposalError = "برای ساخت proposal ابتدا یک پروژه را به Hermes وصل کنید.";
    }
    await recordAuditEvent({ actorId: user.userId, action: "AI_CHAT_COMPLETED", targetType: "AgentRun", targetId: run.id, metadata: { resultKind: result.kind, status, processId, domainId, projectId, sessionId } }).catch(() => undefined);

    const payload = { runId: run.id, kind: result.kind, output: safeOutput, error: safeError, proposal, proposalError, session: sessionContext ? { id: sessionContext.session.id, sessionName: sessionContext.session.sessionName, status: "ACTIVE", workspaceKey: sessionContext.workspace.key, project: sessionContext.project } : null };
    if (result.kind === "blocked") return NextResponse.json(payload, { status: 503 });
    if (result.kind === "error") return NextResponse.json(payload, { status: 502 });
    return NextResponse.json(payload);
  } catch (error) {
    if (runId) await prisma.agentRun.update({ where: { id: runId }, data: { status: "FAILED", error: "درخواست دستیار کامل نشد.", completedAt: new Date() } }).catch(() => undefined);
    const message = error instanceof Error ? error.message : "درخواست دستیار کامل نشد.";
    const unauthorized = /Unauthorized|Invalid or expired session/.test(message);
    const blocked = /workspace|executable|Hermes|hermes/i.test(message);
    return NextResponse.json({ error: unauthorized ? "نشست شما معتبر نیست." : message }, { status: unauthorized ? 401 : blocked ? 503 : 400 });
  }
}
