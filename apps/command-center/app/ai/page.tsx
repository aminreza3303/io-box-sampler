import { AiWorkspacePage } from "../../components/ai/ai-workspace-page";
import { Suspense } from "react";

export const metadata = { title: "دستیار هوشمند" };

export default function AiPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-slate-50 text-slate-500" dir="rtl">در حال آماده‌سازی دستیار…</main>}><AiWorkspacePage /></Suspense>;
}
