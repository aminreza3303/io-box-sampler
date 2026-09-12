"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ScenarioEstimate, ScenarioGateDecision, ScenarioRequestDraft, StrategicScenario } from "../../lib/scenario-types";
import { requestDraftFromSnapshot, restrictScenarioDraftToRoster } from "../../lib/scenario-restore";
import { Badge } from "../ui/badge";
import { ScenarioAssumptionsForm, createScenarioRequestDraft } from "./scenario-assumptions-form";
import { ScenarioCatalogSection } from "./scenario-catalog-section";
import { ScenarioBusinessCasePanel } from "./scenario-business-case-panel";

type Project = { id: string; name: string; code?: string };
type Team = { id: string; name: string; project?: { name: string } | null };
type SavedAnalysis = {
  id: string;
  title: string;
  description?: string | null;
  selectedDomainIds?: unknown;
  projectIds?: unknown;
  teamIds?: unknown;
  assumptions?: unknown;
  estimate?: unknown;
  createdAt: string;
  createdBy?: { displayName: string } | null;
};
type SessionStatus = {
  project: Project;
  session: { id: string; sessionName: string; status: string; lastRunAt?: string | null } | null;
  workspace: { key: string; available: boolean; source?: string; error?: string };
};
type ChatProposal = { id: string; title: string; status: string };
type ChatPayload = {
  output?: string;
  error?: string;
  kind?: string;
  proposal?: ChatProposal | null;
  session?: { id: string; sessionName: string; status: string; workspaceKey: string; project: Project } | null;
};

const numberFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isScenarioEstimate(value: unknown): value is ScenarioEstimate {
  return isRecord(value) && value.modelVersion === "scenario-business-case/v1" && Array.isArray(value.cases);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function HermesSessionControls({ projects, selectedProjectId, onProjectChange, status }: {
  projects: Project[];
  selectedProjectId: string;
  onProjectChange: (value: string) => void;
  status: SessionStatus | null;
}) {
  return <section className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-violet-700">اتصال Hermes به پروژه</p>
        <h2 className="mt-1 text-xl font-black text-violet-950">workspace و session فعال</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-violet-900">با انتخاب پروژه، گفت‌وگو در workspace همان پروژه و session پایدار آن ادامه پیدا می‌کند. Hermes پیشنهاد می‌دهد؛ اجرای تغییر نیازمند تأیید مدیرعامل است.</p>
      </div>
      <label className="min-w-64 text-xs font-black text-violet-900">پروژهٔ کاری
        <select value={selectedProjectId} onChange={(event) => onProjectChange(event.target.value)} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-300">
          <option value="">بدون پروژه / one-shot</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
    </div>
    {selectedProjectId && <div className={`mt-4 rounded-xl px-4 py-3 text-xs leading-6 ${status?.workspace.available ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
      {status?.workspace.available ? <><strong>آمادهٔ اجرا</strong> · workspace: {status.workspace.key}{status.session ? ` · session: ${status.session.sessionName}` : " · session با اولین پیام ساخته می‌شود."}</> : status?.workspace.error ?? "در حال بررسی workspace پروژه…"}
    </div>}
  </section>;
}

export function ScenarioPlannerPage() {
  const [draft, setDraft] = useState<ScenarioRequestDraft>(() => createScenarioRequestDraft());
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [estimate, setEstimate] = useState<ScenarioEstimate | null>(null);
  const [legacyEstimate, setLegacyEstimate] = useState<unknown>(null);
  const [resultAssumptions, setResultAssumptions] = useState<unknown>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [chatQuestion, setChatQuestion] = useState("این سناریو را از نظر ریسک، ترتیب اجرا و مالک هر اقدام بررسی کن.");
  const [chatOutput, setChatOutput] = useState("");
  const [chatState, setChatState] = useState<"idle" | "loading" | "blocked" | "failed">("idle");
  const [chatProposal, setChatProposal] = useState<ChatProposal | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    const response = await fetch("/api/scenarios");
    if (!response.ok) throw new Error("تاریخچهٔ تحلیل‌ها دریافت نشد.");
    const payload: unknown = await response.json();
    setHistory(Array.isArray(payload) ? payload as SavedAnalysis[] : []);
  }

  useEffect(() => {
    let active = true;
    async function loadPageData() {
      setHistoryLoading(true);
      try {
        const [historyResponse, snapshotResponse, teamsResponse] = await Promise.all([
          fetch("/api/scenarios"),
          fetch("/api/snapshot"),
          fetch("/api/teams"),
        ]);
        if (historyResponse.ok) {
          const payload: unknown = await historyResponse.json();
          if (active) setHistory(Array.isArray(payload) ? payload as SavedAnalysis[] : []);
        }
        if (snapshotResponse.ok) {
          const snapshot: unknown = await snapshotResponse.json();
          if (active && isRecord(snapshot) && Array.isArray(snapshot.projects)) {
            const availableProjects = snapshot.projects as Project[];
            setProjects(availableProjects);
            setSelectedProjectId((current) => current || availableProjects.find((project) => project.code === "newcash")?.id || availableProjects[0]?.id || "");
          }
        }
        if (teamsResponse.ok) {
          const payload: unknown = await teamsResponse.json();
          if (active) setTeams(Array.isArray(payload) ? payload as Team[] : []);
        }
        if (active && (!historyResponse.ok || !snapshotResponse.ok || !teamsResponse.ok)) setError("بخشی از فهرست‌های مجاز پروژه، تیم یا تاریخچه بارگیری نشد؛ اتصال را بررسی و صفحه را دوباره بارگذاری کنید.");
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "دریافت اطلاعات سناریو ناموفق بود.");
      } finally {
        if (active) setHistoryLoading(false);
      }
    }
    void loadPageData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedProjectId) { setSessionStatus(null); return () => { active = false; }; }
    fetch(`/api/ai/sessions?projectId=${encodeURIComponent(selectedProjectId)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("وضعیت workspace دریافت نشد.")))
      .then((items: SessionStatus[]) => { if (active) setSessionStatus(items[0] ?? null); })
      .catch(() => { if (active) setSessionStatus(null); });
    return () => { active = false; };
  }, [selectedProjectId]);

  function updateDraft(next: ScenarioRequestDraft) {
    setDraft(next);
    setEstimate(null);
    setLegacyEstimate(null);
    setResultAssumptions(null);
    setCurrentAnalysisId(null);
    setChatOutput("");
    setChatProposal(null);
  }

  function applyScenario(scenario: StrategicScenario) {
    setDraft((current) => ({
      ...createScenarioRequestDraft(scenario),
      projectIds: current.projectIds ?? [],
      teamIds: current.teamIds ?? [],
    }));
    setEstimate(null);
    setLegacyEstimate(null);
    setResultAssumptions(null);
    setCurrentAnalysisId(null);
    setChatOutput("");
    setChatProposal(null);
    setError("");
  }

  async function analyze() {
    setAnalyzing(true);
    setError("");
    setChatOutput("");
    setChatProposal(null);
    try {
      const response = await fetch("/api/scenarios/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json() as { analysis?: { id?: string; assumptions?: unknown }; estimate?: unknown; error?: string };
      if (!response.ok || !isScenarioEstimate(payload.estimate)) throw new Error(payload.error ?? "تحلیل سناریو ناموفق بود.");
      setEstimate(payload.estimate);
      setLegacyEstimate(null);
      setResultAssumptions(payload.analysis?.assumptions ?? draft);
      setCurrentAnalysisId(payload.analysis?.id ?? null);
      await loadHistory();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تحلیل سناریو ناموفق بود.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function askHermes() {
    if (!estimate || !chatQuestion.trim()) return;
    setChatState("loading");
    setChatOutput("");
    setChatProposal(null);
    setError("");
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: chatQuestion.trim(),
          projectId: selectedProjectId || undefined,
          scenarioAnalysisId: currentAnalysisId,
        }),
      });
      const payload = await response.json() as ChatPayload;
      if (payload.output) setChatOutput(payload.output);
      if (payload.proposal) setChatProposal(payload.proposal);
      if (payload.session) setSessionStatus({
        project: payload.session.project,
        session: { id: payload.session.id, sessionName: payload.session.sessionName, status: payload.session.status },
        workspace: { key: payload.session.workspaceKey, available: true },
      });
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
    const request = requestDraftFromSnapshot(item.assumptions);
    let restoredDraft: ScenarioRequestDraft;
    if (request) restoredDraft = request;
    else {
      const base = createScenarioRequestDraft();
      const restoredDomains = stringArray(item.selectedDomainIds);
      restoredDraft = {
        ...base,
        title: item.title,
        description: item.description ?? "",
        domainIds: restoredDomains.length ? restoredDomains : base.domainIds,
        projectIds: stringArray(item.projectIds),
        teamIds: stringArray(item.teamIds),
      };
    }
    setDraft(restrictScenarioDraftToRoster(restoredDraft, projects.map(({ id }) => id), teams.map(({ id }) => id)));
    const savedEstimate = isScenarioEstimate(item.estimate) ? item.estimate : null;
    setEstimate(savedEstimate);
    setLegacyEstimate(savedEstimate ? null : item.estimate ?? null);
    setResultAssumptions(item.assumptions);
    setCurrentAnalysisId(savedEstimate ? item.id : null);
    setChatOutput("");
    setChatProposal(null);
    setChatState("idle");
    setError(savedEstimate ? "" : "این تحلیل قدیمی است؛ اطلاعات اصلی بازیابی شد. برای دیدن برآورد نسخه‌دار، دوباره تحلیل را اجرا کنید.");
  }

  async function saveDecision(decision: ScenarioGateDecision) {
    if (!currentAnalysisId) throw new Error("شناسهٔ snapshot نسخه‌دار پیدا نشد.");
    const response = await fetch(`/api/scenarios/${encodeURIComponent(currentAnalysisId)}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(decision),
    });
    const payload = await response.json() as { analysis?: { id?: string; estimate?: unknown; assumptions?: unknown }; error?: string };
    if (!response.ok || !payload.analysis?.id || !isScenarioEstimate(payload.analysis.estimate)) {
      throw new Error(payload.error ?? "ثبت تصمیم مدیرعامل ناموفق بود.");
    }
    setEstimate(payload.analysis.estimate);
    setLegacyEstimate(null);
    setCurrentAnalysisId(payload.analysis.id);
    setResultAssumptions(payload.analysis.assumptions);
    setChatOutput("");
    setChatProposal(null);
    await loadHistory();
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" dir="rtl">
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold text-cyan-300">مقر فرماندهی / تحلیل تصمیم</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">طراحی سناریوی بیزینسی</h1><p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">ایده‌های اسناد را با داده‌های داخلی و فرض‌های صریح ترکیب کنید؛ effort، چهار فاز، هزینه و منفعت سه حالت را بسنجید و سپس با زمینهٔ ذخیره‌شده با Hermes گفت‌وگو کنید.</p></div><div className="flex flex-wrap gap-2"><Badge tone="info">۱۳ فرضیهٔ سندی</Badge><Badge tone="success">۳ حالت مستقل</Badge><Badge tone="warning">محاسبهٔ مالی با دادهٔ ورودی</Badge></div></div>
      </header>

      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-800">{error}</div>}

      <ScenarioCatalogSection selectedId={draft.catalogScenarioId} onSelect={applyScenario} />
      <HermesSessionControls projects={projects} selectedProjectId={selectedProjectId} onProjectChange={setSelectedProjectId} status={sessionStatus} />

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <ScenarioAssumptionsForm value={draft} projects={projects} teams={teams} submitting={analyzing} onChange={updateDraft} onAnalyze={() => void analyze()} />
          {(estimate || legacyEstimate !== null) && <ScenarioBusinessCasePanel key={currentAnalysisId ?? "legacy"} estimate={estimate ?? legacyEstimate} assumptions={resultAssumptions} onDecisionChange={saveDecision} />}
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">تحلیل‌های ذخیره‌شده</h2><p className="mt-1 text-xs text-slate-500">تاریخچهٔ مجاز این نشست</p></div><Badge tone="neutral">{numberFormat.format(history.length)}</Badge></div><div className="mt-4 space-y-2">{historyLoading ? <p className="text-sm text-slate-500">در حال دریافت تاریخچه…</p> : history.length ? history.slice(0, 10).map((item) => {
            const versioned = isScenarioEstimate(item.estimate);
            return <button key={item.id} type="button" onClick={() => restoreAnalysis(item)} className="w-full rounded-xl border border-transparent bg-slate-50 p-3 text-right transition hover:border-cyan-200 hover:bg-cyan-50"><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleDateString("fa-IR")} · {versioned ? "نسخه‌دار" : "سابقهٔ قدیمی"}{item.createdBy?.displayName ? ` · ${item.createdBy.displayName}` : ""}</span></button>;
          }) : <p className="text-sm leading-6 text-slate-500">هنوز تحلیلی ذخیره نشده است.</p>}</div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">گفت‌وگو با Hermes</h2><p className="mt-1 text-sm text-slate-500">تفسیر و برنامه‌ریزی بر پایهٔ این تحلیل ذخیره‌شده</p></div><Badge tone="info">مادر فرماندهی</Badge></div>{estimate ? <><textarea aria-label="پرسش از Hermes" value={chatQuestion} onChange={(event) => setChatQuestion(event.target.value)} rows={4} className="mt-4 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-cyan-300" /><button type="button" onClick={() => void askHermes()} disabled={chatState === "loading" || !currentAnalysisId} className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{chatState === "loading" ? "Hermes در حال تحلیل…" : "ارسال تحلیل ذخیره‌شده به Hermes"}</button>{!currentAnalysisId && <p className="mt-2 text-xs text-amber-800">برای گفت‌وگو، ابتدا یک تحلیل نسخه‌دار ذخیره کنید.</p>}{chatState === "blocked" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900">Hermes در این محیط فعال نشده است؛ برآورد نسخه‌دار ذخیره شده و پس از تنظیم runtime می‌توان تحلیل متنی را اجرا کرد.</p>}{chatState === "failed" && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-900">Hermes نتوانست پاسخ معتبر بدهد. این وضعیت به‌عنوان شکست اجرا پنهان نمی‌شود.</p>}{chatOutput && <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-7 text-slate-800"><p className="mb-2 text-xs font-black text-cyan-800">پاسخ Hermes</p><p className="whitespace-pre-wrap">{chatOutput}</p></div>}</> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-500">ابتدا سناریو را تحلیل و ذخیره کنید تا Hermes فقط به خروجی ثبت‌شده دسترسی داشته باشد.</p>}</section>

          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 text-sm leading-7 text-violet-950"><p className="font-black">قرارداد تصمیم</p><p className="mt-2">Hermes پیشنهاد می‌دهد؛ تغییر واقعی در کار، سیاست یا فرایند فقط پس از تأیید ثبت‌شدهٔ مدیرعامل انجام می‌شود.</p></div>
        </aside>
      </div>

      {chatProposal && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-emerald-700">پیشنهاد ثبت شد</p><h2 className="mt-1 text-lg font-black text-emerald-950">{chatProposal.title}</h2><p className="mt-2 text-sm leading-7 text-emerald-900">این پیشنهاد هنوز task نیست و تا تأیید مدیرعامل تغییری در پروژه ایجاد نمی‌کند.</p></div><Link href="/ceo/proposals" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800">بررسی در اتاق مدیرعامل ←</Link></div></section>}
    </div>
  </main>;
}
