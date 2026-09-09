"use client";

import { cn } from "../../lib/utils";

export const phaseOrder = ["PRODUCT", "DESIGN", "DEVELOPMENT", "DELIVERY"] as const;
export type TimelinePhaseType = (typeof phaseOrder)[number];
export type TimelineZoom = "day" | "week" | "month";
export type TimelineDate = Date | string;

export type TimelineRange = { start: TimelineDate; end: TimelineDate };
export type TimelineColumn = {
  key: string;
  index: number;
  label: string;
  start: string;
  end: string;
  left: number;
  width: number;
};
export type PhaseGeometryInput = {
  startDate?: TimelineDate | null;
  endDate?: TimelineDate | null;
  dueDate?: TimelineDate | null;
  startedAt?: TimelineDate | null;
  completedAt?: TimelineDate | null;
};
export type PhaseBarGeometry = {
  left: number;
  width: number;
  clipped: boolean;
  isMarker: boolean;
  start: string;
  end: string;
};

export const phaseLabels: Record<TimelinePhaseType, string> = {
  PRODUCT: "محصول",
  DESIGN: "طراحی",
  DEVELOPMENT: "توسعه",
  DELIVERY: "تحویل",
};

const DAY_MS = 86_400_000;
const MIN_MARKER_WIDTH = 8;

function toUtcDay(value: TimelineDate): Date {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timeline date: ${String(value)}`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function faDate(date: Date, zoom: TimelineZoom): string {
  return new Intl.DateTimeFormat("fa-IR", zoom === "month"
    ? { month: "short", year: "numeric", timeZone: "UTC" }
    : { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

function addMonths(date: Date, count: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

export function buildTimelineColumns(range: TimelineRange, zoom: TimelineZoom): TimelineColumn[] {
  const start = toUtcDay(range.start);
  const end = toUtcDay(range.end);
  if (end <= start) return [];
  const columns: TimelineColumn[] = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const columnStart = new Date(cursor);
    const next = zoom === "day"
      ? new Date(cursor.getTime() + DAY_MS)
      : zoom === "week"
        ? new Date(cursor.getTime() + 7 * DAY_MS)
        : addMonths(cursor, 1);
    const columnEnd = next < end ? next : end;
    const left = ((columnStart.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
    const width = ((columnEnd.getTime() - columnStart.getTime()) / (end.getTime() - start.getTime())) * 100;
    columns.push({
      key: `${dateKey(columnStart)}-${dateKey(columnEnd)}`,
      index: columns.length,
      label: faDate(columnStart, zoom),
      start: dateKey(columnStart),
      end: dateKey(columnEnd),
      left,
      width,
    });
    cursor = columnEnd;
  }
  return columns;
}

export function getPhaseBarGeometry(phase: PhaseGeometryInput, range: TimelineRange): PhaseBarGeometry | null {
  const rangeStart = toUtcDay(range.start);
  const rangeEnd = toUtcDay(range.end);
  if (rangeEnd <= rangeStart) return null;
  const phaseStartValue = phase.startDate ?? phase.startedAt ?? phase.dueDate;
  const phaseEndValue = phase.endDate ?? phase.dueDate ?? phase.completedAt ?? phaseStartValue;
  if (!phaseStartValue || !phaseEndValue) return null;
  const phaseStart = toUtcDay(phaseStartValue);
  const phaseEnd = toUtcDay(phaseEndValue);
  if (phaseEnd < rangeStart || phaseStart >= rangeEnd) return null;
  const clippedStart = phaseStart < rangeStart ? rangeStart : phaseStart;
  const clippedEnd = phaseEnd > rangeEnd ? rangeEnd : phaseEnd;
  const rangeDuration = rangeEnd.getTime() - rangeStart.getTime();
  const left = ((clippedStart.getTime() - rangeStart.getTime()) / rangeDuration) * 100;
  const rawWidth = Math.max(0, ((clippedEnd.getTime() - clippedStart.getTime()) / rangeDuration) * 100);
  const isMarker = rawWidth === 0;
  return {
    left,
    width: isMarker ? MIN_MARKER_WIDTH : rawWidth,
    clipped: phaseStart < rangeStart || phaseEnd > rangeEnd,
    isMarker,
    start: dateKey(clippedStart),
    end: dateKey(clippedEnd),
  };
}

type TimelineGridProps = {
  tasks: Array<Record<string, unknown>>;
  range: TimelineRange;
  zoom: TimelineZoom;
  onSelectTask: (task: Record<string, unknown>) => void;
};

function statusTone(status: string | undefined): string {
  if (status === "COMPLETE" || status === "DONE") return "bg-emerald-400";
  if (status === "BLOCKED") return "bg-rose-400";
  if (status === "IN_PROGRESS") return "bg-cyan-400";
  return "bg-amber-300";
}

export function TimelineGrid({ tasks, range, zoom, onSelectTask }: TimelineGridProps) {
  const columns = buildTimelineColumns(range, zoom);
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="تایم‌لاین پروژه">
    <div className="flex min-w-[780px] border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
      <div className="sticky right-0 z-10 w-72 shrink-0 border-l border-slate-200 bg-slate-50 px-4 py-3">عنوان فعالیت</div>
      <div className="relative flex min-w-0 flex-1" dir="ltr">
        {columns.map((column) => <div key={column.key} className="border-l border-slate-200 px-2 py-3 text-center" style={{ width: `${column.width}%` }} dir="rtl">{column.label}</div>)}
      </div>
    </div>
    <div className="max-h-[570px] overflow-auto">
      {tasks.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">فعالیتی با این فیلتر پیدا نشد.</div> : tasks.map((task) => {
        const phases = Array.isArray(task.phases) ? task.phases as Array<Record<string, unknown>> : [];
        const taskStart = (task.createdAt as string | undefined) ?? range.start;
        const taskEnd = (task.dueDate as string | undefined) ?? range.end;
        return <button key={String(task.id)} type="button" className="group flex min-w-[780px] w-full border-b border-slate-100 text-right hover:bg-cyan-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500" onClick={() => onSelectTask(task)}>
          <span className="sticky right-0 z-10 flex w-72 shrink-0 items-center gap-3 border-l border-slate-100 bg-white px-4 py-3 group-hover:bg-cyan-50/40">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusTone(String(task.status)))} />
            <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{String(task.title ?? "بدون عنوان")}</span><span className="mt-1 block text-xs text-slate-400">{String((task.team as { name?: string } | undefined)?.name ?? "بدون تیم")}</span></span>
          </span>
          <span className="relative min-h-[68px] min-w-0 flex-1" dir="ltr">
            {columns.map((column) => <span key={column.key} className="absolute inset-y-0 border-l border-slate-100" style={{ left: `${column.left}%` }} />)}
            {phaseOrder.map((phaseType, index) => {
              const phase = phases.find((item) => item.phaseType === phaseType) ?? { dueDate: taskEnd, startedAt: index === 0 ? taskStart : null };
              const geometry = getPhaseBarGeometry(phase, range);
              if (!geometry) return null;
              return <span key={phaseType} className={cn("absolute top-4 h-8 rounded-md opacity-90 transition group-hover:opacity-100", statusTone(String(phase.status)), geometry.isMarker && "min-w-2")} style={{ left: `${geometry.left}%`, width: `${geometry.width}%` }} title={`${phaseLabels[phaseType]}: ${String(phase.status ?? "NOT_STARTED")}`}><span className="sr-only">{phaseLabels[phaseType]}</span></span>;
            })}
          </span>
        </button>;
      })}
    </div>
  </div>;
}
