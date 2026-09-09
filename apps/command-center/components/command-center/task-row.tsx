import { Badge } from "../ui/badge";

export function TaskRow({ task, onSelect }: { task: Record<string, any>; onSelect: () => void }) {
  const tone = task.status === "BLOCKED" ? "danger" : task.status === "DONE" ? "success" : task.status === "IN_PROGRESS" ? "info" : "warning";
  return <button type="button" onClick={onSelect} className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-right hover:bg-cyan-50/50"><span><span className="block font-medium text-slate-800">{task.title}</span><span className="text-xs text-slate-400">{task.project?.name} · {task.team?.name}</span></span><Badge tone={tone}>{task.status}</Badge></button>;
}
