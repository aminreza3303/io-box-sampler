"use client";

import { useEffect, useState } from "react";
import type {
  PriorityCriterion,
  PriorityWeight,
  ScenarioBenefitDriver,
  ScenarioCaseInput,
  ScenarioEvidence,
  ScenarioKpi,
  ScenarioMilestone,
  ScenarioMoneyConversion,
  ScenarioRequestDraft,
  StrategicScenario,
} from "../../lib/scenario-types";
import { domainGroups, domains } from "../../lib/domain-map";
import { Badge } from "../ui/badge";

type ProjectOption = { id: string; name: string; code?: string };
type TeamOption = { id: string; name: string; projectId?: string | null; project?: { name: string } | null };
type EvidenceFieldName = ScenarioRequestDraft["fieldEvidence"][number]["field"];
type CaseEvidenceFieldName = ScenarioCaseInput["fieldEvidence"][number]["field"];

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100";
const labelClass = "block text-xs font-bold leading-5 text-slate-700";
const evidenceKinds = [
  ["document-hypothesis", "فرضیهٔ سند"],
  ["internal-data", "دادهٔ داخلی"],
  ["owner-estimate", "برآورد مالک"],
  ["approved", "مصوب"],
  ["model-default", "فرض اولیهٔ مدل"],
] as const;

function newEvidence(kind: ScenarioEvidence["kind"]): ScenarioEvidence {
  switch (kind) {
    case "document-hypothesis":
      return { kind, label: "فرضیهٔ سند", source: { document: "", locator: "", label: "فرضیهٔ سند" }, confidence: null };
    case "internal-data":
      return { kind, label: "دادهٔ داخلی", source: "", recordedAt: "", owner: "", confidence: null };
    case "owner-estimate":
      return { kind, label: "برآورد مالک", source: null, owner: "", confidence: null };
    case "approved":
      return { kind, label: "مصوب", source: null, owner: "", recordedAt: "", confidence: null };
    case "model-default":
      return { kind, label: "فرض اولیهٔ مدل", source: "", confidence: null };
  }
}

function TextField({ label, value, onChange, placeholder, type = "text", maxLength }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return <label className={labelClass}>{label}<input type={type} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
}

function TextAreaField({ label, value, onChange, rows = 3, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return <label className={labelClass}>{label}<textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputClass} resize-y leading-6`} /></label>;
}

function NullableNumberField({ label, value, onChange, min, max, step = "any", placeholder = "ثبت نشده" }: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  placeholder?: string;
}) {
  return <label className={labelClass}>{label}<input type="number" min={min} max={max} step={step} value={value ?? ""} placeholder={placeholder} onChange={(event) => { if (event.target.value === "") onChange(null); else { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(next); } }} className={inputClass} /></label>;
}

function RequiredNumberField({ label, value, onChange, min, max, step = "any", suffix }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  suffix?: string;
}) {
  const [draft, setDraft] = useState(Number.isFinite(value) ? String(value) : "");
  useEffect(() => setDraft(Number.isFinite(value) ? String(value) : ""), [value]);
  return <label className={labelClass}>{label}{suffix && <span className="mr-1 font-normal text-slate-500">({suffix})</span>}<input type="number" min={min} max={max} step={step} value={draft} onChange={(event) => { setDraft(event.target.value); const next = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(next)) onChange(next); }} onBlur={() => { if (draft === "" || !Number.isFinite(Number(draft))) setDraft(String(value)); }} className={inputClass} /></label>;
}

function ConfidenceField({ value, onChange }: { value: "low" | "medium" | "high" | null; onChange: (value: "low" | "medium" | "high" | null) => void }) {
  return <label className={labelClass}>اطمینان<select value={value ?? ""} onChange={(event) => onChange(event.target.value ? event.target.value as "low" | "medium" | "high" : null)} className={inputClass}><option value="">ثبت نشده</option><option value="low">پایین</option><option value="medium">متوسط</option><option value="high">بالا</option></select></label>;
}

function EvidenceEditor({ label, value, onChange }: { label: string; value: ScenarioEvidence | null; onChange: (value: ScenarioEvidence | null) => void }) {
  const confidence = value && value.kind !== "model-default" ? value.confidence : null;
  const updateConfidence = (next: "low" | "medium" | "high" | null) => {
    if (!value || value.kind === "model-default") return;
    onChange({ ...value, confidence: next });
  };

  return <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <legend className="px-1 text-[11px] font-bold text-slate-600">منشأ / اطمینان · {label}</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>نوع منشأ<select value={value?.kind ?? ""} onChange={(event) => onChange(event.target.value ? newEvidence(event.target.value as ScenarioEvidence["kind"]) : null)} className={inputClass}><option value="">ثبت نشده</option>{evidenceKinds.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
      {value && value.kind !== "model-default" && <ConfidenceField value={confidence} onChange={updateConfidence} />}
    </div>
    {value?.kind === "document-hypothesis" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><TextField label="سند" value={value.source.document} onChange={(document) => onChange({ ...value, source: { ...value.source, document } })} /><TextField label="ارجاع / بخش" value={value.source.locator} onChange={(locator) => onChange({ ...value, source: { ...value.source, locator } })} /></div>}
    {value?.kind === "internal-data" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><TextField label="شرح منبع داده" value={value.source} onChange={(source) => onChange({ ...value, source })} /><TextField label="تاریخ ثبت" type="date" value={value.recordedAt} onChange={(recordedAt) => onChange({ ...value, recordedAt })} /><TextField label="مالک داده" value={value.owner} onChange={(owner) => onChange({ ...value, owner })} /></div>}
    {value?.kind === "owner-estimate" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><TextField label="شرح / منبع برآورد" value={value.source ?? ""} onChange={(source) => onChange({ ...value, source: source || null })} /><TextField label="مالک برآورد" value={value.owner} onChange={(owner) => onChange({ ...value, owner })} /></div>}
    {value?.kind === "approved" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><TextField label="مرجع مصوبه" value={value.source ?? ""} onChange={(source) => onChange({ ...value, source: source || null })} /><TextField label="مالک" value={value.owner} onChange={(owner) => onChange({ ...value, owner })} /><TextField label="تاریخ ثبت" type="date" value={value.recordedAt} onChange={(recordedAt) => onChange({ ...value, recordedAt })} /></div>}
    {value?.kind === "model-default" && <div className="mt-3"><TextField label="توضیح فرض مدل" value={value.source} onChange={(source) => onChange({ ...value, source })} /><Badge tone="info" className="mt-2">فرض اولیهٔ مدل</Badge></div>}
  </fieldset>;
}

function EvidenceBadge({ evidence }: { evidence: ScenarioEvidence | null }) {
  if (!evidence) return <Badge tone="neutral">منشأ ثبت نشده</Badge>;
  return <Badge tone={evidence.kind === "model-default" ? "info" : evidence.kind === "document-hypothesis" ? "warning" : "neutral"}>{evidence.label}</Badge>;
}

function Section({ title, description, children, defaultOpen = true }: { title: string; description?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <summary className="cursor-pointer list-none px-4 py-4 sm:px-5"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-base font-black text-slate-950">{title}</span><span aria-hidden="true" className="text-xs text-slate-400">نمایش / بستن</span></span>{description && <span className="mt-1 block text-xs leading-6 text-slate-500">{description}</span>}</summary>
    <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">{children}</div>
  </details>;
}

function modelEvidenceForField(fields: ScenarioCaseInput["fieldEvidence"], field: CaseEvidenceFieldName) {
  return fields.find((item) => item.field === field)?.evidence ?? null;
}

function requestEvidenceForField(fields: ScenarioRequestDraft["fieldEvidence"], field: EvidenceFieldName) {
  return fields.find((item) => item.field === field)?.evidence ?? null;
}

function newId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

type PendingConversion = { originalCurrency: string; originalAmount: string; convertedAmount: string; rate: string; rateDate: string; source: string };
const emptyConversion: PendingConversion = { originalCurrency: "", originalAmount: "", convertedAmount: "", rate: "", rateDate: "", source: "" };

function conversionKey(field: ScenarioMoneyConversion["field"], benefitDriverId?: string) {
  return field === "benefitNetContribution" ? `${field}:${benefitDriverId ?? ""}` : field;
}

function MoneyConversionEditor({ caseInput, field, benefitDriverId, onChange }: {
  caseInput: ScenarioCaseInput;
  field: ScenarioMoneyConversion["field"];
  benefitDriverId?: string;
  onChange: (conversions: ScenarioMoneyConversion[], convertedAmount?: number) => void;
}) {
  const conversion = caseInput.moneyConversions.find((item) => item.field === field && (field !== "benefitNetContribution" || item.field === "benefitNetContribution" && item.benefitDriverId === benefitDriverId));
  const [pending, setPending] = useState<PendingConversion | null>(null);
  const initial: PendingConversion = conversion ? {
    originalCurrency: conversion.originalCurrency,
    originalAmount: String(conversion.originalAmount),
    convertedAmount: String(conversion.convertedAmount),
    rate: String(conversion.rate),
    rateDate: conversion.rateDate,
    source: conversion.source,
  } : emptyConversion;
  const draft = pending ?? initial;
  const key = conversionKey(field, benefitDriverId);

  function save() {
    const originalAmount = Number(draft.originalAmount);
    const convertedAmount = Number(draft.convertedAmount);
    const rate = Number(draft.rate);
    if (!draft.originalCurrency.trim() || !draft.originalAmount.trim() || !draft.convertedAmount.trim() || !draft.rate.trim() || !draft.rateDate || !draft.source.trim() || !Number.isFinite(originalAmount) || !Number.isFinite(convertedAmount) || !Number.isFinite(rate)) return;
    const common = { originalCurrency: draft.originalCurrency, originalAmount, convertedAmount, rate, rateDate: draft.rateDate, source: draft.source };
    const item: ScenarioMoneyConversion = field === "benefitNetContribution"
      ? { field, benefitDriverId: benefitDriverId ?? "", ...common }
      : { field, ...common };
    const conversions = caseInput.moneyConversions.filter((existing) => conversionKey(existing.field, existing.field === "benefitNetContribution" ? existing.benefitDriverId : undefined) !== key);
    onChange([...conversions, item], convertedAmount);
    setPending(null);
  }

  function remove() {
    onChange(caseInput.moneyConversions.filter((item) => conversionKey(item.field, item.field === "benefitNetContribution" ? item.benefitDriverId : undefined) !== key));
    setPending(null);
  }

  return <div className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/50 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-cyan-900">تبدیل دستی ارز {conversion && <span className="font-normal">· تبدیل ثبت‌شده</span>}</p>{conversion && <button type="button" onClick={remove} className="text-xs font-bold text-rose-700 underline">حذف فرادادهٔ تبدیل</button>}</div>
    <p className="mt-1 text-[11px] leading-5 text-slate-600">مبلغ تبدیل‌شده، نرخ، تاریخ و منبع را خودتان وارد کنید؛ تبدیل خودکار انجام نمی‌شود.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <TextField label="ارز مبدأ" value={draft.originalCurrency} onChange={(originalCurrency) => setPending({ ...draft, originalCurrency })} placeholder="مثلاً USD" />
      <TextField label="مبلغ مبدأ" type="number" value={draft.originalAmount} onChange={(originalAmount) => setPending({ ...draft, originalAmount })} />
      <TextField label="مبلغ تبدیل‌شده در ارز سناریو" type="number" value={draft.convertedAmount} onChange={(convertedAmount) => setPending({ ...draft, convertedAmount })} />
      <TextField label="نرخ تبدیل دستی" type="number" value={draft.rate} onChange={(rate) => setPending({ ...draft, rate })} />
      <TextField label="تاریخ نرخ" type="date" value={draft.rateDate} onChange={(rateDate) => setPending({ ...draft, rateDate })} />
      <TextField label="منبع نرخ" value={draft.source} onChange={(source) => setPending({ ...draft, source })} />
    </div>
    <button type="button" onClick={save} className="mt-3 rounded-lg border border-cyan-300 bg-white px-3 py-2 text-xs font-bold text-cyan-900 hover:bg-cyan-100">ثبت فرادادهٔ تبدیل دستی</button>
  </div>;
}

const caseEvidenceLabels: Array<{ field: CaseEvidenceFieldName; label: string }> = [
  { field: "effortAdjustmentPercent", label: "تعدیل effort" },
  { field: "riskReservePercent", label: "ذخیرهٔ ریسک" },
  { field: "teamCount", label: "تعداد تیم" },
  { field: "weeklyCapacityPerTeam", label: "ظرفیت هفتگی" },
  { field: "phaseShares", label: "سهم فازها" },
  { field: "personDayRate", label: "نرخ نفر-روز" },
  { field: "oneTimeExternalCost", label: "هزینهٔ اولیه" },
  { field: "monthlyOperatingCost", label: "هزینهٔ ماهانه" },
];

const requestEvidenceLabels: Array<{ field: EvidenceFieldName; label: string }> = [
  { field: "catalogScenarioId", label: "ایدهٔ کاتالوگ" },
  { field: "domainIds", label: "دامنه‌های انتخابی" },
  { field: "impactDepth", label: "عمق اثر" },
  { field: "currency", label: "ارز سناریو" },
  { field: "horizonMonths", label: "افق زمانی" },
  { field: "teamIds", label: "تیم‌های انتخابی" },
  { field: "kpis", label: "شاخص‌های کلیدی" },
  { field: "milestones", label: "نقاط عطف" },
  { field: "guardrails", label: "خطوط قرمز" },
  { field: "risks", label: "ریسک‌ها" },
  { field: "priorityCriteria", label: "معیارهای اولویت" },
  { field: "priorityWeights", label: "وزن‌های اولویت" },
];

const phaseItems: Array<{ id: keyof ScenarioCaseInput["phaseShares"]; title: string }> = [
  { id: "product", title: "محصول" },
  { id: "design", title: "طراحی" },
  { id: "development", title: "توسعه" },
  { id: "delivery", title: "تحویل" },
];

function defaultEvidence(source: string): ScenarioEvidence {
  return { kind: "model-default", label: "فرض اولیهٔ مدل", source, confidence: null };
}

function catalogEvidence(scenario: StrategicScenario): ScenarioEvidence {
  const reference = scenario.sourceReferences[0] ?? { document: "سند راهبردی", locator: scenario.id, label: "فرضیهٔ سند" as const };
  return { kind: "document-hypothesis", label: "فرضیهٔ سند", source: reference, confidence: null };
}

function createCaseInput(id: ScenarioCaseInput["id"], name: string, scenario?: StrategicScenario): ScenarioCaseInput {
  return {
    id,
    name,
    effortAdjustmentPercent: 0,
    riskReservePercent: 15,
    manualTeamCount: 2,
    weeklyCapacityPerTeam: 5,
    phaseShares: { product: 0.1, design: 0.2, development: 0.55, delivery: 0.15 },
    effortOverrides: [],
    fieldEvidence: caseEvidenceLabels.map(({ field, label }) => ({ field, evidence: defaultEvidence(`${label} یک مقدار اولیهٔ مدل است و باید با داده یا برآورد مالک جایگزین شود.`) })),
    personDayRate: null,
    oneTimeExternalCost: null,
    monthlyOperatingCost: null,
    benefitDrivers: (scenario?.benefitDrivers ?? []).map((driver) => ({ ...driver })),
    moneyConversions: [],
  };
}

export function createScenarioRequestDraft(scenario?: StrategicScenario): ScenarioRequestDraft {
  const hypothesis = scenario ? catalogEvidence(scenario) : null;
  const commonEvidence = (field: EvidenceFieldName, label: string): ScenarioEvidence => {
    if (scenario && field === "catalogScenarioId") return hypothesis!;
    if (scenario && ["domainIds", "kpis", "milestones", "guardrails", "risks", "priorityCriteria", "priorityWeights"].includes(field)) return hypothesis!;
    return defaultEvidence(`${label} در این پیش‌نویس یک فرض اولیه است و پیش از تصمیم باید بازبینی شود.`);
  };
  const fieldEvidence = requestEvidenceLabels
    .filter(({ field }) => field !== "catalogScenarioId" || scenario !== undefined)
    .map(({ field, label }) => ({ field, evidence: commonEvidence(field, label) }));
  const description = scenario
    ? `${scenario.summary}\n\nفرض ارزش: ${scenario.valueHypothesis}`
    : "";

  return {
    ...(scenario ? { catalogScenarioId: scenario.id } : {}),
    title: scenario?.title ?? "سناریوی جدید",
    description,
    domainIds: scenario ? [...scenario.domainIds] : ["transfer"],
    projectIds: [],
    teamIds: [],
    impactDepth: "direct",
    currency: "TOMAN",
    horizonMonths: 12,
    cases: [
      createCaseInput("conservative", "محتاطانه", scenario),
      createCaseInput("base", "پایه", scenario),
      createCaseInput("optimistic", "خوش‌بینانه", scenario),
    ],
    kpis: (scenario?.kpis ?? []).map((kpi) => ({ ...kpi })),
    gateDecision: { decision: null, reason: "", evidence: "", owner: "", reviewDate: null },
    milestones: (scenario?.milestones ?? []).map((milestone) => ({ ...milestone })),
    guardrails: [...(scenario?.guardrails ?? [])],
    risks: [...(scenario?.risks ?? [])],
    priorityCriteria: (scenario?.priority?.criteria ?? []).map((criterion) => ({ ...criterion })),
    priorityWeights: (scenario?.priority?.weights ?? []).map((weight) => ({ ...weight })),
    fieldEvidence,
  };
}

function makeBlankKpi(): ScenarioKpi {
  return {
    id: newId("kpi"),
    name: "شاخص جدید",
    baseline: null,
    target: null,
    unit: "واحد",
    operator: "gte",
    measurementWindow: "بازهٔ سنجش را مشخص کنید",
    actual: null,
    actualAt: null,
    actualSource: null,
    owner: "مالک سنجش را مشخص کنید",
    guardrail: false,
    source: null,
  };
}

function makeBlankMilestone(): ScenarioMilestone {
  return {
    id: newId("milestone"),
    title: "نقطهٔ عطف جدید",
    stage: "مرحلهٔ بررسی",
    owner: "مالک را مشخص کنید",
    targetDay: null,
    targetDate: null,
    entryCriteria: "",
    exitCriteria: "",
    reviewDate: null,
  };
}

function makeBlankCriterion(): PriorityCriterion {
  return { id: newId("criterion"), label: "معیار جدید", score: null, direction: "higher-is-better", source: null };
}

function makeBlankDriver(): ScenarioBenefitDriver {
  return { id: newId("benefit"), name: "محرک منفعت جدید", monthlyUnits: null, netContributionPerUnit: null, startMonth: null, probabilityPercent: null, source: null };
}

function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) {
  return <label className={labelClass}>{label}<input type="date" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} className={inputClass} /></label>;
}

function EditableTextList({ title, values, onChange, placeholder }: { title: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold">{title}</p><button type="button" onClick={() => onChange([...values, "مورد جدید را ویرایش کنید"])} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold hover:bg-slate-50">افزودن</button></div>
    {values.map((item, index) => <div key={`${title}-${index}`} className="flex gap-2"><input value={item} onChange={(event) => onChange(values.map((current, itemIndex) => itemIndex === index ? event.target.value : current))} placeholder={placeholder} className={inputClass} /><button type="button" aria-label={`حذف ${title}`} onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} className="mt-1.5 rounded-lg px-3 text-sm font-black text-rose-700 hover:bg-rose-50">×</button></div>)}
    {!values.length && <p className="text-xs text-slate-400">موردی ثبت نشده است.</p>}
  </div>;
}

function formatEvidenceField(field: EvidenceFieldName) {
  return requestEvidenceLabels.find((item) => item.field === field)?.label ?? field;
}

function isValidPhaseShares(shares: ScenarioCaseInput["phaseShares"]) {
  const total = Object.values(shares).reduce((sum, share) => sum + share, 0);
  return Math.abs(total - 1) <= 1e-8;
}

export function ScenarioAssumptionsForm({
  value,
  projects,
  teams,
  submitting,
  onChange,
  onAnalyze,
}: {
  value: ScenarioRequestDraft;
  projects: ProjectOption[];
  teams: TeamOption[];
  submitting: boolean;
  onChange: (next: ScenarioRequestDraft) => void;
  onAnalyze: () => void;
}) {
  const [domainQuery, setDomainQuery] = useState("");
  const [openCases, setOpenCases] = useState<Record<string, boolean>>({ base: true });
  const updateDraft = (patch: Partial<ScenarioRequestDraft>) => onChange({ ...value, ...patch });
  const updateCase = (caseId: string, patch: Partial<ScenarioCaseInput>) => updateDraft({
    cases: value.cases.map((scenarioCase) => scenarioCase.id === caseId ? { ...scenarioCase, ...patch } : scenarioCase),
  });
  const updateRequestEvidence = (field: EvidenceFieldName, evidence: ScenarioEvidence | null) => {
    const remaining = value.fieldEvidence.filter((item) => item.field !== field);
    const fallback = defaultEvidence(`${formatEvidenceField(field)} هنوز منبع مشخصی ندارد؛ این فرض اولیه را بازبینی کنید.`);
    updateDraft({ fieldEvidence: [...remaining, { field, evidence: evidence ?? fallback }] });
  };
  const updateCaseEvidence = (caseId: string, field: CaseEvidenceFieldName, evidence: ScenarioEvidence | null) => {
    const scenarioCase = value.cases.find((item) => item.id === caseId);
    if (!scenarioCase) return;
    const remaining = scenarioCase.fieldEvidence.filter((item) => item.field !== field);
    const fallback = defaultEvidence(`${caseEvidenceLabels.find((item) => item.field === field)?.label ?? field} هنوز منبع مشخصی ندارد؛ این فرض اولیه را بازبینی کنید.`);
    updateCase(caseId, { fieldEvidence: [...remaining, { field, evidence: evidence ?? fallback }] });
  };
  const updateBenefitDriver = (caseInput: ScenarioCaseInput, driverId: string, patch: Partial<ScenarioBenefitDriver>) => updateCase(caseInput.id, {
    benefitDrivers: caseInput.benefitDrivers.map((driver) => driver.id === driverId ? { ...driver, ...patch } : driver),
  });
  const updateKpi = (kpiId: string, patch: Partial<ScenarioKpi>) => updateDraft({
    kpis: value.kpis.map((kpi) => kpi.id === kpiId ? { ...kpi, ...patch } : kpi),
  });
  const updateMilestone = (milestoneId: string, patch: Partial<ScenarioMilestone>) => updateDraft({
    milestones: value.milestones.map((milestone) => milestone.id === milestoneId ? { ...milestone, ...patch } : milestone),
  });
  const updateCriterion = (criterionId: string, patch: Partial<PriorityCriterion>) => updateDraft({
    priorityCriteria: value.priorityCriteria.map((criterion) => criterion.id === criterionId ? { ...criterion, ...patch } : criterion),
  });
  const updateWeight = (criterionId: string, patch: Partial<PriorityWeight>) => updateDraft({
    priorityWeights: value.priorityWeights.map((weight) => weight.criterionId === criterionId ? { ...weight, ...patch } : weight),
  });
  const updateCostConversion = (
    caseId: string,
    field: Exclude<ScenarioMoneyConversion["field"], "benefitNetContribution">,
    conversions: ScenarioMoneyConversion[],
    convertedAmount?: number,
  ) => {
    const amount = typeof convertedAmount === "number" && Number.isFinite(convertedAmount) ? convertedAmount : null;
    const patch: Partial<ScenarioCaseInput> = { moneyConversions: conversions };
    if (field === "personDayRate") patch.personDayRate = amount;
    if (field === "oneTimeExternalCost") patch.oneTimeExternalCost = amount;
    if (field === "monthlyOperatingCost") patch.monthlyOperatingCost = amount;
    updateCase(caseId, patch);
  };
  const toggleId = (current: string[], id: string) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  const phaseSharesValid = value.cases.length === 3 && value.cases.every((scenarioCase) => isValidPhaseShares(scenarioCase.phaseShares));
  const canSubmit = !submitting && value.title.trim().length > 0 && value.domainIds.length > 0 && phaseSharesValid;
  const selectedProjects = value.projectIds ?? [];
  const selectedTeams = value.teamIds ?? [];
  const query = domainQuery.trim().toLocaleLowerCase();
  const visibleGroups = domainGroups.map((group) => ({
    ...group,
    domains: group.domains.filter((domain) => !query || `${domain.title} ${domain.summary} ${domain.id}`.toLocaleLowerCase().includes(query)),
  })).filter((group) => group.domains.length > 0);

  function copyBaseToOtherCases() {
    const base = value.cases.find((scenarioCase) => scenarioCase.id === "base");
    if (!base) return;
    updateDraft({ cases: value.cases.map((scenarioCase) => scenarioCase.id === "base" ? scenarioCase : {
      ...scenarioCase,
      effortAdjustmentPercent: base.effortAdjustmentPercent,
      riskReservePercent: base.riskReservePercent,
      manualTeamCount: base.manualTeamCount,
      weeklyCapacityPerTeam: base.weeklyCapacityPerTeam,
      phaseShares: { ...base.phaseShares },
      effortOverrides: base.effortOverrides.map((override) => ({ ...override, source: { ...override.source } })),
      fieldEvidence: base.fieldEvidence.map((item) => ({ ...item, evidence: { ...item.evidence } })),
      personDayRate: base.personDayRate,
      oneTimeExternalCost: base.oneTimeExternalCost,
      monthlyOperatingCost: base.monthlyOperatingCost,
      benefitDrivers: base.benefitDrivers.map((driver) => ({ ...driver })),
      moneyConversions: base.moneyConversions.map((conversion) => ({ ...conversion })),
    }) });
  }

  return <form onSubmit={(event) => { event.preventDefault(); if (canSubmit) onAnalyze(); }} className="space-y-4">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-cyan-700">فرم کنترل‌شدهٔ تحلیل</p>
          <h2 className="mt-1 text-xl font-black">فرض‌های سناریو</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">ورودی‌های هر حالت مستقل‌اند. مقدار خالی همان «نامشخص» می‌ماند؛ هیچ تبدیل ارز یا ضریب مقایسه‌ای به‌طور خودکار اعمال نمی‌شود.</p>
        </div>
        <Badge tone="info">{value.catalogScenarioId ? "پیش‌پرشده از فرضیهٔ سند؛ قابل ویرایش" : "سناریوی دستی"}</Badge>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TextField label="عنوان سناریو" value={value.title} maxLength={120} onChange={(title) => updateDraft({ title })} />
        <TextAreaField label="صورت مسئله و فرض ارزش" value={value.description ?? ""} rows={3} onChange={(description) => updateDraft({ description })} />
      </div>
    </div>

    <Section title="دامنه‌ها و اتصال تیم / پروژه" description="گیت‌های کاتالوگ صرفاً هشدارند. انتخاب دامنهٔ gold دستی ممکن است؛ gold-launch به‌عنوان سناریوی آماده وجود ندارد.">
      <div className="grid gap-4 lg:grid-cols-3">
        <label className={labelClass}>عمق اثر<select value={value.impactDepth} onChange={(event) => updateDraft({ impactDepth: event.target.value as ScenarioRequestDraft["impactDepth"] })} className={inputClass}><option value="selected">فقط انتخاب‌شده</option><option value="direct">وابستگی مستقیم</option><option value="transitive">وابستگی‌های زنجیره‌ای</option></select></label>
        <label className={labelClass}>ارز واحد سناریو<select value={value.currency} onChange={(event) => updateDraft({ currency: event.target.value as ScenarioRequestDraft["currency"] })} className={inputClass}><option value="TOMAN">تومان</option><option value="USD">دلار آمریکا</option><option value="IQD">دینار عراق</option></select></label>
        <NullableNumberField label="افق تحلیل (ماه)" min={1} max={60} step={1} value={value.horizonMonths} onChange={(horizonMonths) => { if (horizonMonths !== null) updateDraft({ horizonMonths }); }} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <fieldset className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-black">پروژه‌های مجاز در تحلیل</legend><div className="mt-2 flex flex-wrap gap-2">{projects.map((project) => <label key={project.id} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold ${selectedProjects.includes(project.id) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}><input className="sr-only" type="checkbox" checked={selectedProjects.includes(project.id)} onChange={() => updateDraft({ projectIds: toggleId(selectedProjects, project.id) })} />{project.name}</label>)}{!projects.length && <span className="text-xs text-slate-400">پروژهٔ مجازی برای این نشست دریافت نشد.</span>}</div></fieldset>
        <fieldset className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-black">تیم‌های مجاز برای ظرفیت</legend><div className="mt-2 flex flex-wrap gap-2">{teams.map((team) => <label key={team.id} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold ${selectedTeams.includes(team.id) ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}><input className="sr-only" type="checkbox" checked={selectedTeams.includes(team.id)} onChange={() => updateDraft({ teamIds: toggleId(selectedTeams, team.id) })} />{team.name}{team.project?.name ? ` · ${team.project.name}` : ""}</label>)}{!teams.length && <span className="text-xs text-slate-400">تیمی برای این نشست دریافت نشد؛ ظرفیت دستی هر حالت قابل ویرایش است.</span>}</div><p className="mt-2 text-[11px] leading-5 text-slate-500">تعداد تیم‌های انتخابی بر تعداد دستی هر حالت اولویت دارد؛ فقط شناسه‌های برگشتی از API ارسال می‌شوند.</p></fieldset>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black">دامنه‌های مبنا</p><span className="text-xs text-slate-500">{value.domainIds.length} دامنهٔ انتخاب‌شده</span></div>
        <input value={domainQuery} onChange={(event) => setDomainQuery(event.target.value)} placeholder="جست‌وجوی دامنه، شناسه یا توضیح…" className={inputClass} />
        <div className="mt-3 space-y-4">{visibleGroups.map((group) => <fieldset key={group.id} className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-xs font-black">{group.title}</legend><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{group.domains.map((domain) => <label key={domain.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${value.domainIds.includes(domain.id) ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}><input type="checkbox" checked={value.domainIds.includes(domain.id)} onChange={() => updateDraft({ domainIds: toggleId(value.domainIds, domain.id) })} className="mt-1 accent-cyan-600" /><span><span className="block text-xs font-black">{domain.title}<span className="mr-2 text-[10px] text-slate-400">{domain.priority}</span></span><span className="mt-1 block text-[11px] leading-5 text-slate-500">{domain.summary}</span></span></label>)}</div></fieldset>)}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{requestEvidenceLabels.filter(({ field }) => field !== "catalogScenarioId" || value.catalogScenarioId !== undefined).map(({ field, label }) => <EvidenceEditor key={field} label={label} value={requestEvidenceForField(value.fieldEvidence, field)} onChange={(evidence) => updateRequestEvidence(field, evidence)} />)}</div>
    </Section>

    <Section title="فنی و ظرفیت" description="تعدیل effort، ظرفیت و سهم فازها مفروضات ورودی‌اند، نه تعهد زمان تحویل. فازها باید دقیقاً جمعاً ۱۰۰٪ شوند.">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cyan-50 p-3"><div><p className="text-sm font-black text-cyan-950">سه حالت با ورودی مستقل</p><p className="mt-1 text-xs leading-5 text-cyan-900">محتاطانه، پایه و خوش‌بینانه هیچ ضریب پنهانی ندارند؛ مقدارها را جداگانه تعیین کنید.</p></div><button type="button" onClick={copyBaseToOtherCases} className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-xs font-black text-cyan-900 hover:bg-cyan-100">کپی صریح حالت پایه به دو حالت دیگر</button></div>
      <div className="space-y-4">{value.cases.map((caseInput) => {
        const shareTotal = Object.values(caseInput.phaseShares).reduce((sum, share) => sum + share, 0) * 100;
        return <details key={caseInput.id} open={openCases[caseInput.id] ?? caseInput.id === "base"} onToggle={(event) => setOpenCases((current) => ({ ...current, [caseInput.id]: event.currentTarget.open }))} className="rounded-2xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-4 py-4"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-base font-black">حالت {caseInput.name}</span><span className={`text-xs font-bold ${isValidPhaseShares(caseInput.phaseShares) ? "text-emerald-700" : "text-rose-700"}`}>جمع فازها: {new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(shareTotal)}٪</span></span></summary>
          <div className="space-y-5 border-t border-slate-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <RequiredNumberField label="تعدیل effort" suffix="٪؛ بازهٔ مجاز −۱۰۰ تا ۵۰۰" value={caseInput.effortAdjustmentPercent} min={-100} max={500} onChange={(effortAdjustmentPercent) => updateCase(caseInput.id, { effortAdjustmentPercent })} />
              <RequiredNumberField label="ذخیرهٔ ریسک" suffix="٪؛ ۰ تا ۱۰۰" value={caseInput.riskReservePercent} min={0} max={100} onChange={(riskReservePercent) => updateCase(caseInput.id, { riskReservePercent })} />
              <NullableNumberField label="تعداد تیم دستی" min={1} max={20} step={1} value={caseInput.manualTeamCount} onChange={(manualTeamCount) => updateCase(caseInput.id, { manualTeamCount })} />
              <NullableNumberField label="ظرفیت هفتگی هر تیم (نفر-روز)" min={1} max={40} value={caseInput.weeklyCapacityPerTeam} onChange={(weeklyCapacityPerTeam) => updateCase(caseInput.id, { weeklyCapacityPerTeam })} />
            </div>
            <div><p className="text-sm font-black">تقسیم چهار فاز</p><div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{phaseItems.map((phase) => <RequiredNumberField key={phase.id} label={phase.title} suffix="٪" min={0} max={100} value={caseInput.phaseShares[phase.id] * 100} onChange={(percent) => updateCase(caseInput.id, { phaseShares: { ...caseInput.phaseShares, [phase.id]: percent / 100 } })} />)}</div><p className={`mt-2 text-xs ${isValidPhaseShares(caseInput.phaseShares) ? "text-emerald-700" : "text-rose-700"}`}>{isValidPhaseShares(caseInput.phaseShares) ? "سهم چهار فاز دقیقاً ۱۰۰٪ است." : "برای فعال شدن تحلیل، مجموع سهم فازها را دقیقاً به ۱۰۰٪ برسانید."}</p></div>
            <div className="space-y-3"><div><p className="text-sm font-black">Override تلاش دامنه</p><p className="mt-1 text-xs leading-5 text-slate-500">خالی بگذارید تا برآورد پایه استفاده شود؛ عدد فقط با ورود صریح شما ثبت می‌شود.</p></div>{value.domainIds.map((domainId) => {
              const domain = domains.find((item) => item.id === domainId);
              const override = caseInput.effortOverrides.find((item) => item.domainId === domainId);
              return <div key={`${caseInput.id}-${domainId}`} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_200px_minmax(0,2fr)]"><div className="self-center text-xs font-bold">{domain?.title ?? domainId}</div><NullableNumberField label="Override نفر-روز" min={0} value={override?.personDays ?? null} onChange={(personDays) => {
                if (personDays === null) updateCase(caseInput.id, { effortOverrides: caseInput.effortOverrides.filter((item) => item.domainId !== domainId) });
                else {
                  const existing = caseInput.effortOverrides.find((item) => item.domainId === domainId);
                  const next = { domainId, personDays, source: existing?.source ?? defaultEvidence("مقدار override را کاربر وارد کرده؛ منبع برآورد را بازبینی کنید.") };
                  updateCase(caseInput.id, { effortOverrides: [...caseInput.effortOverrides.filter((item) => item.domainId !== domainId), next] });
                }
              }} />{override && <EvidenceEditor label="منبع override" value={override.source} onChange={(source) => updateCase(caseInput.id, { effortOverrides: caseInput.effortOverrides.map((item) => item.domainId === domainId ? { ...item, source: source ?? defaultEvidence("منبع override ثبت نشده است.") } : item) })} />}</div>;
            })}</div>
            <div className="grid gap-3 sm:grid-cols-2">{caseEvidenceLabels.map(({ field, label }) => <EvidenceEditor key={field} label={label} value={modelEvidenceForField(caseInput.fieldEvidence, field)} onChange={(evidence) => updateCaseEvidence(caseInput.id, field, evidence)} />)}</div>
          </div>
        </details>;
      })}</div>
    </Section>

    <Section title="مالی و محرک‌های منفعت" description="یک ارز برای کل سناریو انتخاب می‌شود. ارقام خالی نامشخص‌اند؛ نرخ تبدیل باید با نرخ، تاریخ و منبعی که خودتان وارد می‌کنید همراه باشد.">
      <div className="grid gap-3 sm:grid-cols-2">{value.cases.map((caseInput) => <div key={caseInput.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black">حالت {caseInput.name}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><NullableNumberField label={`نرخ نفر-روز (${value.currency})`} min={0} value={caseInput.personDayRate} onChange={(personDayRate) => updateCase(caseInput.id, { personDayRate })} /><NullableNumberField label={`هزینهٔ اولیه (${value.currency})`} min={0} value={caseInput.oneTimeExternalCost} onChange={(oneTimeExternalCost) => updateCase(caseInput.id, { oneTimeExternalCost })} /><NullableNumberField label={`هزینهٔ جاری ماهانه (${value.currency})`} min={0} value={caseInput.monthlyOperatingCost} onChange={(monthlyOperatingCost) => updateCase(caseInput.id, { monthlyOperatingCost })} /></div><div className="mt-3 space-y-2"><MoneyConversionEditor key={`${caseInput.id}-personDayRate`} caseInput={caseInput} field="personDayRate" onChange={(conversions, amount) => updateCostConversion(caseInput.id, "personDayRate", conversions, amount)} /><MoneyConversionEditor key={`${caseInput.id}-oneTimeExternalCost`} caseInput={caseInput} field="oneTimeExternalCost" onChange={(conversions, amount) => updateCostConversion(caseInput.id, "oneTimeExternalCost", conversions, amount)} /><MoneyConversionEditor key={`${caseInput.id}-monthlyOperatingCost`} caseInput={caseInput} field="monthlyOperatingCost" onChange={(conversions, amount) => updateCostConversion(caseInput.id, "monthlyOperatingCost", conversions, amount)} /></div><div className="mt-4"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-black">محرک‌های منفعت</h4><button type="button" onClick={() => updateCase(caseInput.id, { benefitDrivers: [...caseInput.benefitDrivers, makeBlankDriver()] })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold">افزودن محرک</button></div>{caseInput.benefitDrivers.map((driver) => <div key={driver.id} className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black">{driver.name}</p><button type="button" onClick={() => updateCase(caseInput.id, { benefitDrivers: caseInput.benefitDrivers.filter((item) => item.id !== driver.id), moneyConversions: caseInput.moneyConversions.filter((item) => item.field !== "benefitNetContribution" || item.benefitDriverId !== driver.id) })} className="text-xs font-bold text-rose-700">حذف محرک</button></div><TextField label="نام محرک" value={driver.name} maxLength={160} onChange={(name) => updateBenefitDriver(caseInput, driver.id, { name })} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><NullableNumberField label="واحد در ماه" min={0} value={driver.monthlyUnits} onChange={(monthlyUnits) => updateBenefitDriver(caseInput, driver.id, { monthlyUnits })} /><NullableNumberField label={`حاشیهٔ خالص هر واحد (${value.currency})`} value={driver.netContributionPerUnit} onChange={(netContributionPerUnit) => updateBenefitDriver(caseInput, driver.id, { netContributionPerUnit })} /><NullableNumberField label="ماه شروع" min={1} max={value.horizonMonths} step={1} value={driver.startMonth} onChange={(startMonth) => updateBenefitDriver(caseInput, driver.id, { startMonth })} /><NullableNumberField label="احتمال تحقق (٪)" min={0} max={100} value={driver.probabilityPercent} onChange={(probabilityPercent) => updateBenefitDriver(caseInput, driver.id, { probabilityPercent })} /></div><EvidenceEditor label="منبع محرک منفعت" value={driver.source} onChange={(source) => updateBenefitDriver(caseInput, driver.id, { source })} /><MoneyConversionEditor key={`${caseInput.id}-${driver.id}-benefit`} caseInput={caseInput} field="benefitNetContribution" benefitDriverId={driver.id} onChange={(conversions, convertedAmount) => updateCase(caseInput.id, { moneyConversions: conversions, benefitDrivers: caseInput.benefitDrivers.map((item) => item.id === driver.id ? { ...item, netContributionPerUnit: typeof convertedAmount === "number" && Number.isFinite(convertedAmount) ? convertedAmount : null } : item) })} /></div>)}</div></div>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">{caseEvidenceLabels.filter(({ field }) => ["personDayRate", "oneTimeExternalCost", "monthlyOperatingCost"].includes(field)).flatMap(({ field, label }) => value.cases.map((caseInput) => <EvidenceEditor key={`${caseInput.id}-${field}-source`} label={`${label} · ${caseInput.name}`} value={modelEvidenceForField(caseInput.fieldEvidence, field)} onChange={(evidence) => updateCaseEvidence(caseInput.id, field, evidence)} />))}</div>
    </Section>

    <Section title="KPI، گیت و نقاط عطف" description="موفقیت، مالک و شواهد را قابل ویرایش نگه دارید. تاریخ هدف به‌تنهایی عبور از گیت محسوب نمی‌شود.">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black">شاخص‌های کلیدی و guardrail</h3><button type="button" onClick={() => updateDraft({ kpis: [...value.kpis, makeBlankKpi()] })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">افزودن KPI</button></div>
      {value.kpis.map((kpi) => <article key={kpi.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-black">{kpi.name}</h4><button type="button" onClick={() => updateDraft({ kpis: value.kpis.filter((item) => item.id !== kpi.id) })} className="text-xs font-bold text-rose-700">حذف</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><TextField label="نام KPI" value={kpi.name} onChange={(name) => updateKpi(kpi.id, { name })} /><TextField label="واحد" value={kpi.unit} onChange={(unit) => updateKpi(kpi.id, { unit })} /><NullableNumberField label="مبنای اندازه‌گیری" value={kpi.baseline} onChange={(baseline) => updateKpi(kpi.id, { baseline })} /><NullableNumberField label="هدف" value={kpi.target} onChange={(target) => updateKpi(kpi.id, { target })} /><label className={labelClass}>جهت موفقیت<select value={kpi.operator} onChange={(event) => updateKpi(kpi.id, { operator: event.target.value as ScenarioKpi["operator"] })} className={inputClass}><option value="gte">بزرگ‌تر یا مساوی</option><option value="lte">کوچک‌تر یا مساوی</option></select></label><TextField label="بازهٔ اندازه‌گیری" value={kpi.measurementWindow} onChange={(measurementWindow) => updateKpi(kpi.id, { measurementWindow })} /><TextField label="مالک KPI" value={kpi.owner} onChange={(owner) => updateKpi(kpi.id, { owner })} /><label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold"><input type="checkbox" checked={kpi.guardrail} onChange={(event) => updateKpi(kpi.id, { guardrail: event.target.checked })} />این KPI خط قرمز است</label><NullableNumberField label="مقدار واقعی (اختیاری)" value={kpi.actual} onChange={(actual) => updateKpi(kpi.id, actual === null ? { actual: null, actualAt: null, actualSource: null } : { actual })} /><DateField label="زمان ثبت مقدار واقعی" value={kpi.actualAt} onChange={(actualAt) => updateKpi(kpi.id, { actualAt })} /><TextField label="منبع مقدار واقعی" value={kpi.actualSource ?? ""} onChange={(actualSource) => updateKpi(kpi.id, { actualSource: actualSource || null })} /></div>{kpi.actual !== null && (!kpi.actualAt || !kpi.actualSource) && <p className="text-xs text-amber-800">برای ثبت مقدار واقعی، زمان و منبع اندازه‌گیری را هم تکمیل کنید.</p>}<EvidenceEditor label="منبع KPI" value={kpi.source} onChange={(source) => updateKpi(kpi.id, { source })} /></article>)}
      <div className="grid gap-3 xl:grid-cols-2"><EditableTextList title="Guardrailها / خطوط قرمز" values={value.guardrails} onChange={(guardrails) => updateDraft({ guardrails })} placeholder="مثلاً افت کیفیت احراز هویت از حد توافق‌شده عبور نکند" /><EditableTextList title="ریسک‌ها" values={value.risks} onChange={(risks) => updateDraft({ risks })} placeholder="ریسک و پیامد احتمالی" /></div>
      <fieldset className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4"><legend className="px-1 text-sm font-black text-amber-950">یادداشت گیت تصمیم</legend><div className="flex flex-wrap items-center gap-2"><Badge tone="warning">تصمیم هنوز ثبت نشده</Badge><span className="text-xs text-amber-900">این فرم تصمیم CEO ثبت نمی‌کند؛ تصمیم فقط پس از تحلیل از مسیر ثبت‌شدهٔ مدیرعامل ذخیره می‌شود.</span></div><div className="grid gap-3 sm:grid-cols-2"><TextField label="مالک بازبینی گیت" value={value.gateDecision.owner} onChange={(owner) => updateDraft({ gateDecision: { ...value.gateDecision, decision: null, owner } })} /><DateField label="تاریخ بازبینی" value={value.gateDecision.reviewDate} onChange={(reviewDate) => updateDraft({ gateDecision: { ...value.gateDecision, decision: null, reviewDate } })} /><TextAreaField label="دلیل / پرسش تصمیم" value={value.gateDecision.reason} rows={2} onChange={(reason) => updateDraft({ gateDecision: { ...value.gateDecision, decision: null, reason } })} /><TextAreaField label="شواهد موردنیاز یا ثبت‌شده" value={value.gateDecision.evidence} rows={2} onChange={(evidence) => updateDraft({ gateDecision: { ...value.gateDecision, decision: null, evidence } })} /></div></fieldset>
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black">Milestoneها</h3><button type="button" onClick={() => updateDraft({ milestones: [...value.milestones, makeBlankMilestone()] })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">افزودن نقطهٔ عطف</button></div>
      {value.milestones.map((milestone) => <article key={milestone.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-black">{milestone.title}</h4><button type="button" onClick={() => updateDraft({ milestones: value.milestones.filter((item) => item.id !== milestone.id) })} className="text-xs font-bold text-rose-700">حذف</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><TextField label="عنوان" value={milestone.title} onChange={(title) => updateMilestone(milestone.id, { title })} /><TextField label="مرحله" value={milestone.stage} onChange={(stage) => updateMilestone(milestone.id, { stage })} /><TextField label="مالک" value={milestone.owner} onChange={(owner) => updateMilestone(milestone.id, { owner })} /><NullableNumberField label="روز هدف" min={0} max={3650} step={1} value={milestone.targetDay} onChange={(targetDay) => updateMilestone(milestone.id, { targetDay })} /><DateField label="تاریخ هدف" value={milestone.targetDate} onChange={(targetDate) => updateMilestone(milestone.id, { targetDate })} /><DateField label="تاریخ بازبینی" value={milestone.reviewDate} onChange={(reviewDate) => updateMilestone(milestone.id, { reviewDate })} /></div><div className="grid gap-3 sm:grid-cols-2"><TextAreaField label="شرط ورود" value={milestone.entryCriteria} onChange={(entryCriteria) => updateMilestone(milestone.id, { entryCriteria })} /><TextAreaField label="شرط خروج" value={milestone.exitCriteria} onChange={(exitCriteria) => updateMilestone(milestone.id, { exitCriteria })} /></div></article>)}
      <div className="grid gap-3 sm:grid-cols-2">{requestEvidenceLabels.filter(({ field }) => field === "kpis" || field === "milestones" || field === "guardrails" || field === "risks").map(({ field, label }) => <EvidenceEditor key={`${field}-kpi-source`} label={label} value={requestEvidenceForField(value.fieldEvidence, field)} onChange={(evidence) => updateRequestEvidence(field, evidence)} />)}</div>
    </Section>

    <Section title="اولویت‌بندی و منشأ فرض‌ها" description="امتیاز ۱–۵ و وزن ۰–۱۰۰ هر معیار قابل تغییر است؛ مقدار سندی، دادهٔ داخلی و پیش‌فرض مدل جداگانه برچسب می‌خورند." defaultOpen={false}>
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black">معیارها و وزن‌ها</h3><button type="button" onClick={() => { const criterion = makeBlankCriterion(); updateDraft({ priorityCriteria: [...value.priorityCriteria, criterion], priorityWeights: [...value.priorityWeights, { criterionId: criterion.id, weight: 1, source: defaultEvidence("وزن اولیه ۱ است؛ به‌صورت دستی قابل تغییر است.") }] }); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">افزودن معیار</button></div>
      {value.priorityCriteria.map((criterion) => {
        const weight = value.priorityWeights.find((item) => item.criterionId === criterion.id);
        return <article key={criterion.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-black">{criterion.label}</h4><button type="button" onClick={() => updateDraft({ priorityCriteria: value.priorityCriteria.filter((item) => item.id !== criterion.id), priorityWeights: value.priorityWeights.filter((item) => item.criterionId !== criterion.id) })} className="text-xs font-bold text-rose-700">حذف معیار</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><TextField label="معیار" value={criterion.label} onChange={(label) => updateCriterion(criterion.id, { label })} /><NullableNumberField label="امتیاز" min={1} max={5} step={1} value={criterion.score} onChange={(score) => updateCriterion(criterion.id, { score })} /><label className={labelClass}>جهت امتیاز<select value={criterion.direction} onChange={(event) => updateCriterion(criterion.id, { direction: event.target.value as PriorityCriterion["direction"] })} className={inputClass}><option value="higher-is-better">بیشتر بهتر</option><option value="risk-lower-is-better">ریسک کمتر بهتر</option></select></label><NullableNumberField label="وزن (۰ تا ۱۰۰)" min={0} max={100} value={weight?.weight ?? null} onChange={(nextWeight) => {
          if (!weight && nextWeight !== null) updateDraft({ priorityWeights: [...value.priorityWeights, { criterionId: criterion.id, weight: nextWeight, source: defaultEvidence("وزن واردشده توسط کاربر؛ منشأ وزن را بازبینی کنید.") }] });
          else if (weight && nextWeight !== null) updateWeight(criterion.id, { weight: nextWeight });
          else updateDraft({ priorityWeights: value.priorityWeights.filter((item) => item.criterionId !== criterion.id) });
        }} /></div><EvidenceEditor label="منبع امتیاز" value={criterion.source} onChange={(source) => updateCriterion(criterion.id, { source })} />{weight && <EvidenceEditor label="منبع وزن" value={weight.source} onChange={(source) => updateWeight(criterion.id, { source })} />}</article>;
      })}
      <div className="grid gap-3 sm:grid-cols-2">{requestEvidenceLabels.filter(({ field }) => field === "priorityCriteria" || field === "priorityWeights").map(({ field, label }) => <EvidenceEditor key={`${field}-evidence`} label={label} value={requestEvidenceForField(value.fieldEvidence, field)} onChange={(evidence) => updateRequestEvidence(field, evidence)} />)}</div>
      {value.catalogScenarioId && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">شناسهٔ کاتالوگ و رتبه‌های سندی قابل ویرایش‌اند؛ این رتبه‌ها مجوز اجرا یا تعهد اولویت نیستند.</div>}
    </Section>

    <div className="sticky bottom-2 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black">پیش از تحلیل</p><p className={`mt-1 text-xs ${phaseSharesValid ? "text-slate-500" : "text-rose-700"}`}>{phaseSharesValid ? "درخواست شامل سه حالت مستقل است؛ مقدار خالی به‌صورت دادهٔ نامشخص حفظ می‌شود." : "جمع سهم فازهای هر سه حالت باید ۱۰۰٪ باشد."}</p></div><button type="submit" disabled={!canSubmit} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{submitting ? "در حال ذخیره و تحلیل…" : "تحلیل و ذخیرهٔ سناریو"}</button></div>
    </div>
  </form>;
}
