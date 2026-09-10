import { domainRelationships, domains, getDomainById, type DomainGroupId, type DomainRelationship } from "./domain-map";
import { getProcessById, type ProcessDefinition } from "./workspaces";

export type ScenarioAssumptions = {
  teamCount?: number;
  weeklyCapacity?: number;
  personDayRate?: number | null;
  bufferPercent?: number;
};

export type ScenarioInput = {
  title: string;
  description?: string;
  domainIds: string[];
  assumptions?: ScenarioAssumptions;
};

export type ScenarioEstimate = {
  title: string;
  description: string;
  selectedDomainIds: string[];
  impactedDomains: Array<{ id: string; title: string; group: DomainGroupId; priority: string; selected: boolean; status: string; complexityDays: number }>;
  relationships: DomainRelationship[];
  processImpacts: ProcessDefinition[];
  assumptions: Required<ScenarioAssumptions> & { impactDepth: number };
  metrics: {
    basePersonDays: number;
    personDays: number;
    calendarWeeks: number;
    cost: { low: number; high: number; currency: "تومان" } | null;
  };
  changeVolume: {
    domainCount: number;
    selectedDomainCount: number;
    relationshipCount: number;
    processCount: number;
    apiSurfaceCount: number;
    integrationCount: number;
    dataMigrationCount: number;
    uiSurfaceCount: number;
    taskCount: number;
    phaseCount: 4;
  };
  phases: Array<{ id: "product" | "design" | "development" | "delivery"; title: string; personDays: number; share: number }>;
  confidence: "low" | "medium" | "high";
  warnings: string[];
};

type DomainEffort = { personDays: number; apiSurfaces: number; integrations: number; dataMigrations: number; uiSurfaces: number };

const groupDefaults: Record<DomainGroupId, DomainEffort> = {
  infra: { personDays: 5, apiSurfaces: 3, integrations: 1, dataMigrations: 1, uiSurfaces: 1 },
  core: { personDays: 6, apiSurfaces: 3, integrations: 1, dataMigrations: 1, uiSurfaces: 2 },
  finance: { personDays: 6, apiSurfaces: 3, integrations: 2, dataMigrations: 1, uiSurfaces: 2 },
  ecosystem: { personDays: 4, apiSurfaces: 2, integrations: 2, dataMigrations: 0, uiSurfaces: 3 },
  platform: { personDays: 4, apiSurfaces: 1, integrations: 0, dataMigrations: 0, uiSurfaces: 4 },
};

const domainOverrides: Record<string, Partial<DomainEffort>> = {
  currency: { personDays: 8, apiSurfaces: 4, dataMigrations: 2 },
  wallet: { personDays: 9, apiSurfaces: 5, dataMigrations: 2 },
  transfer: { personDays: 8, apiSurfaces: 4, integrations: 2 },
  card: { personDays: 8, apiSurfaces: 4, integrations: 2, uiSurfaces: 3 },
  "fx-market": { personDays: 10, apiSurfaces: 5, integrations: 3, dataMigrations: 2 },
  loan: { personDays: 10, apiSurfaces: 5, integrations: 2, dataMigrations: 2 },
  gold: { personDays: 9, apiSurfaces: 4, integrations: 2, dataMigrations: 2 },
  insurance: { personDays: 8, apiSurfaces: 4, integrations: 2, dataMigrations: 1 },
  mobile: { personDays: 12, apiSurfaces: 2, uiSurfaces: 8 },
};

const processDomainMap: Record<string, string[]> = {
  currency: ["multi-currency-ledger", "fx-trading"],
  limits: ["limits-engine"],
  policy: ["access-policy"],
  kyc: ["identity-and-kyc"],
  wallet: ["multi-currency-ledger", "top-up-and-orders"],
  card: ["card-lifecycle"],
  transfer: ["transfer"],
  qr: ["merchant-qr"],
  "fx-market": ["fx-trading"],
  loan: ["loan"],
  gold: ["gold"],
  insurance: ["insurance"],
  "special-offer": ["merchant-qr"],
  "buy-toman": ["top-up-and-orders"],
  tickets: ["top-up-and-orders"],
  hotel: ["top-up-and-orders"],
  agents: ["card-lifecycle", "top-up-and-orders"],
  "admin-panel": ["access-policy", "limit-catalog", "agent-governance", "audit-and-metrics"],
  topup: ["top-up-and-orders"],
  rates: ["fx-trading"],
  support: ["customer-support"],
  transactions: ["multi-currency-ledger", "top-up-and-orders"],
  profile: ["access-policy"],
  i18n: ["customer-support"],
  redesign: ["customer-support"],
  mobile: ["customer-support"],
};

export const scenarioTemplates: Array<{ id: string; title: string; description: string; domainIds: string[] }> = [
  { id: "multi-currency-transfer", title: "انتقال وجه چندارزی", description: "اثر انتقال وجه روی کیف، ارز، سقف و پالیسی را بررسی کن.", domainIds: ["transfer"] },
  { id: "fx-market", title: "راه‌اندازی خرید و فروش ارز", description: "بازار ارز، نرخ مرجع، دفترکل و کنترل ریسک را بسنج.", domainIds: ["fx-market"] },
  { id: "merchant-offer", title: "پرداخت QR و پیشنهاد پذیرنده", description: "اثر پرداخت پذیرنده و موتور پیشنهاد را مقایسه کن.", domainIds: ["qr", "special-offer"] },
  { id: "kyc-card", title: "ارتقای KYC و صدور کارت", description: "مسیر هویت، کیف، پالیسی و کارت را برآورد کن.", domainIds: ["kyc", "card"] },
  { id: "mobile-rewrite", title: "بازنویسی موبایل", description: "بازنویسی کلاینت را همراه چندزبانه و سیستم دیزاین بررسی کن.", domainIds: ["mobile", "redesign", "i18n"] },
  { id: "gold-launch", title: "افزودن محصول طلا", description: "ارزش‌گذاری، دفترکل، نرخ و کنترل معامله را تحلیل کن.", domainIds: ["gold"] },
];

const phaseShares = [
  { id: "product" as const, title: "محصول", share: 0.15 },
  { id: "design" as const, title: "طراحی", share: 0.2 },
  { id: "development" as const, title: "توسعه", share: 0.45 },
  { id: "delivery" as const, title: "تحویل", share: 0.2 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeAssumptions(input?: ScenarioAssumptions): Required<ScenarioAssumptions> & { impactDepth: number } {
  const teamCount = clamp(Math.round(input?.teamCount ?? 1), 1, 20);
  const weeklyCapacity = clamp(round(input?.weeklyCapacity ?? 5), 1, 40);
  const personDayRate = input?.personDayRate && input.personDayRate > 0 ? Math.round(clamp(input.personDayRate, 1, 1_000_000_000)) : null;
  const bufferPercent = clamp(round(input?.bufferPercent ?? 20), 0, 100);
  return { teamCount, weeklyCapacity, personDayRate, bufferPercent, impactDepth: 1 };
}

function effortForDomain(id: string): DomainEffort {
  const domain = getDomainById(id);
  if (!domain) return { personDays: 0, apiSurfaces: 0, integrations: 0, dataMigrations: 0, uiSurfaces: 0 };
  return { ...groupDefaults[domain.group], ...domainOverrides[id] };
}

function directImpact(selectedIds: string[]) {
  const selected = new Set(selectedIds);
  const impacted = new Set(selectedIds);
  for (const relationship of domainRelationships) {
    if (selected.has(relationship.from) || selected.has(relationship.to)) {
      impacted.add(relationship.from);
      impacted.add(relationship.to);
    }
  }
  return impacted;
}

function processImpacts(domainIds: string[]) {
  const ids = [...new Set(domainIds.flatMap((id) => processDomainMap[id] ?? []))];
  return ids.map((id) => getProcessById(id)).filter((process): process is ProcessDefinition => Boolean(process));
}

export function calculateScenarioEstimate(input: ScenarioInput): ScenarioEstimate {
  const title = input.title.trim();
  if (!title) throw new Error("عنوان سناریو الزامی است.");
  const selectedDomainIds = [...new Set(input.domainIds)].filter((id) => Boolean(getDomainById(id)));
  if (selectedDomainIds.length === 0) throw new Error("حداقل یک دامنه معتبر برای سناریو انتخاب کنید.");

  const assumptions = normalizeAssumptions(input.assumptions);
  const impactedIds = directImpact(selectedDomainIds);
  const impactedDomains = domains.filter((domain) => impactedIds.has(domain.id)).map((domain) => {
    const effort = effortForDomain(domain.id);
    return { id: domain.id, title: domain.title, group: domain.group, priority: domain.priority, selected: selectedDomainIds.includes(domain.id), status: domain.status, complexityDays: effort.personDays };
  });
  const relationships = domainRelationships.filter((relationship) => impactedIds.has(relationship.from) && impactedIds.has(relationship.to));
  const processImpacts = processImpactsFor(impactedDomains.map((domain) => domain.id));
  const effort = impactedDomains.reduce((total, domain) => {
    const item = effortForDomain(domain.id);
    return { personDays: total.personDays + item.personDays, apiSurfaces: total.apiSurfaces + item.apiSurfaces, integrations: total.integrations + item.integrations, dataMigrations: total.dataMigrations + item.dataMigrations, uiSurfaces: total.uiSurfaces + item.uiSurfaces };
  }, { personDays: 0, apiSurfaces: 0, integrations: 0, dataMigrations: 0, uiSurfaces: 0 });
  const basePersonDays = round(4 + effort.personDays + relationships.length * 1.5 + processImpacts.length * 1.5 + effort.integrations * 1.5 + effort.dataMigrations * 1.5);
  const personDays = round(basePersonDays * (1 + assumptions.bufferPercent / 100));
  const calendarWeeks = Math.max(1, Math.ceil(personDays / (assumptions.teamCount * assumptions.weeklyCapacity)));
  const cost = assumptions.personDayRate ? { low: Math.round(personDays * assumptions.personDayRate * 0.85), high: Math.round(personDays * assumptions.personDayRate * 1.15), currency: "تومان" as const } : null;
  const changeVolume = { domainCount: impactedDomains.length, selectedDomainCount: selectedDomainIds.length, relationshipCount: relationships.length, processCount: processImpacts.length, apiSurfaceCount: effort.apiSurfaces, integrationCount: effort.integrations, dataMigrationCount: effort.dataMigrations, uiSurfaceCount: effort.uiSurfaces, taskCount: Math.max(4, Math.ceil(personDays / 2)), phaseCount: 4 as const };
  const phases = phaseShares.map((phase) => ({ ...phase, personDays: round(personDays * phase.share) }));
  const hasOpenDecision = impactedDomains.some((domain) => domain.status === "OPEN_DECISION");
  const warnings = [
    ...(cost ? [] : ["نرخ نفر-روز وارد نشده است؛ هزینه فقط پس از ورود نرخ محاسبه می‌شود."]),
    ...(hasOpenDecision ? ["حداقل یک دامنه تصمیم باز دارد؛ اطمینان برآورد پایین‌تر است."] : []),
    ...(relationships.length > 0 ? ["وابستگی‌های مستقیم دامنه‌ها در حجم تغییر لحاظ شده‌اند."] : []),
  ];
  return {
    title,
    description: input.description?.trim() ?? "",
    selectedDomainIds,
    impactedDomains,
    relationships,
    processImpacts,
    assumptions,
    metrics: { basePersonDays, personDays, calendarWeeks, cost },
    changeVolume,
    phases,
    confidence: hasOpenDecision ? "low" : impactedDomains.length <= 3 ? "high" : "medium",
    warnings,
  };
}

function processImpactsFor(domainIds: string[]) {
  return processImpacts(domainIds);
}
