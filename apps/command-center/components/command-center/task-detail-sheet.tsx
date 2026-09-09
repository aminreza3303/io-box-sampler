"use client";

import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";

export function TaskDetailSheet({ task, onClose, onRefresh }: { task: Record<string, any> | null; onClose: () => void; onRefresh: () => void }) {
  if (!task) return null;
  const selectedTask = task;
  async function markDone() {
    const response = await fetch(`/api/tasks/${selectedTask.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ phaseType: "DELIVERY", patch: { status: "COMPLETE" } }) });
    if (response.ok) { onRefresh(); onClose(); }
  }
  return <Sheet open={Boolean(selectedTask)} onClose={onClose} title="جزئیات فعالیت"><div className="space-y-5"><div><p className="text-xs text-slate-400">فعالیت</p><h2 className="mt-1 text-xl font-bold text-slate-900">{selectedTask.title}</h2></div><p className="text-sm leading-7 text-slate-600">{selectedTask.description || "توضیحی ثبت نشده است."}</p><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-400">پروژه</span>{selectedTask.project?.name}</div><div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-400">تیم</span>{selectedTask.team?.name}</div></div><Button onClick={markDone}>تحویل فاز نهایی</Button></div></Sheet>;
}
