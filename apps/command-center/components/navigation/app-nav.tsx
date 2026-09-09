"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";

const primaryNavigation = [
  { href: "/command-center", label: "اتاق فرمان" },
  { href: "/domains", label: "نقشه دامنه" },
  { href: "/ai", label: "دستیار هوشمند" },
  { href: "/audit", label: "گزارش فعالیت" },
] as const;

const groupedNavigation = [
  {
    label: "پرتفولیو",
    items: [
      { href: "/projects", label: "پروژه‌ها" },
      { href: "/teams", label: "تیم‌ها و افراد" },
      { href: "/backlog", label: "بک‌لاگ" },
      { href: "/risks", label: "ریسک‌ها و موانع" },
    ],
  },
  {
    label: "فرایندها",
    items: [
      { href: "/operations", label: "عملیات محصول" },
      { href: "/finance", label: "فرایندهای مالی" },
      { href: "/admin", label: "کنترل‌های ادمین" },
    ],
  },
  {
    label: "اتاق مدیرعامل",
    items: [
      { href: "/ceo/memory", label: "حافظه مدیرعامل" },
      { href: "/ceo/goals", label: "اهداف و شاخص‌ها" },
      { href: "/ceo/scenarios", label: "سناریوها" },
      { href: "/ceo/proposals", label: "پیشنهادهای تأیید" },
      { href: "/agents", label: "سلامت عامل‌ها" },
    ],
  },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  if (pathname === "/login") return null;

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur" dir="rtl">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
        <Link href="/command-center" className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1 text-slate-950 transition hover:bg-slate-100">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-sm font-black text-cyan-300">م</span>
          <span className="hidden text-sm font-black sm:inline">مقر فرماندهی</span>
        </Link>
        <nav aria-label="ناوبری اصلی" className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {primaryNavigation.map((item) => {
            const active = item.href === "/command-center" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:text-sm ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              >
                {item.label}
              </Link>
            );
          })}
          {groupedNavigation.map((group) => {
            const active = group.items.some((item) => pathname.startsWith(item.href));
            return (
              <details key={group.label} className="group relative">
                <summary className={`cursor-pointer list-none rounded-lg px-2.5 py-2 text-xs font-semibold transition marker:hidden sm:text-sm ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
                  {group.label} <span className="mr-1 text-[10px] opacity-60">⌄</span>
                </summary>
                <div className="absolute right-0 top-full z-50 mt-2 min-w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {group.items.map((item) => {
                    const itemActive = pathname.startsWith(item.href);
                    return <Link key={item.href} href={item.href} className={`block rounded-xl px-3 py-2 text-sm font-semibold ${itemActive ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}>{item.label}</Link>;
                  })}
                </div>
              </details>
            );
          })}
        </nav>
        <Button type="button" variant="outline" onClick={() => void logout()} disabled={loggingOut} className="shrink-0 px-3 text-xs sm:text-sm">
          {loggingOut ? "در حال خروج…" : "خروج"}
        </Button>
      </div>
    </header>
  );
}
