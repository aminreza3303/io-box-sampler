import type { StrategicScenario } from "../../lib/scenario-types";
import { strategicScenarioCatalog } from "../../lib/scenario-catalog";
import { Badge } from "../ui/badge";

const trackLabels = { wallet: "کیف پول", travel: "سفر" } as const;
const laneLabels = {
  "personal-finance": "مالی شخصی",
  experience: "تجربهٔ سفر",
  access: "دسترسی و خدمات سفر",
} as const;

export function ScenarioCatalogSection({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (scenario: StrategicScenario) => void;
}) {
  const tracks: Array<{ id: StrategicScenario["track"]; title: string }> = [
    { id: "wallet", title: "مسیر کیف پول" },
    { id: "travel", title: "مسیر سفر" },
  ];

  return (
    <section aria-labelledby="scenario-catalog-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-cyan-700">کاتالوگ فرضیه‌ها</p>
          <h2 id="scenario-catalog-title" className="mt-1 text-xl font-black">از یک سناریوی مستند شروع کنید</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            کارت فقط فرم را پیش‌پر می‌کند. همهٔ فرض‌ها قابل ویرایش‌اند و گیت تصمیم صرفاً راهنماست؛ هیچ کارت یا گیتی مانع ساخت تحلیل نیست.
          </p>
        </div>
        <Badge tone="info">{strategicScenarioCatalog.length} فرضیهٔ قابل‌انتخاب</Badge>
      </div>

      <div className="mt-6 space-y-7">
        {tracks.map((track) => {
          const trackScenarios = strategicScenarioCatalog.filter((scenario) => scenario.track === track.id);
          const lanes = [...new Set(trackScenarios.map((scenario) => scenario.lane))];

          return (
            <section key={track.id} aria-label={track.title}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-cyan-500" aria-hidden="true" />
                <h3 className="font-black">{track.title}</h3>
                <span className="text-xs text-slate-400">{trackScenarios.length} کارت</span>
              </div>
              <div className="space-y-5">
                {lanes.map((lane) => {
                  const scenarios = trackScenarios.filter((scenario) => scenario.lane === lane);
                  return (
                    <div key={lane}>
                      {track.id === "travel" && <h4 className="mb-2 text-xs font-bold text-slate-500">{laneLabels[lane]}</h4>}
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {scenarios.map((scenario) => {
                          const selected = scenario.id === selectedId;
                          const source = scenario.sourceReferences[0];
                          return (
                            <button
                              key={scenario.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => onSelect(scenario)}
                              className={`flex min-h-full flex-col rounded-2xl border p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 ${selected ? "border-cyan-500 bg-cyan-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-white"}`}
                            >
                              <span className="flex flex-wrap items-center gap-2">
                                <Badge tone="neutral">{trackLabels[scenario.track]}</Badge>
                                <Badge tone="warning">فرضیهٔ سند</Badge>
                              </span>
                              <span className="mt-3 block text-sm font-black leading-6 text-slate-950">{scenario.title}</span>
                              <span className="mt-2 block text-xs leading-6 text-slate-600">{scenario.summary}</span>
                              <span className="mt-3 block text-xs leading-6 text-slate-500">ارزش پیشنهادی: {scenario.valueHypothesis}</span>
                              <span className="mt-3 block border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
                                منبع: {source?.document ?? "سند راهبردی"} · {source?.locator ?? "مرجع سند"}
                              </span>
                              <span className="mt-2 block rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
                                گیت هشدار: {scenario.gate.title} · برای تحلیل مانع ایجاد نمی‌کند.
                              </span>
                              <span className="mt-3 block text-xs font-black text-cyan-800">{selected ? "در فرم انتخاب شده" : "پیش‌پرکردن فرم"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
