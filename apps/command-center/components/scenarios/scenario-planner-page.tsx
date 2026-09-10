"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { domainGroups } from "../../lib/domain-map";
import { scenarioTemplates, type ScenarioEstimate } from "../../lib/scenario-planner";
import { Badge } from "../ui/badge";

type Project = { id: string; name: string; code: string };
type SavedAnalysis = { id: string; title: string; description?: string | null; selectedDomainIds: unknown; estimate: ScenarioEstimate; createdAt: string; createdBy?: { displayName: string } };
type SessionStatus = { project: Project; session: { id: string; sessionName: string; status: string; lastRunAt?: string | null } | null; workspace: { key: string; available: boolean; source?: string; error?: string } };
type ChatProposal = { id: string; title: string; status: string };

const numberFormat = new Intl.NumberFormat("fa-IR");
const statusLabels = { low: "اطمینان پایین", medium: "اطمینان متوسط", high: "اطمینان بالا" } as const;

function faNumber(value: number) {
  return numberFormat.format(value);
}

function costLabel(cost: ScenarioEstimate["metrics"]["cost"]) {
  return cost ? `${faNumber(cost.low)} تا ${faNumber(cost.high)} ${cost.currency}` : "نیازمند نرخ";
}

function HermesSessionControls({ projects, selectedProjectId, onProjectChange, status }: { projects: Project[]; selectedProjectId: string; onProjectChange: (value: string) => void; status: SessionStatus | null }) {
  return <section className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-violet-700">اتصال Hermes به پروژه</p><h2 className="mt-1 text-xl font-black text-violet-950">workspace و session فعال</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-violet-900">با انتخاب پروژه، گفت‌وگو در workspace همان پروژه و session پایدار آن ادامه پیدا می‌کند. Hermes فقط پیشنهاد می‌سازد؛ task بعد از تأیید مدیرعامل وارد پنل می‌شود.</p></div><label className="min-w-64 text-xs font-black text-violet-900">پروژهٔ کاری<select value={selectedProjectId} onChange={(event) => onProjectChange(event.target.value)} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-300"><option value="">بدون پروژه / one-shot</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label></div>{selectedProjectId && <div className={`mt-4 rounded-xl px-4 py-3 text-xs leading-6 ${status?.workspace.available ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{status?.workspace.available ? <><strong>آمادهٔ اجرا</strong> · workspace: {status.workspace.key}{status.session ? ` · session: ${status.session.sessionName}` : " · session با اولین پیام ساخته می‌شود."}</> : status?.workspace.error ?? "در حال بررسی workspace پروژه…"}</div>}</section>;
}

export function ScenarioPlannerPage() {
  const [title, setTitle] = useState("انتقال وجه چندارزی");
  const [description, setDescription] = useState("بررسی اثر راه‌اندازی انتقال وجه چندارزی روی نیوکاش، شاطی و تراز");
  const [selectedDomains, setSelectedDomains] = useState<string[]>(["transfer"]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [domainSearch, setDomainSearch] = useState("");
  const [teamCount, setTeamCount] = useState("2");
  const [weeklyCapacity, setWeeklyCapacity] = useState("5");
  const [personDayRate, setPersonDayRate] = useState("");
  const [bufferPercent, setBufferPercent] = useState("20");
  const [estimate, setEstimate] = useState<ScenarioEstimate | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [chatQuestion, setChatQuestion] = useState("این سناریو را از نظر ریسک، ترتیب اجرا و مالک هر اقدام بررسی کن.");
  const [chatOutput, setChatOutput] = useState("");
  const [chatState, setChatState] = useState<"idle" | "loading" | "blocked" | "failed">("idle");
  const [chatProposal, setChatProposal] = useState<ChatProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    const [historyResponse, snapshotResponse] = await Promise.all([fetch("/api/scenarios"), fetch("/api/snapshot")]);
    if (historyResponse.ok) setHistory(await historyResponse.json());
    if (snapshotResponse.ok) {
      const snapshot = await snapshotResponse.json() as { projects?: Project[] };
      setProjects(snapshot.projects ?? []);
      setSelectedProjectId((current) => current || snapshot.projects?.find((project) => project.code === "newcash")?.id || snapshot.projects?.[0]?.id || "");
    }
  }

  useEffect(() => { void loadHistory().catch(() => undefined); }, []);

  useEffect(() => {
    if (!selectedProjectId) { setSessionStatus(null); return; }
    fetch(`/api/ai/sessions?projectId=${encodeURIComponent(selectedProjectId)}`).then((response) => response.ok ? response.json() : Promise.reject(new Error("وضعیت workspace دریافت نشد."))).then((items: SessionStatus[]) => setSessionStatus(items[0] ?? null)).catch(() => setSessionStatus(null));
  }, [selectedProjectId]);

  const filteredGroups = useMemo(() => {
    const query = domainSearch.trim().toLowerCase();
    if (!query) return domainGroups;
    return domainGroups.map((group) => ({ ...group, domains: group.domains.filter((domain) => `${domain.title} ${domain.summary}`.toLowerCase().includes(query)) })).filter((group) => group.domains.length > 0);
  }, [domainSearch]);

  function applyTemplate(templateId: string) {
    const template = scenarioTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description);
    setSelectedDomains(template.domainIds);
    setEstimate(null);
    setChatOutput("");
    setChatProposal(null);
  }

  function toggleDomain(id: string) {
    setSelectedDomains((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setEstimate(null);
  }

  function toggleProject(id: string) {
    setSelectedProjects((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/scenarios/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description, domainIds: selectedDomains, projectIds: selectedProjects, assumptions: { teamCount: Number(teamCount), weeklyCapacity: Number(weeklyCapacity), personDayRate: personDayRate ? Number(personDayRate) : null, bufferPercent: Number(bufferPercent) } }) });
      const payload = await response.json() as { estimate?: ScenarioEstimate; error?: string };
      if (!response.ok || !payload.estimate) throw new Error(payload.error ?? "تحلیل سناریو ناموفق بود.");
      setEstimate(payload.estimate);
      await loadHistory();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تحلیل سناریو ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function askHermes() {
    if (!estimate || !chatQuestion.trim()) return;
    setChatState("loading");
    setChatOutput("");
    setChatProposal(null);
    setError("");
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: chatQuestion.trim(), projectId: selectedProjectId || undefined, context: `سناریو: ${estimate.title}\nتوضیح: ${estimate.description}`, scenarioContext: estimate }) });
      const payload = await response.json() as { output?: string; error?: string; kind?: string; proposal?: ChatProposal | null; session?: { id: string; sessionName: string; status: string; workspaceKey: string; project: Project } | null };
      if (payload.output) setChatOutput(payload.output);
      if (payload.proposal) setChatProposal(payload.proposal);
      if (payload.session) setSessionStatus((current) => current ? { ...current, session: { id: payload.session!.id, sessionName: payload.session!.sessionName, status: payload.session!.status }, workspace: { ...current.workspace, key: payload.session!.workspaceKey, available: true }, project: payload.session!.project } : null);
      if (payload.kind === "blocked" || response.status === 503) setChatState("blocked");
      else if (!response.ok || payload.kind === "error") setChatState("failed");
      else setChatState("idle");
      if (!response.ok && payload.error) setError(payload.error);
    } catch (reason) {
      setChatState("failed");
      setError(reason instanceof Error ? reason.message : "گفت‌وگو با Hermes ناموفق بود.");
    }
  }

  function restoreAnalysis(item: SavedAnalysis) {
    setTitle(item.title);
    setDescription(item.description ?? "");
    setSelectedDomains(Array.isArray(item.selectedDomainIds) ? item.selectedDomainIds.filter((id): id is string => typeof id === "string") : []);
    setEstimate(item.estimate);
    setChatOutput("");
    setChatProposal(null);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" dir="rtl">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold text-cyan-300">مقر فرماندهی / تحلیل تصمیم</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">طراحی سناریوی بیزینسی</h1><p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">اثر یک تصمیم را روی دامنه‌های محصول، فرایندها، تیم‌ها و چهار فاز اجرا ببینید؛ سپس همان برآورد ساختاریافته را برای تحلیل ریسک و برنامه‌ریزی به Hermes بسپارید.</p></div><div className="flex flex-wrap gap-2"><Badge tone="info">۲۸ دامنهٔ مرجع</Badge><Badge tone="success">برآورد شفاف</Badge><Badge tone="warning">هزینه بر اساس تومان/نفر-روز</Badge></div></div></header>
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-800">{error}</div>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">سناریوهای آماده</h2><p className="mt-1 text-sm text-slate-500">یک الگوی نزدیک را انتخاب کنید و قبل از تحلیل اصلاحش کنید.</p></div><span className="text-xs text-slate-400">{scenarioTemplates.length} الگو</span></div><div className="mt-4 flex gap-3 overflow-x-auto pb-1">{scenarioTemplates.map((template) => <button key={template.id} type="button" onClick={() => applyTemplate(template.id)} className="min-w-56 rounded-xl border border-slate-200 bg-slate-50 p-3 text-right transition hover:border-cyan-400 hover:bg-cyan-50"><span className="block text-sm font-black">{template.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{template.description}</span></button>)}</div></section>

        <HermesSessionControls projects={projects} selectedProjectId={selectedProjectId} onProjectChange={setSelectedProjectId} status={sessionStatus} />

        <div className="grid gap-6 2xl:grid-cols-[360px_minmax(0,1fr)_360px]">
          <section className="space-y-5 2xl:order-1"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">پارامترهای سناریو</h2><p className="mt-1 text-sm leading-6 text-slate-500">فرض‌ها را قابل تغییر نگه دارید تا اختلاف سناریوها دیده شود.</p><label className="mt-4 block text-sm font-bold">عنوان سناریو<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300" /></label><label className="mt-3 block text-sm font-bold">صورت مسئله<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={4} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300" /></label><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-600">تعداد تیم<input type="number" min="1" max="20" value={teamCount} onChange={(event) => setTeamCount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-slate-600">ظرفیت هفتگی هر تیم<input type="number" min="1" max="40" value={weeklyCapacity} onChange={(event) => setWeeklyCapacity(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-slate-600">نرخ نفر-روز (تومان)<input type="number" min="0" max="1000000000" value={personDayRate} onChange={(event) => setPersonDayRate(event.target.value)} placeholder="وارد نشده" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label><label className="text-xs font-bold text-slate-600">ذخیره ریسک<input type="number" min="0" max="100" value={bufferPercent} onChange={(event) => setBufferPercent(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label></div><div className="mt-4"><p className="text-sm font-bold">پروژه‌های درگیر</p><div className="mt-2 flex flex-wrap gap-2">{projects.length ? projects.map((project) => <button key={project.id} type="button" onClick={() => toggleProject(project.id)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${selectedProjects.includes(project.id) ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{project.name}</button>) : <span className="text-xs text-slate-400">پروژه‌ها پس از اتصال به داده نمایش داده می‌شوند.</span>}</div></div><button type="button" onClick={() => void analyze()} disabled={loading || !title.trim() || selectedDomains.length === 0} className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "در حال محاسبه…" : "تحلیل سناریو"}</button></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">تحلیل‌های ذخیره‌شده</h2><div className="mt-4 space-y-2">{history.length ? history.slice(0, 8).map((item) => <button key={item.id} type="button" onClick={() => restoreAnalysis(item)} className="w-full rounded-xl bg-slate-50 p-3 text-right transition hover:bg-slate-100"><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{faNumber(item.estimate?.metrics?.personDays ?? 0)} نفر-روز · {faNumber(item.estimate?.metrics?.calendarWeeks ?? 0)} هفته</span></button>) : <p className="text-sm text-slate-500">هنوز تحلیلی ذخیره نشده است.</p>}</div></div>
          </section>

          <section className="space-y-5 2xl:order-2"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">دامنه‌های درگیر</h2><p className="mt-1 text-sm text-slate-500">دامنه‌های مبنا را انتخاب کنید؛ وابستگی‌های مستقیم خودکار به بوم اثر اضافه می‌شوند.</p></div><span className="text-xs font-bold text-slate-400">{selectedDomains.length} انتخاب‌شده</span></div><input value={domainSearch} onChange={(event) => setDomainSearch(event.target.value)} placeholder="جست‌وجوی دامنه…" className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300" /><div className="mt-4 grid gap-3 md:grid-cols-2">{filteredGroups.flatMap((group) => group.domains).map((domain) => <button key={domain.id} type="button" onClick={() => toggleDomain(domain.id)} aria-pressed={selectedDomains.includes(domain.id)} className={`rounded-xl border p-3 text-right transition ${selectedDomains.includes(domain.id) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:border-cyan-400"}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-black">{domain.title}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${selectedDomains.includes(domain.id) ? "bg-white/15 text-cyan-200" : "bg-slate-100 text-slate-500"}`}>{domain.priority}</span></div><p className={`mt-1 text-xs leading-5 ${selectedDomains.includes(domain.id) ? "text-slate-300" : "text-slate-500"}`}>{domain.summary}</p></button>)}</div></div>{estimate ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4"><p className="text-xs font-bold text-cyan-800">زمان نفر-روز</p><p className="mt-2 text-2xl font-black text-cyan-950">{faNumber(estimate.metrics.personDays)}</p><p className="mt-1 text-xs text-cyan-800">پایه: {faNumber(estimate.metrics.basePersonDays)} · ذخیره: {estimate.assumptions.bufferPercent}٪</p></article><article className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="text-xs font-bold text-violet-800">زمان تقویمی</p><p className="mt-2 text-2xl font-black text-violet-950">{faNumber(estimate.metrics.calendarWeeks)} هفته</p><p className="mt-1 text-xs text-violet-800">{estimate.assumptions.teamCount} تیم × {estimate.assumptions.weeklyCapacity} نفر-روز در هفته</p></article><article className={`rounded-2xl border p-4 ${estimate.metrics.cost ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}><p className="text-xs font-bold text-slate-700">هزینه تخمینی</p><p className="mt-2 text-lg font-black text-slate-950">{costLabel(estimate.metrics.cost)}</p><p className="mt-1 text-xs text-slate-600">بازهٔ ۱۵٪ بالا و پایین</p></article><article className="rounded-2xl border border-rose-100 bg-rose-50 p-4"><p className="text-xs font-bold text-rose-800">حجم تغییر</p><p className="mt-2 text-2xl font-black text-rose-950">{faNumber(estimate.changeVolume.taskCount)} کار</p><p className="mt-1 text-xs text-rose-800">{faNumber(estimate.changeVolume.domainCount)} دامنه · {faNumber(estimate.changeVolume.processCount)} فرایند</p></article></div>
            <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">بوم اثر سناریو</h2><Badge tone={estimate.confidence === "high" ? "success" : estimate.confidence === "medium" ? "warning" : "danger"}>{statusLabels[estimate.confidence]}</Badge></div><div className="mt-4 space-y-2">{estimate.impactedDomains.map((domain) => <div key={domain.id} className={`flex items-center justify-between rounded-xl p-3 ${domain.selected ? "bg-slate-950 text-white" : "bg-slate-50"}`}><div><p className="text-sm font-bold">{domain.title}</p><p className={`mt-1 text-xs ${domain.selected ? "text-slate-300" : "text-slate-500"}`}>{domain.selected ? "دامنه مبنا" : "وابستگی مستقیم"} · پیچیدگی پایه {faNumber(domain.complexityDays)} روز</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${domain.priority === "P0" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{domain.priority}</span></div>)}</div><p className="mt-4 text-xs leading-6 text-slate-500">{faNumber(estimate.relationships.length)} رابطهٔ مستقیم در این برآورد لحاظ شده است.</p></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">فرایندهای تحت‌تأثیر</h2><div className="mt-4 flex flex-wrap gap-2">{estimate.processImpacts.map((process) => <span key={process.id} className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">{process.title}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">API/سطح سرویس</span><strong className="mt-1 block text-lg">{faNumber(estimate.changeVolume.apiSurfaceCount)}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">یکپارچه‌سازی</span><strong className="mt-1 block text-lg">{faNumber(estimate.changeVolume.integrationCount)}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">مهاجرت داده</span><strong className="mt-1 block text-lg">{faNumber(estimate.changeVolume.dataMigrationCount)}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">سطح UI</span><strong className="mt-1 block text-lg">{faNumber(estimate.changeVolume.uiSurfaceCount)}</strong></div></div></section></div>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">تقسیم چهار فاز</h2><span className="text-xs text-slate-400">همهٔ کارها باید از این چهار دروازه عبور کنند.</span></div><div className="mt-4 grid gap-3 sm:grid-cols-4">{estimate.phases.map((phase) => <div key={phase.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-sm font-bold">{phase.title}</span><span className="text-xs font-black text-cyan-700">{faNumber(phase.personDays)} روز</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-cyan-500" style={{ width: `${phase.share * 100}%` }} /></div><p className="mt-2 text-xs text-slate-500">{faNumber(phase.share * 100)}٪ از effort</p></div>)}</div></section><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><p className="font-black">فرض‌ها و هشدارها</p><ul className="mt-2 list-disc space-y-1 pr-5">{estimate.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></> : <div className="grid min-h-[560px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><p className="text-xl font-black">سناریو آمادهٔ تحلیل است</p><p className="mt-2 max-w-md text-sm leading-7 text-slate-500">دامنه‌ها و فرض‌های سمت راست را تنظیم کنید و «تحلیل سناریو» را بزنید تا بوم اثر، زمان، هزینه و حجم تغییر ساخته شود.</p></div></div>}</section>

          <section className="space-y-5 2xl:order-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Hermes</h2><p className="mt-1 text-sm text-slate-500">تحلیل تصمیم بر اساس همین برآورد</p></div><Badge tone="info">مادر فرماندهی</Badge></div>{estimate ? <><textarea value={chatQuestion} onChange={(event) => setChatQuestion(event.target.value)} rows={4} className="mt-4 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-cyan-300" /><button type="button" onClick={() => void askHermes()} disabled={chatState === "loading"} className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">{chatState === "loading" ? "Hermes در حال تحلیل…" : "ارسال سناریو به Hermes"}</button>{chatState === "blocked" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900">Hermes در این محیط فعال نشده است؛ برآورد deterministic ذخیره شده و پس از تنظیم runtime می‌توان تحلیل متنی را اجرا کرد.</p>}{chatState === "failed" && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-900">Hermes نتوانست پاسخ معتبر بدهد. این وضعیت به‌عنوان شکست اجرا پنهان نمی‌شود.</p>}{chatOutput && <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-7 text-slate-800"><p className="mb-2 text-xs font-black text-cyan-800">پاسخ Hermes</p><p className="whitespace-pre-wrap">{chatOutput}</p></div>}</> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-500">ابتدا سناریو را تحلیل کنید تا Hermes عددها، دامنهٔ اثر و فرض‌ها را در زمینهٔ گفتگو داشته باشد.</p>}</div><div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 text-sm leading-7 text-violet-950"><p className="font-black">قرارداد تصمیم</p><p className="mt-2">Hermes پیشنهاد می‌دهد؛ تغییر واقعی در کار، سیاست یا فرایند فقط پس از تأیید ثبت‌شدهٔ مدیرعامل انجام می‌شود.</p></div></section>
        </div>
        {chatProposal && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-emerald-700">proposal ثبت شد</p><h2 className="mt-1 text-lg font-black text-emerald-950">{chatProposal.title}</h2><p className="mt-2 text-sm leading-7 text-emerald-900">این پیشنهاد هنوز task نیست و تا تأیید مدیرعامل تغییری در پروژه ایجاد نمی‌کند.</p></div><Link href="/ceo/proposals" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800">بررسی در اتاق مدیرعامل ←</Link></div></section>}
      </div>
    </main>
  );
}
