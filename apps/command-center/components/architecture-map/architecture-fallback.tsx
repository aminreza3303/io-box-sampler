import {
  architectureFloors,
  type ArchitectureEdge,
  type ArchitectureNode,
} from "../../lib/architecture-map";
import type { DomainGroupId } from "../../lib/domain-map";
import { Badge } from "../ui/badge";

export type ArchitectureFallbackProps = {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  selectedId: string;
  onSelectNode: (id: string) => void;
};

const groupStyles: Record<DomainGroupId, string> = {
  infra: "border-cyan-300 bg-cyan-50 text-cyan-950",
  core: "border-rose-300 bg-rose-50 text-rose-950",
  finance: "border-orange-300 bg-orange-50 text-orange-950",
  ecosystem: "border-amber-300 bg-amber-50 text-amber-950",
  platform: "border-emerald-300 bg-emerald-50 text-emerald-950",
};

export function ArchitectureFallback({ nodes, edges, selectedId, onSelectNode }: ArchitectureFallbackProps) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const visibleFloors = architectureFloors.filter((floor) => nodes.some((node) => node.floorId === floor.id));
  const selectedRelationships = edges.filter((edge) => edge.from === selectedId || edge.to === selectedId);

  return (
    <div className="min-h-[560px] bg-slate-950 p-4 text-white sm:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4">
        <div>
          <h2 className="font-black text-cyan-100">نمای دوبعدی سازگار</h2>
          <p className="mt-1 text-xs leading-6 text-slate-300">همهٔ دامنه‌ها و ارتباط‌های فیلترشده بدون نیاز به WebGL در دسترس‌اند.</p>
        </div>
        <Badge tone="info">{edges.length.toLocaleString("fa-IR")} ارتباط</Badge>
      </div>

      {nodes.length === 0 ? (
        <div className="mt-5 grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-400">
          دامنه‌ای با فیلترهای فعلی پیدا نشد.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {visibleFloors.map((floor) => {
            const floorNodes = nodes.filter((node) => node.floorId === floor.id);
            return (
              <section key={floor.id} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-black">طبقهٔ {floor.label}</h3>
                  <span className="text-xs text-slate-400">{floorNodes.length.toLocaleString("fa-IR")} دامنه</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {floorNodes.map((node) => {
                    const selected = node.id === selectedId;
                    const relationshipCount = edges.filter((edge) => edge.from === node.id || edge.to === node.id).length;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelectNode(node.id)}
                        className={`rounded-xl border p-3 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? "border-cyan-300 bg-cyan-300 text-slate-950 ring-4 ring-cyan-300/20" : groupStyles[node.domain.group]}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <strong className="text-sm">{node.domain.title}</strong>
                          <span className="text-[10px] font-black">{node.domain.priority}</span>
                        </span>
                        <span className={`mt-2 block text-[11px] ${selected ? "text-slate-700" : "opacity-70"}`}>
                          {relationshipCount.toLocaleString("fa-IR")} ارتباط در نمای فعلی
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selectedRelationships.length > 0 && (
        <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <h3 className="font-black">راهنمای اتصال‌های دامنه انتخاب‌شده</h3>
          <ul className="mt-3 space-y-2 text-xs leading-6 text-slate-300">
            {selectedRelationships.map((edge) => {
              const from = nodes.find((node) => node.id === edge.from);
              const to = nodes.find((node) => node.id === edge.to);
              if (!from || !to || !nodeIds.has(from.id) || !nodeIds.has(to.id)) return null;
              return (
                <li key={edge.id} className="rounded-xl bg-slate-800 px-3 py-2">
                  <strong className="text-white">{from.domain.title}</strong>
                  <span className="mx-2 text-cyan-300" aria-hidden="true">←</span>
                  <strong className="text-white">{to.domain.title}</strong>
                  <span className="mr-2 text-slate-400">— {edge.relationship.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
