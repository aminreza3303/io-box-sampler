"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "./button";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const dialog = closeRef.current?.closest('[role="dialog"]');
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("disabled")) : [];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); previousFocus.current?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
    <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-slate-950/30" aria-label="بستن پنجره" onClick={onClose} />
    <section className="absolute inset-y-0 left-0 w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl sm:w-[34rem]" dir="rtl">
      <div className="mb-8 flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-slate-900">{title}</h2><Button ref={closeRef} type="button" variant="ghost" onClick={onClose}>بستن</Button></div>
      {children}
    </section>
  </div>;
}
