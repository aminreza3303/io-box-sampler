"use client";

import React, { useState, type FormEvent } from "react";
import type { ScenarioEstimate, ScenarioGateDecision } from "../../lib/scenario-types";
import { unwrapScenarioAssumptions } from "../../lib/scenario-restore";
import { evaluateKpiActual } from "../../lib/scenario-kpi-display";

const numberFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const currencyLabels: Record<string, string> = { TOMAN: "تومان", USD: "دلار", IQD: "دینار" };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isVersionedEstimate(value: unknown): value is ScenarioEstimate {
  const item = record(value);
  return item?.modelVersion === "scenario-business-case/v1" && Array.isArray(item.cases);
}

function display(value: unknown, unit = ""): string {
  return typeof value === "number" && Number.isFinite(value) ? `${numberFormat.format(value)}${unit ? ` ${unit}` : ""}` : "نامشخص / نیازمند داده";
}

function items(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function evidenceLabel(evidence: Record<string, unknown>) {
  const labels: Record<string, string> = {
    "document-hypothesis": "فرضیهٔ سند", "internal-data": "دادهٔ داخلی", "owner-estimate": "برآورد مالک", approved: "مصوب", "model-default": "فرض اولیهٔ مدل",
  };
  return labels[String(evidence.kind)] ?? String(evidence.label ?? "منشأ نامشخص");
}

function evidenceSource(evidence: Record<string, unknown>): string {
  const source = record(evidence.source);
  if (source) return [source.document, source.locator].filter((value) => typeof value === "string").join(" · ") || "منبع سند ثبت نشده";
  return typeof evidence.source === "string" && evidence.source ? evidence.source : "منبع ثبت نشده";
}

function collectEvidence(assumptions: unknown): Array<{ field: string; evidence: Record<string, unknown> }> {
  const input = unwrapScenarioAssumptions(assumptions);
  if (!input) return [];
  const collected: Array<{ field: string; evidence: Record<string, unknown> }> = [];
  const push = (field: string, value: unknown) => { const evidence = record(value); if (evidence && typeof evidence.kind === "string") collected.push({ field, evidence }); };
  for (const entry of items(input.fieldEvidence)) {
    const item = record(entry); if (item) push(String(item.field ?? "فرض"), item.evidence);
  }
  for (const caseValue of items(input.cases)) {
    const scenarioCase = record(caseValue); if (!scenarioCase) continue;
    for (const entry of items(scenarioCase.fieldEvidence)) {
      const item = record(entry); if (item) push(`${String(scenarioCase.name ?? "حالت")}: ${String(item.field ?? "فرض")}`, item.evidence);
    }
    for (const driverValue of items(scenarioCase.benefitDrivers)) {
      const driver = record(driverValue); if (driver) push(`محرک منفعت: ${String(driver.name ?? "بدون نام")}`, driver.source);
    }
  }
  for (const entry of items(input.kpis)) { const item = record(entry); if (item) push(`KPI: ${String(item.name ?? "بدون نام")}`, item.source); }
  for (const entry of items(input.priorityCriteria)) { const item = record(entry); if (item) push(`معیار اولویت: ${String(item.label ?? "بدون نام")}`, item.source); }
  for (const entry of items(input.priorityWeights)) { const item = record(entry); if (item) push(`وزن معیار: ${String(item.criterionId ?? "بدون شناسه")}`, item.source); }
  return collected;
}

function LegacyEstimate({ estimate }: { estimate: unknown }) {
  const old = record(estimate);
  const knownLabels: Array<[string, string, string]> = [
    ["estimatedDays", "تلاش فنی ثبت‌شده", "نفر-روز"], ["personDays", "تلاش فنی ثبت‌شده", "نفر-روز"],
    ["durationWeeks", "زمان تقویمی ثبت‌شده", "هفته"], ["calendarWeeks", "زمان تقویمی ثبت‌شده", "هفته"],
    ["totalCost", "هزینهٔ ثبت‌شده", ""], ["roiPercent", "ROI ثبت‌شده", "٪"],
  ];
  const shown = knownLabels.filter(([key]) => old && key in old).map(([key, label, unit]) => ({ label, value: display(old?.[key], unit) }));
  return <section aria-label="نتیجهٔ تحلیل قدیمی" className="space-y-3 rounded-2xl border border-slate-300 bg-slate-100 p-5">
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">تحلیل قدیمی · فقط خواندنی</span><h2 className="text-xl font-black">{typeof old?.title === "string" ? old.title : "نتیجهٔ بدون نسخه"}</h2></div>
    <p className="text-sm leading-7 text-slate-700">این snapshot نسخهٔ محاسبهٔ جدید ندارد. اطلاعات موجود بدون ذخیره، تبدیل یا محاسبهٔ مجدد نمایش داده می‌شود؛ برای مقایسه و گفت‌وگو با Hermes یک تحلیل نسخه‌دار تازه لازم است.</p>
    {shown.length > 0 && <dl className="grid gap-2 sm:grid-cols-2">{shown.map((item) => <div key={item.label} className="rounded-lg bg-white p-3 text-sm"><dt className="text-slate-500">{item.label}</dt><dd className="mt-1 font-bold">{item.value}</dd></div>)}</dl>}
  </section>;
}

function VersionedEstimate({ estimate, assumptions, onDecisionChange }: { estimate: ScenarioEstimate; assumptions: unknown; onDecisionChange: (decision: ScenarioGateDecision) => void | Promise<void> }) {
  const [decision, setDecision] = useState<ScenarioGateDecision>({ decision: null, reason: "", evidence: "", owner: "", reviewDate: null });
  const [saving, setSaving] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const cases = estimate.cases as unknown[];
  const inputEvidence = collectEvidence(assumptions);
  const estimateRecord = record(estimate);
  const priority = record(estimate.priority);
  const sourceCase = record(cases[0]);
  const allDomains = new Map<string, { title: string; selected: boolean }>();
  for (const caseValue of cases) {
    const technical = record(record(caseValue)?.technical);
    for (const domainValue of items(technical?.impactedDomains)) {
      const domain = record(domainValue);
      if (domain && typeof domain.id === "string") allDomains.set(domain.id, { title: String(domain.title ?? domain.id), selected: domain.selected === true });
    }
  }

  async function saveDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision.decision) { setDecisionError("یک تصمیم انتخاب کنید."); return; }
    setSaving(true); setDecisionError("");
    try { await onDecisionChange(decision); }
    catch (error) { setDecisionError(error instanceof Error ? error.message : "ثبت تصمیم انجام نشد."); }
    finally { setSaving(false); }
  }

  return <section className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm" aria-label="نتیجهٔ طرح کسب‌وکار">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black text-emerald-800">snapshot نسخه‌دار و ذخیره‌شده</p><h2 className="mt-1 text-xl font-black text-emerald-950">{estimate.title}</h2><p className="mt-2 text-xs leading-6 text-emerald-900">مقادیر از snapshot سرور آمده‌اند؛ مقادیر ناموجود صفر فرض نمی‌شوند. این برآورد critical path یا task count را محاسبه نمی‌کند.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">{estimate.modelVersion}</span></header>

    <section className="rounded-xl border border-emerald-100 bg-white p-4"><h3 className="font-black">دامنه و حجم تغییر</h3>
      <div className="mt-3 flex flex-wrap gap-2">{[...allDomains.values()].map((domain, index) => <span key={`${domain.title}-${index}`} className={`rounded-full px-3 py-1 text-xs font-bold ${domain.selected ? "bg-cyan-100 text-cyan-900" : "bg-slate-100 text-slate-700"}`}>{domain.title}{domain.selected ? " · انتخاب‌شده" : " · متأثر"}</span>)}</div>
      {allDomains.size === 0 && <p className="mt-2 text-sm text-slate-500">دامنه‌های متأثر در snapshot ثبت نشده‌اند.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">{[
        ["دامنه‌ها", record(record(sourceCase?.technical)?.changeVolume)?.domainCount], ["روابط", record(record(sourceCase?.technical)?.changeVolume)?.relationshipCount],
        ["فرایندها", record(record(sourceCase?.technical)?.changeVolume)?.processCount], ["سطح API", record(record(sourceCase?.technical)?.changeVolume)?.apiSurfaceCount],
        ["یکپارچه‌سازی", record(record(sourceCase?.technical)?.changeVolume)?.integrationCount], ["تغییر داده", record(record(sourceCase?.technical)?.changeVolume)?.dataMigrationCount],
        ["سطح UI", record(record(sourceCase?.technical)?.changeVolume)?.uiSurfaceCount],
      ].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-2 text-xs"><span className="text-slate-500">{String(label)}</span><p className="mt-1 font-black">{display(value)}</p></div>)}</div>
    </section>

    <section className="overflow-x-auto rounded-xl border border-emerald-100 bg-white p-4"><h3 className="mb-3 font-black">مقایسهٔ سه حالت</h3><table className="w-full min-w-[720px] text-right text-xs"><thead><tr className="border-b text-slate-500"><th className="p-2">شاخص</th>{cases.map((value, index) => <th key={String(record(value)?.caseId ?? index)} className="p-2">{String(record(value)?.name ?? `حالت ${index + 1}`)}</th>)}</tr></thead><tbody>
      {([
        ["تلاش پایه", (item: Record<string, unknown>) => record(record(item.technical)?.metrics)?.basePersonDays, "نفر-روز"],
        ["تلاش تعدیل‌شده", (item: Record<string, unknown>) => record(record(item.technical)?.metrics)?.adjustedBasePersonDays, "نفر-روز"],
        ["ذخیرهٔ ریسک", (item: Record<string, unknown>) => record(record(item.technical)?.metrics)?.reservePersonDays, "نفر-روز"],
        ["کل تلاش", (item: Record<string, unknown>) => record(record(item.technical)?.metrics)?.personDays, "نفر-روز"],
        ["زمان تقویمی", (item: Record<string, unknown>) => record(record(item.technical)?.metrics)?.calendarWeeks, "هفته"],
        ["هزینهٔ اولیه", (item: Record<string, unknown>) => record(item.financial)?.initialInvestment, ""],
        ["هزینهٔ جاری ماهانه", (item: Record<string, unknown>) => record(item.financial)?.monthlyOperatingCost, ""],
        ["ارزش خالص", (item: Record<string, unknown>) => record(item.financial)?.netValue, ""],
        ["ROI", (item: Record<string, unknown>) => record(item.financial)?.roiPercent, "٪"],
        ["بازگشت سرمایه", (item: Record<string, unknown>) => record(item.financial)?.paybackMonths, "ماه"],
      ] as Array<[string, (item: Record<string, unknown>) => unknown, string]>).map(([label, valueOf, unit]) => <tr key={label} className="border-b last:border-0"><th className="p-2 font-semibold">{label}</th>{cases.map((value, index) => { const item = record(value) ?? {}; const currency = String(record(item.financial)?.currency ?? ""); return <td key={`${label}-${index}`} className="p-2">{display(valueOf(item), unit || (label.includes("هزینه") || label === "ارزش خالص" ? currencyLabels[currency] ?? "" : ""))}</td>; })}</tr>)}
    </tbody></table></section>

    <section className="grid gap-3 lg:grid-cols-3">{cases.map((value, index) => { const item = record(value) ?? {}; const technical = record(item.technical); const metrics = record(technical?.metrics); const volume = record(technical?.changeVolume); const inputs = record(item.inputs); const phases = items(technical?.phases); const drivers = items(inputs?.benefitDrivers); return <article key={String(item.caseId ?? index)} className="rounded-xl border border-emerald-100 bg-white p-4"><h3 className="font-black">{String(item.name ?? `حالت ${index + 1}`)} · چهار فاز</h3><dl className="mt-3 grid grid-cols-2 gap-2 text-xs">{phases.map((phaseValue, phaseIndex) => { const phase = record(phaseValue); return <div key={String(phase?.id ?? phaseIndex)} className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-500">{String(phase?.title ?? phase?.id ?? "فاز")}</dt><dd className="mt-1 font-bold">{display(phase?.personDays, "نفر-روز")} · {display(typeof phase?.share === "number" ? phase.share * 100 : null, "٪")}</dd></div>; })}</dl><p className="mt-3 text-xs leading-6 text-slate-600">تلاش پایه {display(metrics?.basePersonDays, "نفر-روز")} → تعدیل‌شده {display(metrics?.adjustedBasePersonDays, "نفر-روز")} + ذخیره {display(metrics?.reservePersonDays, "نفر-روز")} = {display(metrics?.personDays, "نفر-روز")}</p><div className="mt-2 space-y-1 text-xs text-slate-700"><p>محرک‌های اختلاف: تعدیل {display(inputs?.effortAdjustmentPercent, "٪")}, ذخیره {display(inputs?.riskReservePercent, "٪")}, ظرفیت تیم {display(inputs?.weeklyCapacityPerTeam, "نفر-روز/هفته")}, نرخ نفر-روز {display(inputs?.personDayRate)}, هزینهٔ جاری {display(inputs?.monthlyOperatingCost)}</p>{drivers.map((driverValue, driverIndex) => { const driver = record(driverValue); return <p key={`${String(driver?.name)}-${driverIndex}`}>محرک «{String(driver?.name ?? "بی‌نام")}»: شروع ماه {display(driver?.startMonth)} · احتمال {display(driver?.probabilityPercent, "٪")}</p>; })}</div><p className="mt-3 text-[11px] text-slate-500">تغییر دامنه: {display(volume?.domainCount)} دامنه · critical path محاسبه نشده است.</p><ul className="mt-2 list-disc space-y-1 pr-4 text-[11px] text-amber-900">{items(record(item.financial)?.missingInputs).map((input, inputIndex) => <li key={`${String(input)}-${inputIndex}`}>نیازمند داده: {String(input)}</li>)}</ul></article>; })}</section>

    {estimate.comparison?.differingInputs?.length > 0 && <section className="rounded-xl border border-emerald-100 bg-white p-4"><h3 className="font-black">ورودی‌های متفاوت ثبت‌شده</h3><ul className="mt-2 flex flex-wrap gap-2 text-xs">{estimate.comparison.differingInputs.map((item) => <li key={item.field} className="rounded-lg bg-slate-50 px-3 py-2">{item.field}: {item.caseIds.join("، ")}</li>)}</ul></section>}

    <section className="rounded-xl border border-emerald-100 bg-white p-4"><h3 className="font-black">KPI، گیت و اولویت</h3><div className="mt-3 grid gap-3 lg:grid-cols-2"> <div><h4 className="text-sm font-bold">KPI و گیت</h4>{items(estimate.kpiEvaluations).length ? <ul className="mt-2 space-y-2">{estimate.kpiEvaluations.map(({ kpi }) => { const result = evaluateKpiActual(kpi.actual, kpi.target, kpi.operator); const resultLabel = result === "met" ? "هدف محقق" : result === "not_met" ? "هدف محقق نشده" : "ارزیابی‌نشده؛ actual، target و operator معتبر لازم است"; return <li key={kpi.id} className="rounded-lg bg-slate-50 p-3 text-xs"><strong>{kpi.name}</strong> · هدف {display(kpi.target, kpi.unit)} · actual {display(kpi.actual, kpi.unit)} · {resultLabel}{kpi.guardrail ? " · guardrail" : ""}<span className="block text-slate-500">operator: {kpi.operator === "gte" || kpi.operator === "lte" ? kpi.operator : "نامعتبر/ثبت‌نشده"}</span></li>; })}</ul> : <p className="mt-2 text-xs text-slate-500">KPI در snapshot ثبت نشده است.</p>}
        {estimate.gateDecision && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6"><strong>گیت فعلی:</strong> {estimate.gateDecision.decision ?? "بدون تصمیم"} · {estimate.gateDecision.reason || "دلیل ثبت نشده"}<p>شواهد: {estimate.gateDecision.evidence || "ثبت نشده"} · مالک: {estimate.gateDecision.owner || "ثبت نشده"} · بازبینی: {estimate.gateDecision.reviewDate || "ثبت نشده"}</p></div>}</div>
      <div><h4 className="text-sm font-bold">اولویت و provenance</h4>{priority ? <><p className="mt-2 text-xs">امتیاز وزنی: {display(priority.weightedScore)}</p><ul className="mt-2 space-y-1 text-xs">{items(priority.criteria).map((criterionValue, index) => { const criterion = record(criterionValue); const weight = items(priority.weights).map(record).find((item) => item?.criterionId === criterion?.id); return <li key={`${String(criterion?.id)}-${index}`} className="rounded-lg bg-slate-50 p-2">{String(criterion?.label)} · امتیاز {display(criterion?.score)} · وزن {display(weight?.weight, "٪")} · جهت {String(criterion?.direction)} · منشأ {record(criterion?.source) ? evidenceLabel(record(criterion?.source)!) : "ثبت‌نشده"}</li>; })}</ul></> : <p className="mt-2 text-xs text-slate-500">امتیاز اولویت ساخته نشده است.</p>}</div></div>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-black">کامل‌بودن فرض‌ها و منشأها</h3><p className="mt-2 text-xs leading-6">نوع فرض، منبع و اطمینان جداگانه نمایش داده می‌شوند؛ confidence کلی برای تحلیل ساخته نشده است. ثبت‌شده: {display(estimate.evidenceCompleteness?.recorded)} · ناقص: {display(estimate.evidenceCompleteness?.missing)}</p>{inputEvidence.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-right text-xs"><thead><tr className="border-b text-slate-500"><th className="p-2">فیلد</th><th className="p-2">نوع</th><th className="p-2">منبع</th><th className="p-2">اطمینان</th></tr></thead><tbody>{inputEvidence.slice(0, 16).map((entry, index) => <tr key={`${entry.field}-${index}`} className="border-b last:border-0"><td className="p-2">{entry.field}</td><td className="p-2">{evidenceLabel(entry.evidence)}</td><td className="max-w-64 truncate p-2">{evidenceSource(entry.evidence)}</td><td className="p-2">{String(entry.evidence.confidence ?? "ثبت‌نشده")}</td></tr>)}</tbody></table>{inputEvidence.length > 16 && <p className="mt-2 text-[11px] text-slate-500">{inputEvidence.length - 16} منشأ دیگر در همین snapshot ثبت شده است.</p>}</div> : <p className="mt-2 text-xs text-amber-800">جزئیات provenance در دادهٔ ذخیره‌شده پیدا نشد.</p>}</section>

    <form onSubmit={(event) => void saveDecision(event)} className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4"><div><h3 className="font-black text-violet-950">ثبت تصمیم مدیرعامل</h3><p className="mt-1 text-xs leading-6 text-violet-900">تصمیم reason، evidence، owner و review date دارد و snapshot جدید می‌سازد؛ snapshot فعلی باقی می‌ماند. ثبت سروری فقط برای CEO مجاز است و هیچ task/workflow خودکاری ایجاد نمی‌شود.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">تصمیم<select required value={decision.decision ?? ""} onChange={(event) => setDecision((current) => ({ ...current, decision: (event.target.value || null) as ScenarioGateDecision["decision"] }))} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="">انتخاب کنید</option><option value="continue">ادامه</option><option value="pause">توقف موقت</option><option value="stop">توقف</option></select></label><label className="text-xs font-bold">مالک<input required value={decision.owner} onChange={(event) => setDecision((current) => ({ ...current, owner: event.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-bold">تاریخ بازبینی<input type="date" value={decision.reviewDate ?? ""} onChange={(event) => setDecision((current) => ({ ...current, reviewDate: event.target.value || null }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-bold sm:col-span-2">دلیل<textarea required value={decision.reason} onChange={(event) => setDecision((current) => ({ ...current, reason: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-bold sm:col-span-2">شواهد<textarea required value={decision.evidence} onChange={(event) => setDecision((current) => ({ ...current, evidence: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border bg-white p-2" /></label></div>{decisionError && <p role="alert" className="text-xs font-bold text-rose-700">{decisionError}</p>}<button disabled={saving} className="rounded-lg bg-violet-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{saving ? "در حال ثبت snapshot…" : "ثبت تصمیم به‌صورت snapshot جدید"}</button></form>
  </section>;
}

export function ScenarioBusinessCasePanel({ estimate, assumptions, onDecisionChange }: {
  estimate: unknown | null;
  assumptions: unknown;
  onDecisionChange: (decision: ScenarioGateDecision) => void | Promise<void>;
}) {
  if (estimate === null || estimate === undefined) return null;
  return isVersionedEstimate(estimate)
    ? <VersionedEstimate estimate={estimate} assumptions={assumptions} onDecisionChange={onDecisionChange} />
    : <LegacyEstimate estimate={estimate} />;
}
