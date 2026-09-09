"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getProcessById } from "../../lib/workspaces";
import { Badge } from "../ui/badge";

type AgentMessage = { id: string; role: "USER" | "ASSISTANT" | "SYSTEM"; content: string; createdAt: string };
type AgentRun = { id: string; runtime: string; prompt: string; status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "BLOCKED" | "FAILED"; resultKind?: string | null; output?: string | null; error?: string | null; context?: { processTitle?: string } | null; createdAt: string; completedAt?: string | null; actor?: { displayName: string }; messages: AgentMessage[] };

const statusLabels = { QUEUED: "در صف", RUNNING: "در حال اجرا", SUCCEEDED: "موفق", BLOCKED: "مسدود", FAILED: "ناموفق" } as const;

export function AiWorkspacePage() {
  const params = useSearchParams();
  const processId = params.get("context");
  const process = getProcessById(processId);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRuns() {
    const response = await fetch("/api/ai/runs");
    if (!response.ok) throw new Error("دریافت حافظه اجرای دستیار ناموفق بود.");
    setRuns(await response.json());
  }

  useEffect(() => { void loadRuns().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "دریافت اجراها ناموفق بود.")); }, []);

  const selectedRun = runs[0];
  const latestMessages = useMemo(() => selectedRun?.messages ?? [], [selectedRun]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: trimmed, context, processId }) });
      const payload = await response.json() as { runId?: string; kind?: string; output?: string; error?: string };
      if (!response.ok && response.status !== 503 && response.status !== 502) throw new Error(payload.error ?? "درخواست دستیار ناموفق بود.");
      setMessage("");
      await loadRuns();
      if (payload.kind === "blocked") setError(payload.error ?? "Hermes برای این محیط فعال نیست.");
      if (payload.kind === "error") setError(payload.error ?? "اجرای دستیار ناموفق بود.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "درخواست دستیار ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" dir="rtl">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold text-cyan-300">مقر فرماندهی / هوش اجرایی</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">دستیار Hermes</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Hermes مادر درخواست را می‌فهمد، آن را به زیرعامل‌های OMP می‌سپارد و نتیجه را به‌صورت پیشنهاد قابل بررسی برمی‌گرداند.</p></div><div className="flex flex-wrap gap-2"><Badge tone="info">حافظه اجرا فعال</Badge><Badge tone="warning">تأیید انسانی برای اقدام حساس</Badge></div></div></header>
        {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">{error}</div>}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">گفت‌وگوی اجرایی</h2><p className="mt-1 text-sm text-slate-500">درخواست، پاسخ، مسدودی و پیشنهادها در دیتابیس محلی ذخیره می‌شوند.</p></div>{selectedRun && <Badge tone={selectedRun.status === "SUCCEEDED" ? "success" : selectedRun.status === "BLOCKED" ? "warning" : "neutral"}>{statusLabels[selectedRun.status]}</Badge>}</div></div>
            <div className="min-h-[320px] space-y-4 p-5">{latestMessages.length ? latestMessages.map((item) => <div key={item.id} className={`max-w-[90%] rounded-2xl p-4 text-sm leading-7 ${item.role === "USER" ? "mr-auto bg-slate-950 text-white" : "ml-auto border border-cyan-100 bg-cyan-50 text-slate-800"}`}><div className="mb-1 text-[11px] font-bold opacity-60">{item.role === "USER" ? "شما" : "Hermes"}</div><p className="whitespace-pre-wrap">{item.content}</p></div>) : <div className="grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><div><p className="text-lg font-black">هنوز گفت‌وگویی ثبت نشده است.</p><p className="mt-2 text-sm text-slate-500">یک مسئله، تصمیم یا وضعیت را بنویسید تا Hermes آن را به برنامه و اقدام بعدی تبدیل کند.</p></div></div>}</div>
            <form onSubmit={submit} className="border-t border-slate-100 p-5"><label className="block text-sm font-bold" htmlFor="ai-message">درخواست جدید</label><textarea id="ai-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="مثلاً: با توجه به ریسک انتقال وجه، برنامه این هفته را بازتنظیم کن…" rows={4} maxLength={8000} className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:ring-2" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-400">{message.length}/۸۰۰۰</span><button type="submit" disabled={loading || !message.trim()} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "در حال بررسی…" : "ارسال به Hermes"}</button></div></form>
          </section>
          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5"><div className="flex items-center justify-between"><h2 className="font-black text-cyan-950">زمینه تصمیم</h2><span className="text-xs font-bold text-cyan-700">اختیاری</span></div>{process ? <><p className="mt-3 text-sm font-bold text-cyan-950">{process.title}</p><p className="mt-2 text-xs leading-6 text-cyan-900">{process.summary}</p><Link href={`/${process.kind}`} className="mt-4 inline-block text-xs font-black text-cyan-800 hover:underline">بازگشت به فرایند ←</Link></> : <p className="mt-3 text-sm leading-7 text-cyan-900">می‌توانید این صفحه را از هر فرایند باز کنید تا زمینه همان فرایند خودکار همراه درخواست ارسال شود.</p>}<label className="mt-4 block text-xs font-bold text-cyan-900" htmlFor="ai-context">یادداشت تکمیلی<textarea id="ai-context" value={context} onChange={(event) => setContext(event.target.value)} maxLength={8000} rows={4} placeholder="هدف، محدودیت، موعد یا داده‌ای که مدیر می‌خواهد لحاظ شود…" className="mt-2 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-300" /></label></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">حافظه اجرای اخیر</h2><div className="mt-4 space-y-3">{runs.length ? runs.slice(0, 6).map((run) => <button key={run.id} type="button" onClick={() => undefined} className="w-full rounded-xl bg-slate-50 p-3 text-right transition hover:bg-slate-100"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{run.context?.processTitle ?? "درخواست عمومی"}</span><span className={`text-[11px] font-bold ${run.status === "SUCCEEDED" ? "text-emerald-600" : run.status === "BLOCKED" ? "text-amber-600" : "text-slate-500"}`}>{statusLabels[run.status]}</span></div><p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">{run.prompt}</p></button>) : <p className="text-sm text-slate-500">اجرای ذخیره‌شده‌ای وجود ندارد.</p>}</div></section>
            <section className="rounded-2xl border border-violet-100 bg-violet-50 p-5 text-sm leading-7 text-violet-950"><p className="font-black">قرارداد ایمنی</p><p className="mt-2">Hermes می‌تواند تحلیل و پیشنهاد تولید کند؛ اعمال پیشنهاد، تغییر سیاست و هر اقدام مالی باید در مسیر تأیید ثبت‌شده انجام شود.</p></section>
          </aside>
        </div>
      </div>
    </main>
  );
}
