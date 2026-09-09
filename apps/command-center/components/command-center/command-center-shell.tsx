"use client";

import { useEffect, useMemo, useState } from "react";
import { TimelineGrid } from "./timeline-grid";
import { FilterBar } from "./filter-bar";
import { TaskDetailSheet } from "./task-detail-sheet";
import { Badge } from "../ui/badge";

type Snapshot = { projects: any[]; teams: any[]; users: any[]; tasks: any[]; phases: any[]; risks: any[]; issues: any[]; sprints: any[] };
const empty: Snapshot = { projects: [], teams: [], users: [], tasks: [], phases: [], risks: [], issues: [], sprints: [] };

export function CommandCenterShell() {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");
  const load = async () => { const query = new URLSearchParams(Object.entries(filters).filter(([key, value]) => key !== "q" && Boolean(value))); const response = await fetch(`/api/snapshot?${query}`); if (!response.ok) { setError("دریافت اطلاعات فرماندهی ناموفق بود."); return; } setSnapshot(await response.json()); setError(""); };
  useEffect(() => { void load(); }, [filters.projectId, filters.teamId, filters.assigneeId, filters.phase, filters.status, filters.zoom]);
  const tasks = useMemo(() => snapshot.tasks.filter((task) => !filters.q || String(task.title).toLowerCase().includes(filters.q.toLowerCase())), [snapshot.tasks, filters.q]);
  const onFilter = (key: string, value: string) => setFilters((current) => { const next = { ...current }; if (value) next[key] = value; else delete next[key]; return next; });
  const range = { start: "2026-09-01", end: "2026-10-01" };
  const teams = snapshot.teams.map((team) => ({ id: team.id, name: team.name }));
  const users = snapshot.users.map((user) => ({ id: user.id, displayName: user.displayName }));
  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" dir="rtl"><div className="mx-auto max-w-[1500px] space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-cyan-600">مقرفرماندهی / نمای اجرایی</p><h1 className="mt-2 text-3xl font-black tracking-tight">اتاق فرمان پروژه‌ها</h1><p className="mt-2 text-sm text-slate-500">نمای یکپارچه‌ی نیوکاش، شاطی و تراز با چهار فاز محصول</p></div><div className="flex gap-2"><Badge tone="info">{snapshot.projects.length} پروژه</Badge><Badge tone="success">{snapshot.tasks.length} فعالیت</Badge></div></header>{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><FilterBar filters={filters} projects={snapshot.projects} teams={teams} users={users} onChange={onFilter} /></section><section><TimelineGrid tasks={tasks} range={range} zoom={(filters.zoom as "day" | "week" | "month" | undefined) ?? "day"} onSelectTask={setSelected} /></section><TaskDetailSheet task={selected} onClose={() => setSelected(null)} onRefresh={() => void load()} /></div></main>;
}
