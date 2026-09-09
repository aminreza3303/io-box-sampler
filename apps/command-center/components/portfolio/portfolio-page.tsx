"use client";

import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";

type Snapshot = { projects: any[]; teams: any[]; users: any[]; tasks: any[]; risks: any[]; issues: any[]; sprints: any[] };
const empty: Snapshot = { projects: [], teams: [], users: [], tasks: [], risks: [], issues: [], sprints: [] };
const priorityLabels: Record<string, string> = { LOW: "کم", MEDIUM: "متوسط", HIGH: "زیاد", URGENT: "فوری" };

export function PortfolioPage({ kind }: { kind: "projects" | "teams" | "backlog" | "risks" }) {
  const [snapshot, setSnapshot] = useState(empty);
  useEffect(() => { fetch("/api/snapshot").then((response) => response.json()).then(setSnapshot).catch(() => undefined); }, []);
  const title = kind === "projects" ? "پروژه‌ها" : kind === "teams" ? "تیم‌ها و افراد" : kind === "backlog" ? "بک‌لاگ و اسپرینت" : "ریسک‌ها و مسائل";
  return <main className="min-h-screen bg-slate-50 p-6 text-slate-900 sm:p-10" dir="rtl"><div className="mx-auto max-w-6xl space-y-8"><div><p className="text-sm font-semibold text-cyan-600">مقر فرماندهی / مدیریت پرتفولیو</p><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-2 text-sm text-slate-500">پروژه‌ها، تیم‌ها و مسائل را با مالک و وضعیت روشن دنبال کنید.</p></div>{kind === "projects" && <div className="grid gap-4 md:grid-cols-3">{snapshot.projects.map((project) => <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">{project.name}</h2><p className="mt-2 text-sm text-slate-500">{project.description || "توضیحی ثبت نشده است."}</p><Badge tone="info">کد پروژه: {project.code}</Badge></article>)}</div>}{kind === "teams" && <div className="grid gap-4 md:grid-cols-2">{snapshot.teams.map((team) => <article key={team.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">{team.name}</h2><p className="mt-2 text-sm text-slate-500">اعضای فعال: {snapshot.users.filter((user) => user.teamIds?.includes(team.id)).length}</p></article>)}</div>}{kind === "backlog" && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-bold">فعالیت‌های ثبت‌شده: {snapshot.tasks.length}</p><p className="mt-2 text-sm text-slate-500">اسپرینت‌های ثبت‌شده: {snapshot.sprints.length}</p></div>}{kind === "risks" && <div className="grid gap-4 md:grid-cols-2">{[...snapshot.risks, ...snapshot.issues].map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold">{item.title}</h2><Badge tone={item.priority === "URGENT" || item.priority === "HIGH" ? "danger" : "warning"}>{priorityLabels[item.priority] ?? item.priority}</Badge></div><p className="mt-2 text-sm text-slate-500">{item.description || "توضیحی ثبت نشده است."}</p></article>)}</div>}</div></main>;
}
