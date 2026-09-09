"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    if (response.ok) window.location.assign("/command-center");
    else setError("ورود ناموفق بود. اطلاعات را بررسی کنید.");
    setLoading(false);
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white" dir="rtl">
    <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
      <div><p className="text-sm text-cyan-300">مقر فرماندهی</p><h1 className="mt-2 text-3xl font-bold">ورود به اتاق فرمان</h1><p className="mt-2 text-sm text-slate-400">مدیریت پروژه، تیم و تصمیم‌های اجرایی</p></div>
      <label className="block text-sm">ایمیل<input name="email" type="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3" /></label>
      <label className="block text-sm">رمز عبور<input name="password" type="password" required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3" /></label>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{loading ? "در حال ورود…" : "ورود"}</button>
    </form>
  </main>;
}
