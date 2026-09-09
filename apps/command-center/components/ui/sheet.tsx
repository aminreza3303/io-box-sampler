"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
    <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-slate-950/30" aria-label="بستن پنجره" onClick={onClose} />
    <section className="absolute inset-y-0 left-0 w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl sm:w-[34rem]" dir="rtl">
      <div className="mb-8 flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-slate-900">{title}</h2><Button type="button" variant="ghost" onClick={onClose}>بستن</Button></div>
      {children}
    </section>
  </div>;
}
