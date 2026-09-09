"use client";

import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";

type Metrics = { overdueCount: number; phaseCompletion: number; riskTotals: { total: number; urgent: number; blocked: number } };
type Health = { runtimes: Record<string, { available: boolean; detail: string }> };

const accessRows = [
  ["مدیرعامل", "همه پروژه‌ها", "تأیید پیشنهاد، حافظه سازمانی، سیاست‌ها"],
  ["مدیر", "پروژه و تیم مجاز", "مدیریت تسک، تیم و گزارش اجرایی"],
  ["عضو", "تیم‌های عضو", "مشاهده و به‌روزرسانی کارهای واگذارشده"],
];

const policyRows = [
  ["پیشنهاد مالی", "فقط پیشنهاد", "تأیید مدیرعامل"],
  ["تغییر دسترسی", "ثبت نسخه و دلیل", "بازبینی ادمین ارشد"],
  ["اجرای عامل", "Hermes → OMP", "ذخیره پیام و نتیجه"],
  ["تغییر وضعیت کار", "ردپای رویداد", "مالک فرایند"],
];

export function AdminWorkspacePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview").then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "دریافت کنترل‌های ادمین ناموفق بود.");
      setMetrics(payload.metrics);
      setHealth(payload.health);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "دریافت کنترل‌های ادمین ناموفق بود."));
  }, []);

  const runtimeEntries = health ? Object.entries(health.runtimes) : [];
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" dir="rtl">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><p className="text-sm font-semibold text-cyan-300">مقر فرماندهی / حاکمیت</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">کنترل‌های ادمین</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">دسترسی‌ها، سیاست‌های حساس، سلامت عامل‌ها و شاخص‌های اجرایی را از یک نمای امن و قابل ممیزی کنترل کنید.</p></header>
        {error && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["تکمیل فازها", metrics ? `${metrics.phaseCompletion}٪` : "—", "نسبت فازهای کامل‌شده"], ["کارهای عقب‌افتاده", metrics?.overdueCount ?? "—", "نیازمند تصمیم یا پیگیری"], ["ریسک‌های فعال", metrics?.riskTotals.total ?? "—", `${metrics?.riskTotals.urgent ?? "—"} فوری`], ["runtimeها", health ? `${runtimeEntries.filter(([, item]) => item.available).length}/${runtimeEntries.length}` : "—", "آماده برای اجرا"]].map(([title, value, detail]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{title}</p><p className="mt-2 text-3xl font-black">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></article>)}
        </section>
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">ماتریس دسترسی</h2><p className="mt-1 text-sm text-slate-500">سطح دسترسی باید با مسئولیت و دامنه کار هماهنگ باشد.</p></div><Badge tone="success">حداقل دسترسی</Badge></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[500px] text-right text-sm"><thead className="border-b border-slate-200 text-xs text-slate-400"><tr><th className="p-3">نقش</th><th className="p-3">دامنه</th><th className="p-3">قابلیت‌ها</th></tr></thead><tbody>{accessRows.map((row) => <tr key={row[0]} className="border-b border-slate-100 last:border-0"><td className="p-3 font-bold">{row[0]}</td><td className="p-3 text-slate-500">{row[1]}</td><td className="p-3 text-slate-500">{row[2]}</td></tr>)}</tbody></table></div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">سیاست‌های حساس</h2><p className="mt-1 text-sm text-slate-500">هر تغییر حساس باید صاحب، دلیل و مسیر تأیید داشته باشد.</p></div><Badge tone="warning">تأییدمحور</Badge></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[500px] text-right text-sm"><thead className="border-b border-slate-200 text-xs text-slate-400"><tr><th className="p-3">موضوع</th><th className="p-3">قانون پنل</th><th className="p-3">کنترل</th></tr></thead><tbody>{policyRows.map((row) => <tr key={row[0]} className="border-b border-slate-100 last:border-0"><td className="p-3 font-bold">{row[0]}</td><td className="p-3 text-slate-500">{row[1]}</td><td className="p-3 text-slate-500">{row[2]}</td></tr>)}</tbody></table></div></section>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">سلامت runtimeها</h2><p className="mt-1 text-sm text-slate-500">پنل فقط وضعیت واقعی محیط لوکال را نمایش می‌دهد.</p></div><Badge tone="info">زنده</Badge></div><div className="mt-5 grid gap-3 md:grid-cols-2">{runtimeEntries.length ? runtimeEntries.map(([name, runtime]) => <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><p className="font-bold">{name === "hermes" ? "Hermes مادر" : "OMP زیرعامل‌ها"}</p><p className="mt-1 text-xs text-slate-500">{runtime.detail}</p></div><Badge tone={runtime.available ? "success" : "warning"}>{runtime.available ? "آماده" : "فعال نشده"}</Badge></div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">در حال بررسی وضعیت runtimeها…</p>}</div></section>
      </div>
    </main>
  );
}
