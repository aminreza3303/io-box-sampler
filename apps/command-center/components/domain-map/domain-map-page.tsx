"use client";

import { useMemo, useState } from "react";
import {
  domainGroups,
  domainRelationships,
  getDomainById,
  getDomainConnections,
  roadmapSteps,
  type DomainGroupId,
  type DomainPriority,
} from "../../lib/domain-map";
import { Badge } from "../ui/badge";

const groupClasses: Record<DomainGroupId, { border: string; badge: "info" | "danger" | "warning" | "success" }> = {
  infra: { border: "border-cyan-200 bg-cyan-50/60", badge: "info" },
  core: { border: "border-rose-200 bg-rose-50/60", badge: "danger" },
  finance: { border: "border-orange-200 bg-orange-50/60", badge: "warning" },
  ecosystem: { border: "border-amber-200 bg-amber-50/60", badge: "warning" },
  platform: { border: "border-emerald-200 bg-emerald-50/60", badge: "success" },
};

const priorityClasses: Record<DomainPriority, string> = {
  P0: "bg-rose-100 text-rose-700",
  P1: "bg-orange-100 text-orange-700",
  P2: "bg-amber-100 text-amber-700",
  عرضی: "bg-emerald-100 text-emerald-700",
};

function ConnectionList({ title, ids, empty }: { title: string; ids: string[]; empty: string }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      {ids.length > 0 ? <div className="space-y-2">{ids.map((id) => { const domain = getDomainById(id); return domain ? <div key={id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-bold">{domain.title}</p><p className="mt-1 text-xs leading-6 text-slate-500">{domain.summary}</p></div> : null; })}</div> : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{empty}</p>}
    </section>
  );
}

export function DomainMapPage() {
  const [selectedId, setSelectedId] = useState("currency");
  const selected = getDomainById(selectedId) ?? getDomainById("currency");
  const selectedConnections = selected ? getDomainConnections(selected.id) : { dependencies: [], dependents: [] };
  const connectedIds = useMemo(() => new Set([...selectedConnections.dependencies.map((item) => item.from), ...selectedConnections.dependents.map((item) => item.to)]), [selectedConnections]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" dir="rtl">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-cyan-300">مقر فرماندهی / دانش محصول نیوکاش</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">نقشهٔ دامنه و ارتباطات</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">۲۸ دامنهٔ فارسی، قواعد کلیدی، وابستگی‌های فنی و نقشهٔ راه بازسازی. یک دامنه را انتخاب کنید تا ارتباط‌هایش در نقشه روشن و در پنل کناری توضیح داده شود.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="info">۲۸ دامنه</Badge>
              <Badge tone="warning">۵ گام راهبردی</Badge>
              <Badge tone="success">لوکال و آفلاین</Badge>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex-1 text-sm text-slate-300"><span className="font-bold text-white">لایهٔ Obsidian:</span> نسخهٔ Canvas و Markdown همین نقشه در repository نگه‌داری می‌شود.</div>
            <a href="obsidian://open?vault=newcash&file=newcash-map.canvas" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200">باز کردن در Obsidian</a>
            <code className="rounded-lg bg-black/30 px-3 py-2 text-xs text-slate-300">docs/obsidian/newcash-vault/newcash-map.canvas</code>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-black">نقشهٔ تعاملی دامنه‌ها</h2><p className="mt-1 text-sm text-slate-500">گره انتخاب‌شده تیره می‌شود و تمام همسایه‌های مستقیم آن با حلقهٔ رنگی مشخص می‌شوند.</p></div>
                <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-700">زیرساخت</span><span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">P0</span><span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">P1</span><span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">P2</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">پلتفرم</span></div>
              </div>
            </div>
            {domainGroups.map((group) => {
              const styles = groupClasses[group.id];
              return <section key={group.id} className={`rounded-2xl border p-5 ${styles.border}`}><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-black">{group.title}</h2><p className="mt-1 text-xs text-slate-600">{group.subtitle}</p></div><Badge tone={styles.badge}>{group.domains.length} دامنه</Badge></div><div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{group.domains.map((domain) => { const selectedCard = domain.id === selectedId; const connected = connectedIds.has(domain.id); const connectionCount = domainRelationships.filter((item) => item.from === domain.id || item.to === domain.id).length; return <button key={domain.id} type="button" onClick={() => setSelectedId(domain.id)} aria-pressed={selectedCard} className={`rounded-2xl border bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedCard ? "border-slate-950 bg-slate-950 text-white ring-4 ring-slate-950/10" : connected ? "border-cyan-500 ring-2 ring-cyan-300" : "border-white/80 text-slate-900"}`}><div className="flex items-start justify-between gap-3"><span className="text-base font-black">{domain.title}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${selectedCard ? "bg-white/15 text-cyan-200" : priorityClasses[domain.priority]}`}>{domain.priority}</span></div><p className={`mt-2 text-xs leading-6 ${selectedCard ? "text-slate-300" : "text-slate-500"}`}>{domain.summary}</p><div className={`mt-3 flex items-center justify-between text-[11px] ${selectedCard ? "text-slate-400" : "text-slate-400"}`}><span>{domain.status === "OPEN_DECISION" ? "تصمیم باز" : "تأییدشده"}</span><span>{connectionCount} ارتباط مستقیم</span></div></button>; })}</div></section>;
            })}
          </section>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            {selected && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-cyan-600">دامنهٔ انتخاب‌شده</p><h2 className="mt-1 text-2xl font-black">{selected.title}</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${priorityClasses[selected.priority]}`}>{selected.priority}</span></div><p className="mt-4 text-sm leading-7 text-slate-600">{selected.summary}</p><div className="mt-4 rounded-xl bg-slate-950 p-4 text-sm leading-7 text-slate-300"><p className="font-black text-white">قواعد محصول</p><ul className="mt-2 list-disc space-y-1 pr-5">{selected.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div><div className="mt-5 space-y-5"><ConnectionList title="این دامنه به چه چیزهایی وابسته است؟" ids={selectedConnections.dependencies.map((item) => item.from)} empty="این دامنه وابستگی مستقیم ثبت‌شده ندارد." /><ConnectionList title="چه چیزهایی به این دامنه وابسته‌اند؟" ids={selectedConnections.dependents.map((item) => item.to)} empty="هنوز مصرف‌کنندهٔ مستقیمی ثبت نشده است." /></div></section>}
            {selectedConnections.dependencies.length + selectedConnections.dependents.length > 0 && <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><h2 className="font-black text-cyan-950">توضیح ارتباط‌ها</h2><div className="mt-3 space-y-3">{[...selectedConnections.dependencies.map((item) => ({ ...item, direction: "ورودی" })), ...selectedConnections.dependents.map((item) => ({ ...item, direction: "خروجی" }))].map((item) => <div key={`${item.from}-${item.to}`} className="rounded-xl border border-cyan-100 bg-white p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-cyan-700">{item.direction}</span><span className="text-xs text-slate-500">{item.label}</span></div><p className="mt-2 text-xs leading-6 text-slate-600">{item.explanation}</p></div>)}</div></section>}
          </aside>
        </div>

        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-violet-700">از تصمیم تا اجرا</p><h2 className="mt-1 text-2xl font-black text-violet-950">نقشهٔ راه پنج‌گامی</h2></div><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">ترتیب پیشنهادی مالک محصول</span></div><div className="mt-5 grid gap-3 lg:grid-cols-5">{roadmapSteps.map((step, index) => <article key={step.id} className="relative rounded-2xl border border-violet-100 bg-white p-4"><div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-700 text-sm font-black text-white">{index}</span><span className="text-xs font-bold text-violet-600">{step.duration}</span></div><h3 className="mt-4 font-black">{step.title}</h3><p className="mt-2 text-xs leading-6 text-slate-600">{step.summary}</p><p className="mt-3 border-t border-violet-100 pt-3 text-xs font-bold leading-6 text-violet-800">شرط خروج: {step.exitCriteria}</p></article>)}</div></section>
      </div>
    </main>
  );
}
