import { cn } from "../../lib/utils";

export function Badge({ children, className, tone = "neutral" }: { children: React.ReactNode; className?: string; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tone === "neutral" && "bg-slate-100 text-slate-600", tone === "success" && "bg-emerald-100 text-emerald-700", tone === "warning" && "bg-amber-100 text-amber-700", tone === "danger" && "bg-rose-100 text-rose-700", tone === "info" && "bg-cyan-100 text-cyan-700", className)}>{children}</span>;
}
