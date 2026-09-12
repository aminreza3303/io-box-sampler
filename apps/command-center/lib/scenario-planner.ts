import { domainRelationships, domains, getDomainById, type DomainGroupId, type DomainRelationship } from "./domain-map";
import { getProcessById, type ProcessDefinition } from "./workspaces";
import type { ScenarioPlannerInput, TechnicalEstimate } from "./scenario-types";

export type { ScenarioPlannerInput, TechnicalEstimate } from "./scenario-types";

type DomainEffort = {
  personDays: number;
  apiSurfaces: number;
  integrations: number;
  dataMigrations: number;
  uiSurfaces: number;
};

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
];

const phaseDefinitions = [
  { id: "product" as const, title: "محصول", shareKey: "product" as const },
  { id: "design" as const, title: "طراحی", shareKey: "design" as const },
  { id: "development" as const, title: "توسعه", shareKey: "development" as const },
  { id: "delivery" as const, title: "تحویل", shareKey: "delivery" as const },
];

function roundTenth(value: number): number {
  if (!Number.isFinite(value)) throw new Error("مقدار نفر-روز خارج از محدودهٔ محاسبه است.");
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  if (!Number.isFinite(rounded)) throw new Error("مقدار نفر-روز خارج از محدودهٔ محاسبه است.");
  return rounded;
}

function validatePlannerInput(input: ScenarioPlannerInput): string[] {
  if (!input.title.trim()) throw new Error("عنوان سناریو الزامی است.");
  if (!Array.isArray(input.domainIds) || input.domainIds.length === 0) throw new Error("حداقل یک دامنه برای سناریو انتخاب کنید.");
  const invalidDomains = [...new Set(input.domainIds)].filter((id) => !getDomainById(id));
  if (invalidDomains.length > 0) throw new Error(`دامنهٔ نامعتبر: ${invalidDomains.join("، ")}`);
  if (!["selected", "direct", "transitive"].includes(input.impactDepth)) throw new Error("عمق اثر سناریو معتبر نیست.");
  if (!Number.isFinite(input.effortAdjustmentPercent) || input.effortAdjustmentPercent < -100 || input.effortAdjustmentPercent > 500) {
    throw new Error("تغییر effort باید بین ۱۰۰- تا ۵۰۰ درصد باشد.");
  }
  if (!Number.isFinite(input.riskReservePercent) || input.riskReservePercent < 0 || input.riskReservePercent > 100) {
    throw new Error("ذخیرهٔ ریسک باید بین صفر تا ۱۰۰ درصد باشد.");
  }
  for (const [name, value] of [["تعداد تیم", input.teamCount], ["ظرفیت هفتگی", input.weeklyCapacityPerTeam]] as const) {
    if (value !== null && (!Number.isFinite(value) || value <= 0)) throw new Error(`${name} باید عددی مثبت و معتبر باشد.`);
  }
  if (input.teamCount !== null && (!Number.isInteger(input.teamCount) || input.teamCount > 20)) {
    throw new Error("تعداد تیم باید عدد صحیحی بین ۱ تا ۲۰ باشد.");
  }
  if (input.weeklyCapacityPerTeam !== null && input.weeklyCapacityPerTeam > 40) {
    throw new Error("ظرفیت هفتگی هر تیم نباید بیشتر از ۴۰ نفر-روز باشد.");
  }
  const shares = phaseDefinitions.map((phase) => input.phaseShares[phase.shareKey]);
  if (shares.some((share) => !Number.isFinite(share) || share < 0 || share > 1)) {
    throw new Error("سهم هر فاز باید بین صفر و یک باشد.");
  }
  if (Math.abs(shares.reduce((sum, share) => sum + share, 0) - 1) > 1e-8) {
    throw new Error("مجموع سهم چهار فاز باید دقیقاً ۱۰۰٪ باشد.");
  }
  const overrideIds = input.effortOverrides.map((item) => item.domainId);
  if (new Set(overrideIds).size !== overrideIds.length) throw new Error("برای هر دامنه فقط یک بازنویسی effort ثبت کنید.");
  for (const item of input.effortOverrides) {
    if (!getDomainById(item.domainId)) throw new Error(`دامنهٔ بازنویسی نامعتبر است: ${item.domainId}`);
    if (!Number.isFinite(item.personDays) || item.personDays < 0) throw new Error("نفر-روز بازنویسی‌شده باید صفر یا بیشتر باشد.");
  }
  return [...new Set(input.domainIds)];
}

function impactedDomainIds(selectedIds: string[], depth: ScenarioPlannerInput["impactDepth"]): Set<string> {
  const impacted = new Set(selectedIds);
  if (depth === "selected") return impacted;

  if (depth === "direct") {
    const selected = new Set(selectedIds);
    for (const relationship of domainRelationships) {
      if (selected.has(relationship.from) || selected.has(relationship.to)) {
        impacted.add(relationship.from);
        impacted.add(relationship.to);
      }
    }
    return impacted;
  }

  const queue = [...selectedIds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const relationship of domainRelationships) {
      let neighbor: string | null = null;
      if (relationship.from === current) neighbor = relationship.to;
      else if (relationship.to === current) neighbor = relationship.from;
      if (neighbor && !impacted.has(neighbor)) {
        impacted.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return impacted;
}

function uniqueRelationships(relationships: DomainRelationship[]): DomainRelationship[] {
  const seen = new Set<string>();
  return relationships.filter((relationship) => {
    const key = `${relationship.from}\u0000${relationship.to}\u0000${relationship.label}\u0000${relationship.explanation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function processImpacts(domainIds: string[]): ProcessDefinition[] {
  const processIds = [...new Set(domainIds.flatMap((id) => processDomainMap[id] ?? []))];
  return processIds.map((id) => getProcessById(id)).filter((process): process is ProcessDefinition => Boolean(process));
}

function effortForDomain(id: string, overrideByDomain: Map<string, number>): DomainEffort {
  const domain = getDomainById(id);
  if (!domain) return { personDays: 0, apiSurfaces: 0, integrations: 0, dataMigrations: 0, uiSurfaces: 0 };
  const effort = { ...groupDefaults[domain.group], ...domainOverrides[id] };
  const override = overrideByDomain.get(id);
  return override === undefined ? effort : { ...effort, personDays: override };
}

function distributePhaseEffort(personDays: number, shares: ScenarioPlannerInput["phaseShares"]): TechnicalEstimate["phases"] {
  const totalTenths = Math.round(personDays * 10);
  if (!Number.isSafeInteger(totalTenths)) throw new Error("نفر-روز برنامه‌ریزی‌شده برای توزیع دقیق فازها بیش‌ازحد بزرگ است.");
  const phases = phaseDefinitions.map((phase, index) => {
    const exactTenths = totalTenths * shares[phase.shareKey];
    const wholeTenths = Math.floor(exactTenths);
    return { ...phase, index, exactTenths, wholeTenths, remainder: exactTenths - wholeTenths };
  });
  let remainingTenths = totalTenths - phases.reduce((sum, phase) => sum + phase.wholeTenths, 0);
  const byLargestRemainder = [...phases].sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (const phase of byLargestRemainder) {
    if (remainingTenths <= 0) break;
    phase.wholeTenths += 1;
    remainingTenths -= 1;
  }
  const tenthsByPhase = new Map(phases.map((phase) => [phase.id, phase.wholeTenths]));
  return phaseDefinitions.map((phase) => ({
    id: phase.id,
    title: phase.title,
    share: shares[phase.shareKey],
    personDays: (tenthsByPhase.get(phase.id) ?? 0) / 10,
  }));
}

export function calculateScenarioEstimate(input: ScenarioPlannerInput): TechnicalEstimate {
  const selectedDomainIds = validatePlannerInput(input);
  const selected = new Set(selectedDomainIds);
  const impactedIds = impactedDomainIds(selectedDomainIds, input.impactDepth);
  const overrideByDomain = new Map(input.effortOverrides.map((override) => [override.domainId, override.personDays]));

  const impactedDomains = domains
    .filter((domain) => impactedIds.has(domain.id))
    .map((domain) => {
      const effort = effortForDomain(domain.id, overrideByDomain);
      return {
        id: domain.id,
        title: domain.title,
        group: domain.group,
        priority: domain.priority,
        selected: selected.has(domain.id),
        status: domain.status,
        complexityDays: effort.personDays,
      };
    });
  const relationships = uniqueRelationships(domainRelationships.filter((relationship) => impactedIds.has(relationship.from) && impactedIds.has(relationship.to)));
  const processImpactsResult = processImpacts(impactedDomains.map((domain) => domain.id));
  const volume = impactedDomains.reduce((total, domain) => {
    const item = effortForDomain(domain.id, overrideByDomain);
    return {
      personDays: total.personDays + item.personDays,
      apiSurfaces: total.apiSurfaces + item.apiSurfaces,
      integrations: total.integrations + item.integrations,
      dataMigrations: total.dataMigrations + item.dataMigrations,
      uiSurfaces: total.uiSurfaces + item.uiSurfaces,
    };
  }, { personDays: 0, apiSurfaces: 0, integrations: 0, dataMigrations: 0, uiSurfaces: 0 });

  const basePersonDays = roundTenth(
    4 + volume.personDays + relationships.length * 1.5 + processImpactsResult.length * 1.5 + volume.integrations * 1.5 + volume.dataMigrations * 1.5,
  );
  const adjustedBasePersonDays = roundTenth(Math.max(0, basePersonDays * (1 + input.effortAdjustmentPercent / 100)));
  const reservePersonDays = roundTenth(adjustedBasePersonDays * input.riskReservePercent / 100);
  const personDays = roundTenth(adjustedBasePersonDays + reservePersonDays);
  const calendarWeeks = input.teamCount !== null && input.weeklyCapacityPerTeam !== null
    ? Math.ceil(personDays / (input.teamCount * input.weeklyCapacityPerTeam))
    : null;
  const phases = distributePhaseEffort(personDays, input.phaseShares);
  const changeVolume: TechnicalEstimate["changeVolume"] = {
    domainCount: impactedDomains.length,
    selectedDomainCount: selectedDomainIds.length,
    relationshipCount: relationships.length,
    processCount: processImpactsResult.length,
    apiSurfaceCount: volume.apiSurfaces,
    integrationCount: volume.integrations,
    dataMigrationCount: volume.dataMigrations,
    uiSurfaceCount: volume.uiSurfaces,
    phaseCount: 4,
  };

  const warnings = [
    ...(calendarWeeks === null ? ["تعداد تیم یا ظرفیت مؤثر مشخص نیست؛ زمان تقویمی محاسبه نشده است."] : []),
    ...(calendarWeeks === null ? [] : ["زمان، ظرفیت تجمیعی است و مسیر بحرانی یا تعهد تاریخ تحویل نیست."]),
    ...(relationships.length > 0 ? ["وابستگی‌های دامنه در عمق انتخاب‌شده در حجم تغییر لحاظ شده‌اند."] : []),
    ...(impactedDomains.some((domain) => domain.status === "OPEN_DECISION") ? ["دست‌کم یک دامنهٔ درگیر تصمیم باز دارد."] : []),
    ...(input.effortOverrides.length > 0 ? ["نفر-روز دامنه‌های مشخص‌شده با برآورد مالک جایگزین شده‌اند."] : []),
  ];

  return {
    selectedDomainIds,
    impactedDomains,
    relationships,
    processImpacts: processImpactsResult,
    metrics: { basePersonDays, adjustedBasePersonDays, reservePersonDays, personDays, calendarWeeks },
    phases,
    changeVolume,
    warnings,
  };
}
