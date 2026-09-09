import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger" }) {
  return <button className={cn("inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50", variant === "primary" && "bg-slate-900 text-white hover:bg-slate-700", variant === "outline" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50", variant === "ghost" && "text-slate-600 hover:bg-slate-100", variant === "danger" && "bg-rose-50 text-rose-700 hover:bg-rose-100", className)} {...props} />;
}
