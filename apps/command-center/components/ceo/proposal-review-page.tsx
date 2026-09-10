"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";

type Proposal = { id: string; title?: string; summary?: string; status?: string; project?: { name?: string }; team?: { name?: string } };
const statusLabels: Record<string, string> = { PROPOSED: "در انتظار تأیید", ACCEPTED: "پذیرفته‌شده", REJECTED: "ردشده" };

export function ProposalReviewPage() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [error, setError] = useState("");

  async function loadItems() {
    const response = await fetch("/api/ceo/proposals");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "دریافت پیشنهادها ناموفق بود.");
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => { void loadItems().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "دریافت پیشنهادها ناموفق بود.")); }, []);

  async function decide(proposalId: string, decision: "approve" | "reject") {
    setError("");
    const response = await fetch(`/api/ceo/proposals/${proposalId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, reason: decision === "reject" ? "رد توسط مدیرعامل" : undefined }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "ثبت تصمیم ناموفق بود.");
    await loadItems();
  }

  return <main className="min-h-screen bg-slate-50 p-6 text-slate-900 sm:p-10" dir="rtl"><div className="mx-auto max-w-5xl space-y-8"><div><p className="text-sm font-semibold text-cyan-600">مقر فرماندهی / اتاق مدیرعامل</p><h1 className="mt-2 text-3xl font-black">پیشنهادهای در انتظار تأیید</h1><p className="mt-2 text-sm leading-7 text-slate-500">Hermes پیشنهاد می‌دهد؛ تأیید این صفحه تنها نقطه‌ای است که task واقعی را در پروژه ایجاد می‌کند.</p></div>{error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}<div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><h2 className="font-bold">{item.title ?? "پیشنهاد بدون عنوان"}</h2><Badge tone={item.status === "PROPOSED" ? "warning" : "info"}>{statusLabels[item.status ?? ""] ?? item.status}</Badge></div><p className="mt-2 text-sm leading-7 text-slate-500">{item.summary ?? "بدون توضیح"}</p>{item.status === "PROPOSED" && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><span className="ml-auto text-xs text-slate-500">{item.project?.name ?? "پروژه"}{item.team?.name ? ` · ${item.team.name}` : ""}</span><button type="button" onClick={() => void decide(item.id, "reject").catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "رد پیشنهاد ناموفق بود."))} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-50">رد پیشنهاد</button><button type="button" onClick={() => void decide(item.id, "approve").catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "تأیید پیشنهاد ناموفق بود."))} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800">تأیید و ساخت task</button></div>}</article>)}{items.length === 0 && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">در حال حاضر پیشنهاد در انتظاری وجود ندارد.</p>}</div><p className="text-xs leading-6 text-slate-500">پس از تأیید، task با چهار phase محصول، طراحی، توسعه و تحویل در <Link href="/command-center" className="font-bold text-cyan-700 underline">اتاق فرمان</Link> ساخته می‌شود.</p></div></main>;
}
