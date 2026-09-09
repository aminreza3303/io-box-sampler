"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getWorkspaceProcesses, type ProcessDefinition, type WorkspaceKind, workspaceGroups } from "../../lib/workspaces";
import { Badge } from "../ui/badge";

const statusLabels = { active: "در حال اجرا", review: "در بازبینی", planned: "برنامه‌ریزی‌شده" } as const;
const stepStatus = { ready: "آماده", control: "نیازمند کنترل", blocked: "مسدود", planned: "برنامه‌ریزی‌شده" } as const;

function toneForStatus(status: ProcessDefinition["status"]) {
  return status === "active" ? "success" : status === "review" ? "warning" : "neutral";
}

export function ProcessWorkspacePage({ kind }: { kind: WorkspaceKind }) {
  const group = workspaceGroups.find((item) => item.id === kind)!;
  const processes = getWorkspaceProcesses(kind);
  const [selectedId, setSelectedId] = useState(processes[0]?.id ?? "");
  const selected = useMemo(() => processes.find((process) => process.id === selectedId) ?? processes[0], [processes, selectedId]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" dir="rtl">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-cyan-300">مقر فرماندهی / کنترل فرایندها</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{group.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{group.subtitle} هر فرایند از ورودی تا خروجی، مالک، کنترل و وضعیت روشن دارد تا تصمیم بعدی از روی واقعیت گرفته شود.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs"><Badge tone="info">{processes.length} فرایند</Badge><Badge tone="success">قابل رهگیری</Badge>{kind === "finance" && <Badge tone="warning">بدون اجرای مالی</Badge>}</div>
          </div>
          {kind === "finance" && <div className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">این صفحه برای مشاهده، شبیه‌سازی و ساخت پیشنهاد است. هیچ موجودی، سفارش، پرداخت یا تسویه‌ای از این پنل تغییر نمی‌کند و اقدام مالی نیازمند تأیید صریح مدیرعامل یا مالک مجاز است.</div>}
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">فهرست فرایندها</h2><p className="mt-1 text-sm text-slate-500">برای دیدن مراحل و کنترل‌ها یک فرایند را انتخاب کنید.</p></div><span className="text-xs font-bold text-slate-400">{processes.length} مورد</span></div>
            <div className="space-y-3">
              {processes.map((process) => {
                const active = process.id === selected?.id;
                return <button key={process.id} type="button" onClick={() => setSelectedId(process.id)} aria-pressed={active} className={`w-full rounded-2xl border p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3"><h3 className="font-black">{process.title}</h3><Badge tone={active ? "info" : toneForStatus(process.status)}>{statusLabels[process.status]}</Badge></div>
                  <p className={`mt-2 text-sm leading-7 ${active ? "text-slate-300" : "text-slate-500"}`}>{process.summary}</p>
                  <div className={`mt-4 flex flex-wrap gap-2 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}><span>مالک: {process.owner}</span><span>•</span><span>{process.steps.length} گام</span>{process.readOnly && <><span>•</span><span>خواندنی</span></>}</div>
                </button>;
              })}
            </div>
          </section>

          {selected && <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold text-cyan-600">جزئیات فرایند</p><h2 className="mt-1 text-2xl font-black">{selected.title}</h2><p className="mt-2 text-sm text-slate-500">مالک: {selected.owner}</p></div><Badge tone={toneForStatus(selected.status)}>{statusLabels[selected.status]}</Badge></div>
              <p className="mt-5 text-sm leading-7 text-slate-600">{selected.summary}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">ورودی‌ها</p><ul className="mt-2 space-y-1 text-sm">{selected.inputs.map((item) => <li key={item}>• {item}</li>)}</ul></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">خروجی‌ها</p><ul className="mt-2 space-y-1 text-sm">{selected.outputs.map((item) => <li key={item}>• {item}</li>)}</ul></div></div>
              <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50 p-4"><p className="text-xs font-bold text-cyan-800">کنترل‌های اجباری</p><div className="mt-3 flex flex-wrap gap-2">{selected.controls.map((control) => <span key={control} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-900">{control}</span>)}</div></div>
              <Link href={`/ai?context=${encodeURIComponent(selected.id)}`} className="mt-5 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"><span>ادامه این فرایند با دستیار</span><span aria-hidden="true">←</span></Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-black">مراحل اجرا</h2><span className="text-xs text-slate-400">از ورودی تا خروجی</span></div><div className="mt-5 space-y-4">{selected.steps.map((step, index) => <article key={step.id} className="relative pr-10"><span className={`absolute right-0 top-0 grid h-7 w-7 place-items-center rounded-full text-xs font-black ${step.status === "blocked" ? "bg-rose-100 text-rose-700" : step.status === "control" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{index + 1}</span>{index < selected.steps.length - 1 && <span className="absolute right-3.5 top-8 h-[calc(100%+1rem)] w-px bg-slate-200" />}<div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{step.title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{stepStatus[step.status]}</span></div><p className="mt-1 text-sm leading-7 text-slate-500">{step.description}</p><p className="mt-1 text-xs font-semibold text-slate-400">مالک: {step.owner} · کنترل: {step.controls.join("، ")}</p></article>)}</div></section>
          </aside>}
        </div>
      </div>
    </main>
  );
}
