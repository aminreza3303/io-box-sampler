"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  architectureEdges,
  architectureFloors,
  architectureNodes,
  getArchitectureNode,
} from "../../lib/architecture-map";
import { filterEdgesToVisibleNodes, resolveVisibleSelection } from "../../lib/architecture-map-page-model";
import { canCreateArchitectureRenderer } from "../../lib/architecture-webgl";
import {
  domainGroupMeta,
  type DomainGroupId,
  type DomainPriority,
  type DomainStatus,
} from "../../lib/domain-map";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { ArchitectureDetailsPanel } from "./architecture-details-panel";
import { ArchitectureFallback } from "./architecture-fallback";
import type { ArchitectureCameraPreset } from "./architecture-scene";

const ArchitectureScene = dynamic(
  () => import("./architecture-scene").then((module) => module.ArchitectureScene),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[560px] place-items-center bg-slate-950 text-sm text-slate-300">
        در حال آماده‌سازی نمای سه‌بعدی…
      </div>
    ),
  },
);

type WebGlState = "checking" | "available" | "unavailable";
type ViewMode = "3d" | "2d";

const cameraLabels: Record<ArchitectureCameraPreset, string> = {
  isometric: "ایزومتریک",
  top: "نمای بالا",
  "selected-floor": "تمرکز روی طبقه",
};

const groupLegendClasses: Record<DomainGroupId, string> = {
  infra: "bg-cyan-400",
  core: "bg-rose-400",
  finance: "bg-orange-400",
  ecosystem: "bg-amber-400",
  platform: "bg-emerald-400",
};

class SceneErrorBoundary extends Component<
  { children: ReactNode; onError: () => void; resetKey: number },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  componentDidUpdate(previousProps: Readonly<{ children: ReactNode; onError: () => void; resetKey: number }>) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ArchitectureMapPage() {
  const [search, setSearch] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState<string | "all">("all");
  const [selectedGroup, setSelectedGroup] = useState<DomainGroupId | "all">("all");
  const [selectedPriority, setSelectedPriority] = useState<DomainPriority | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<DomainStatus | "all">("all");
  const [selectedId, setSelectedId] = useState("wallet");
  const [cameraPreset, setCameraPreset] = useState<ArchitectureCameraPreset>("isometric");
  const [resetToken, setResetToken] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webGlState, setWebGlState] = useState<WebGlState>("checking");
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [sceneRetryToken, setSceneRetryToken] = useState(0);
  const [sceneFailure, setSceneFailure] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const available = canCreateArchitectureRenderer();
    setWebGlState(available ? "available" : "unavailable");
    if (!available) setViewMode("2d");
  }, [sceneRetryToken]);

  const visibleFloorIds = useMemo(
    () => selectedFloorId === "all" ? architectureFloors.map((floor) => floor.id) : [selectedFloorId],
    [selectedFloorId],
  );

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa");
    const floorIds = new Set(visibleFloorIds);
    return architectureNodes.filter((node) => {
      const { domain } = node;
      const matchesSearch = !query || `${domain.title} ${domain.summary} ${domain.rules.join(" ")}`.toLocaleLowerCase("fa").includes(query);
      return floorIds.has(node.floorId)
        && (selectedGroup === "all" || domain.group === selectedGroup)
        && (selectedPriority === "all" || domain.priority === selectedPriority)
        && (selectedStatus === "all" || domain.status === selectedStatus)
        && matchesSearch;
    });
  }, [search, selectedFloorId, selectedGroup, selectedPriority, selectedStatus, visibleFloorIds]);

  const filteredEdges = useMemo(() => {
    return filterEdgesToVisibleNodes(filteredNodes, architectureEdges);
  }, [filteredNodes]);

  useEffect(() => {
    const nextSelection = resolveVisibleSelection(filteredNodes, selectedId);
    if (nextSelection !== selectedId) setSelectedId(nextSelection ?? "");
  }, [filteredNodes, selectedId]);

  const selected = filteredNodes.length > 0
    ? getArchitectureNode(selectedId) ?? getArchitectureNode(filteredNodes[0].id)
    : undefined;
  const dependencies = useMemo(
    () => selected ? architectureEdges.filter((edge) => edge.to === selected.id) : [],
    [selected],
  );
  const dependents = useMemo(
    () => selected ? architectureEdges.filter((edge) => edge.from === selected.id) : [],
    [selected],
  );

  const selectNode = useCallback((id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1279px)").matches) setMobileDetailsOpen(true);
  }, []);

  const selectFloor = useCallback((floorId: string) => {
    setSelectedFloorId(floorId);
  }, []);

  const handleSceneError = useCallback(() => {
    setSceneFailure(true);
    setViewMode("2d");
  }, []);

  const retryScene = () => {
    setSceneFailure(false);
    setWebGlState("checking");
    setSceneRetryToken((token) => token + 1);
    setViewMode("3d");
  };

  const resetMap = () => {
    setSearch("");
    setSelectedFloorId("all");
    setSelectedGroup("all");
    setSelectedPriority("all");
    setSelectedStatus("all");
    setSelectedId("wallet");
    setCameraPreset("isometric");
    setResetToken((token) => token + 1);
  };

  const activeFloorLabel = selectedFloorId === "all"
    ? "همهٔ طبقه‌ها"
    : `طبقهٔ ${architectureFloors.find((floor) => floor.id === selectedFloorId)?.label ?? selectedFloorId}`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8" dir="rtl">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <header className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-cyan-300">مقر فرماندهی / معماری محصول</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">نقشه تعاملی سه‌بعدی</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                این نقشه معماری محصول و جریان وابستگی میان دامنه‌ها را نمایش می‌دهد؛ داده‌ها بیانگر ترافیک زنده یا پایش لحظه‌ای سامانه نیستند.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">۲۸ دامنه</Badge>
              <Badge tone="warning">۵ طبقه</Badge>
              <Badge tone="success">{architectureEdges.length.toLocaleString("fa-IR")} رابطه</Badge>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="md:col-span-2 xl:col-span-1">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">جست‌وجوی دامنه</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="عنوان، توضیح یا قاعده…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">گروه</span>
              <Select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value as DomainGroupId | "all")} className="w-full">
                <option value="all">همهٔ گروه‌ها</option>
                {domainGroupMeta.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
              </Select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">اولویت</span>
              <Select value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value as DomainPriority | "all")} className="w-full">
                <option value="all">همهٔ اولویت‌ها</option>
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="عرضی">عرضی</option>
              </Select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">وضعیت</span>
              <Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as DomainStatus | "all")} className="w-full">
                <option value="all">همهٔ وضعیت‌ها</option>
                <option value="CONFIRMED">تأییدشده</option>
                <option value="OPEN_DECISION">تصمیم باز</option>
              </Select>
            </label>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-xs font-bold text-slate-600">ایزوله‌کردن طبقه</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant={selectedFloorId === "all" ? "primary" : "outline"} onClick={() => setSelectedFloorId("all")} aria-pressed={selectedFloorId === "all"}>همهٔ طبقه‌ها</Button>
              {architectureFloors.map((floor) => (
                <Button key={floor.id} type="button" variant={selectedFloorId === floor.id ? "primary" : "outline"} onClick={() => setSelectedFloorId(floor.id)} aria-pressed={selectedFloorId === floor.id}>
                  {floor.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2" aria-label="انتخاب نوع نمایش">
                  <Button type="button" variant={viewMode === "3d" ? "primary" : "outline"} disabled={webGlState !== "available"} onClick={() => setViewMode("3d")} aria-pressed={viewMode === "3d"}>نمای سه‌بعدی</Button>
                  <Button type="button" variant={viewMode === "2d" ? "primary" : "outline"} onClick={() => setViewMode("2d")} aria-pressed={viewMode === "2d"}>نمای دوبعدی</Button>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="کنترل دوربین">
                  {(Object.keys(cameraLabels) as ArchitectureCameraPreset[]).map((preset) => (
                    <Button key={preset} type="button" variant={cameraPreset === preset ? "primary" : "outline"} disabled={viewMode !== "3d"} onClick={() => setCameraPreset(preset)} aria-pressed={cameraPreset === preset}>
                      {cameraLabels[preset]}
                    </Button>
                  ))}
                  <Button type="button" variant="ghost" onClick={resetMap}>بازنشانی</Button>
                </div>
              </div>
            </div>

            {(webGlState === "unavailable" || sceneFailure) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p>{sceneFailure ? "نمای سه‌بعدی با خطا روبه‌رو شد؛ نمای دوبعدی فعال است." : "WebGL در این مرورگر در دسترس نیست؛ نمای دوبعدی فعال است."}</p>
                <Button type="button" variant="outline" onClick={retryScene}>تلاش دوباره</Button>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-xl" style={{ minHeight: 560 }}>
              {filteredNodes.length === 0 && (
                <div className="grid min-h-[560px] place-items-center p-6 text-center text-sm text-slate-300" role="status">
                  هیچ دامنه‌ای با فیلترهای فعلی پیدا نشد؛ فیلترها را تغییر دهید.
                </div>
              )}
              {filteredNodes.length > 0 && viewMode === "3d" && webGlState === "checking" && (
                <div className="grid min-h-[560px] place-items-center text-sm text-slate-300">در حال بررسی WebGL…</div>
              )}
              {filteredNodes.length > 0 && viewMode === "3d" && webGlState === "available" && selected && (
                <SceneErrorBoundary onError={handleSceneError} resetKey={sceneRetryToken}>
                  <ArchitectureScene
                    key={sceneRetryToken}
                    visibleFloorIds={visibleFloorIds}
                    nodes={filteredNodes}
                    edges={filteredEdges}
                    selectedId={selected.id}
                    selectedFloorId={selectedFloorId === "all" ? selected.floorId : selectedFloorId}
                    onSelectNode={selectNode}
                    onSelectFloor={selectFloor}
                    onSceneError={handleSceneError}
                    cameraPreset={cameraPreset}
                    resetToken={resetToken}
                    reducedMotion={reducedMotion}
                  />
                </SceneErrorBoundary>
              )}
              {filteredNodes.length > 0 && viewMode === "2d" && selected && (
                <ArchitectureFallback nodes={filteredNodes} edges={filteredEdges} selectedId={selected.id} onSelectNode={selectNode} />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
              <span><strong className="text-slate-900">{activeFloorLabel}</strong> · {filteredNodes.length.toLocaleString("fa-IR")} دامنه · {filteredEdges.length.toLocaleString("fa-IR")} رابطه</span>
              {selected && <button type="button" className="font-black text-cyan-700 xl:hidden" onClick={() => setMobileDetailsOpen(true)}>نمایش جزئیات {selected.domain.title}</button>}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="راهنمای نقشه">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h2 className="text-sm font-black">رنگ گروه‌ها</h2>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    {domainGroupMeta.map((group) => (
                      <span key={group.id} className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <span className={`h-2.5 w-2.5 rounded-full ${groupLegendClasses[group.id]}`} />{group.title}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-sm font-black">وضعیت کابل‌ها</h2>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-2"><span className="h-0.5 w-8 bg-cyan-400" />مرتبط با دامنه انتخاب‌شده</span>
                    <span className="inline-flex items-center gap-2"><span className="h-px w-8 bg-slate-400" />رابطهٔ غیرفعال</span>
                    <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-amber-400" />تصمیم باز</span>
                  </div>
                </div>
              </div>
            </section>
          </section>

          <aside className="hidden xl:block xl:self-start">
            <div className="sticky top-24">
              {selected ? (
                <ArchitectureDetailsPanel selected={selected} dependencies={dependencies} dependents={dependents} />
              ) : (
                <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-7 text-slate-500">
                  هیچ دامنه‌ای با فیلترهای فعلی برای نمایش جزئیات انتخاب نشده است.
                </section>
              )}
            </div>
          </aside>
        </div>
      </div>

      <div className="xl:hidden">
        {mobileDetailsOpen && selected && (
          <ArchitectureDetailsPanel
            selected={selected}
            dependencies={dependencies}
            dependents={dependents}
            onClose={() => setMobileDetailsOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
