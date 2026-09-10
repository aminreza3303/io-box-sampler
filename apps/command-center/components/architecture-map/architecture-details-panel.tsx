import {
  getArchitectureNode,
  type ArchitectureEdge,
  type ArchitectureNode,
} from "../../lib/architecture-map";
import type { DomainGroupId, DomainPriority, DomainStatus } from "../../lib/domain-map";
import { Badge } from "../ui/badge";
import { Sheet } from "../ui/sheet";

export type ArchitectureDetailsPanelProps = {
  selected: ArchitectureNode;
  dependencies: ArchitectureEdge[];
  dependents: ArchitectureEdge[];
  onClose?: () => void;
};

const groupLabels: Record<DomainGroupId, string> = {
  infra: "زیرساخت افقی",
  core: "هستهٔ نئوبانک",
  finance: "محصولات مالی و عملیات",
  ecosystem: "اکوسیستم",
  platform: "پلتفرم کلاینت",
};

const priorityTones: Record<DomainPriority, "danger" | "warning" | "success"> = {
  P0: "danger",
  P1: "warning",
  P2: "warning",
  عرضی: "success",
};

const statusMeta: Record<DomainStatus, { label: string; tone: "success" | "warning" }> = {
  CONFIRMED: { label: "تأییدشده", tone: "success" },
  OPEN_DECISION: { label: "تصمیم باز", tone: "warning" },
};

function RelationshipList({
  edges,
  direction,
  empty,
}: {
  edges: ArchitectureEdge[];
  direction: "dependency" | "dependent";
  empty: string;
}) {
  if (edges.length === 0) {
    return <p className="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">{empty}</p>;
  }

  return (
    <div className="space-y-2">
      {edges.map((edge) => {
        const relatedId = direction === "dependency" ? edge.from : edge.to;
        const related = getArchitectureNode(relatedId);
        return (
          <article key={edge.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-black text-slate-900">{related?.domain.title ?? relatedId}</p>
              <span className="shrink-0 text-[11px] font-bold text-cyan-700">{edge.relationship.label}</span>
            </div>
            <p className="mt-1 text-xs leading-6 text-slate-500">{edge.relationship.explanation}</p>
          </article>
        );
      })}
    </div>
  );
}

function DetailsContent({ selected, dependencies, dependents }: Omit<ArchitectureDetailsPanelProps, "onClose">) {
  const { domain } = selected;
  const status = statusMeta[domain.status];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold text-cyan-600">دامنه انتخاب‌شده</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">{domain.title}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="info">{groupLabels[domain.group]}</Badge>
          <Badge tone={priorityTones[domain.priority]}>{domain.priority}</Badge>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </header>

      <p className="text-sm leading-7 text-slate-600">{domain.summary}</p>

      <section className="rounded-2xl bg-slate-950 p-4 text-slate-200">
        <h3 className="text-sm font-black text-white">قواعد محصول</h3>
        <ul className="mt-3 list-disc space-y-2 pr-5 text-xs leading-6">
          {domain.rules.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-slate-900">وابستگی‌های مستقیم</h3>
        <RelationshipList
          edges={dependencies}
          direction="dependency"
          empty="این دامنه وابستگی مستقیم ثبت‌شده ندارد."
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-slate-900">مصرف‌کنندگان مستقیم</h3>
        <RelationshipList
          edges={dependents}
          direction="dependent"
          empty="هنوز مصرف‌کننده مستقیمی ثبت نشده است."
        />
      </section>
    </div>
  );
}

export function ArchitectureDetailsPanel(props: ArchitectureDetailsPanelProps) {
  const content = (
    <DetailsContent
      selected={props.selected}
      dependencies={props.dependencies}
      dependents={props.dependents}
    />
  );

  if (props.onClose) {
    return (
      <Sheet open onClose={props.onClose} title="جزئیات دامنه">
        {content}
      </Sheet>
    );
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{content}</section>;
}
