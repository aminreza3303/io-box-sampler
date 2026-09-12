import type {
  PriorityCriterion,
  PriorityWeight,
  ScenarioBenefitDriver,
  ScenarioEvidence,
  ScenarioKpi,
  ScenarioMilestone,
  ScenarioSource,
  StrategicScenario,
} from "./scenario-types";

const businessPdf = "NewCash_Strategy_BusinessProfessional_2026-09-12.pdf";
const detailedPdf = "NewCash_Strategy_InDepth_BusinessProfessional_2026-09-12.pdf";
const travelHtml = "newcash-jobs-ideas.html";

function source(document: string, locator: string): ScenarioSource {
  return { document, locator, label: "فرضیهٔ سند" };
}

function documentEvidence(reference: ScenarioSource): ScenarioEvidence {
  return { kind: "document-hypothesis", label: "فرضیهٔ سند", source: reference, confidence: null };
}

function modelDefaultEvidence(description: string): ScenarioEvidence {
  return { kind: "model-default", label: "فرض اولیهٔ مدل", source: description, confidence: null };
}

function walletSources(): ScenarioSource[] {
  return [
    source(businessPdf, "pages 7–8"),
    source(detailedPdf, "pages 7–8"),
  ];
}

function travelSources(part: "A" | "B", ideaNumber: number): ScenarioSource[] {
  return [
    source(travelHtml, `SEC3 · PART ${part} · ideas ${part === "A" ? "1–4" : "5–8"}`),
    source(travelHtml, `SEC3 · PART ${part} · idea ${ideaNumber}`),
    source(travelHtml, "SEC5 · first 30-day actions"),
  ];
}

function kpi(
  id: string,
  name: string,
  unit: string,
  evidence: ScenarioEvidence,
  options: { operator?: "gte" | "lte"; guardrail?: boolean; measurementWindow?: string } = {},
): ScenarioKpi {
  return {
    id,
    name,
    baseline: null,
    target: null,
    unit,
    operator: options.operator ?? "gte",
    measurementWindow: options.measurementWindow ?? "بازهٔ سنجش را مالک تعیین می‌کند",
    actual: null,
    actualAt: null,
    actualSource: null,
    owner: "مالک سنجش تعیین نشده",
    guardrail: options.guardrail ?? false,
    source: evidence,
  };
}

function benefitDriver(id: string, name: string, evidence: ScenarioEvidence): ScenarioBenefitDriver {
  return {
    id,
    name,
    monthlyUnits: null,
    netContributionPerUnit: null,
    startMonth: null,
    probabilityPercent: null,
    source: evidence,
  };
}

function walletScenario(input: {
  id: string;
  title: string;
  summary: string;
  valueHypothesis: string;
  domainIds: string[];
  kpis: Array<{ id: string; name: string; unit: string; guardrail?: boolean; operator?: "gte" | "lte" }>;
  benefitName: string;
  guardrails: string[];
  risks: string[];
  dependencies: string[];
  gateTitle: string;
  gateEvidence: string[];
  difficulty: "low" | "medium" | "high";
  impact: "medium" | "high" | "very-high" | "long-term-high";
  suggestedPhase: 1 | 2 | 3;
}): StrategicScenario {
  const sourceReferences = walletSources();
  const evidence = documentEvidence(sourceReferences[0]);
  return {
    id: input.id,
    track: "wallet",
    lane: "personal-finance",
    title: input.title,
    summary: input.summary,
    valueHypothesis: input.valueHypothesis,
    sourceReferences,
    domainIds: input.domainIds,
    suggestedOwner: null,
    milestones: [],
    benefitDrivers: [benefitDriver(`${input.id}-benefit`, input.benefitName, evidence)],
    kpis: input.kpis.map((item) => kpi(item.id, item.name, item.unit, evidence, item)),
    guardrails: input.guardrails,
    risks: input.risks,
    dependencies: input.dependencies,
    gate: {
      title: input.gateTitle,
      requiredEvidence: input.gateEvidence,
      decision: { decision: null, reason: "", evidence: "", owner: "", reviewDate: null },
    },
    priority: null,
    qualitativePriority: {
      difficulty: input.difficulty,
      impact: input.impact,
      suggestedPhase: input.suggestedPhase,
    },
  };
}

const travelCriterionDefinitions = [
  { id: "customer-linkage", label: "پیوند با زائر فعلی", direction: "higher-is-better" },
  { id: "revenue-speed", label: "سرعت تا درآمد", direction: "higher-is-better" },
  { id: "competitive-advantage", label: "خندق رقابتی", direction: "higher-is-better" },
  { id: "lower-risk", label: "کم‌ریسکی (امتیاز بالاتر یعنی امن‌تر)", direction: "risk-lower-is-better" },
  { id: "brand-impact", label: "اثر بر برند", direction: "higher-is-better" },
] as const;

type TravelScoreVector = [number, number, number, number, number];

function travelPriority(scores: TravelScoreVector, suggestedOrder: number, evidence: ScenarioEvidence) {
  const criteria: PriorityCriterion[] = travelCriterionDefinitions.map((definition, index) => ({
    id: definition.id,
    label: definition.label,
    score: scores[index],
    direction: definition.direction,
    source: evidence,
  }));
  const weights: PriorityWeight[] = travelCriterionDefinitions.map((definition) => ({
    criterionId: definition.id,
    weight: 1,
    source: modelDefaultEvidence("وزن‌های اولیه برابرند و در پنل قابل‌ویرایش هستند."),
  }));
  return { criteria, weights, suggestedOrder };
}

function travelMilestone(input: {
  id: string;
  owner: string;
  outcome: string;
}): ScenarioMilestone {
  return {
    id: `${input.id}-first-step`,
    title: "گام اول پیشنهادی سند",
    stage: "بررسی و آماده‌سازی",
    owner: input.owner,
    targetDay: 30,
    targetDate: null,
    entryCriteria: "دامنهٔ بررسی و مالک در تحلیل سناریو ثبت شوند؛ این پیش‌نویس به‌تنهایی مجوز اجرا نیست.",
    exitCriteria: input.outcome,
    reviewDate: null,
  };
}

function travelScenario(input: {
  id: string;
  lane: "experience" | "access";
  title: string;
  summary: string;
  valueHypothesis: string;
  domainIds: string[];
  part: "A" | "B";
  ideaNumber: number;
  owner: string;
  firstStep: string;
  benefitName: string;
  kpis: Array<{ id: string; name: string; unit: string; guardrail?: boolean; operator?: "gte" | "lte" }>;
  guardrails: string[];
  risks: string[];
  dependencies: string[];
  gateTitle: string;
  gateEvidence: string[];
  scores: TravelScoreVector;
  suggestedOrder: number;
  explicitPresaleTarget?: number;
}): StrategicScenario {
  const sourceReferences = travelSources(input.part, input.ideaNumber);
  const ideaReference = sourceReferences[0];
  const evidence = documentEvidence(ideaReference);
  return {
    id: input.id,
    track: "travel",
    lane: input.lane,
    title: input.title,
    summary: input.summary,
    valueHypothesis: input.valueHypothesis,
    sourceReferences,
    domainIds: input.domainIds,
    suggestedOwner: input.owner,
    milestones: [travelMilestone({ id: input.id, owner: input.owner, outcome: input.firstStep })],
    benefitDrivers: [benefitDriver(`${input.id}-benefit`, input.benefitName, evidence)],
    kpis: input.kpis.map((item) => {
      const metricEvidence = item.id === "travel-nfc-bracelet-presignups" && input.explicitPresaleTarget !== undefined
        ? documentEvidence(source(travelHtml, "SEC5 · first 30-day actions · NFC presale threshold"))
        : evidence;
      const metric = kpi(item.id, item.name, item.unit, metricEvidence, item);
      if (item.id === "travel-nfc-bracelet-presignups" && input.explicitPresaleTarget !== undefined) {
        metric.target = input.explicitPresaleTarget;
      }
      return metric;
    }),
    guardrails: input.guardrails,
    risks: input.risks,
    dependencies: input.dependencies,
    gate: {
      title: input.gateTitle,
      requiredEvidence: input.gateEvidence,
      decision: { decision: null, reason: "", evidence: "", owner: "", reviewDate: null },
    },
    priority: travelPriority(input.scores, input.suggestedOrder, evidence),
    qualitativePriority: null,
  };
}

export const strategicScenarioCatalog: StrategicScenario[] = [
  walletScenario({
    id: "wallet-interactive-demo",
    title: "لندینگ تعاملی و دموی پیش از نصب",
    summary: "پیش از نصب، تجربه‌ای قابل لمس از مسیر ارزشمند محصول در اختیار مخاطب قرار می‌گیرد.",
    valueHypothesis: "دموی تعاملی پیش از نصب می‌تواند فاصلهٔ انتظار تا اولین تجربهٔ ارزشمند را کم و تبدیل بازدید به نصب یا اقدام را بهتر کند؛ هم‌زمانی و صحت دمو با اپ واقعی باید پایش شود.",
    domainIds: ["redesign", "admin-panel", "i18n"],
    kpis: [
      { id: "wallet-demo-visit-conversion", name: "تبدیل بازدید لندینگ به نصب یا اقدام", unit: "درصد" },
      { id: "wallet-demo-time-to-first-action", name: "زمان تا اولین کنش ارزشمند", unit: "زمان", operator: "lte" },
    ],
    benefitName: "اثر تبدیل بازدیدکننده به نصب یا اقدام ارزشمند",
    guardrails: ["دمو باید با برچسب روشن از تراکنش واقعی جدا باشد.", "محتوا و رفتار دمو با نسخهٔ واقعی اپ هم‌راستا بماند."],
    risks: ["اختلاف دمو با تجربهٔ واقعی می‌تواند اعتماد کاربر را کاهش دهد.", "نگهداری هم‌زمان دمو و اپ ممکن است هزینهٔ تغییر ایجاد کند."],
    dependencies: ["ثبت رویدادهای بازدید، نصب و اولین اقدام با تعریف یکسان.", "دسترسی به محتوای به‌روز محصول برای دموی وب."],
    gateTitle: "اعتبار تجربه و سنجش تبدیل",
    gateEvidence: ["سناریوی دمو با مسیر واقعی محصول تطبیق داده شده باشد.", "روش اندازه‌گیری بازدید تا نصب/اقدام و مالک سنجش ثبت شده باشد."],
    difficulty: "low",
    impact: "very-high",
    suggestedPhase: 1,
  }),
  walletScenario({
    id: "wallet-simple-home",
    title: "ساده‌سازی خانه و مسیر سه‌کنشی",
    summary: "شروع محصول حول سه کنش اصلی ساده می‌شود، بی‌آنکه دسترسی کاربران حرفه‌ای به قابلیت‌های عمیق از بین برود.",
    valueHypothesis: "ساده‌سازی رادیکال خانه و مسیرهای آغازین می‌تواند زمان رسیدن به اولین تراکنش یا کنش ارزشمند و رهاشدن مسیر را بهبود دهد؛ قابلیت‌های عمیق باید همچنان در دسترس بمانند.",
    domainIds: ["redesign", "mobile", "profile", "transactions"],
    kpis: [
      { id: "wallet-home-time-to-action", name: "زمان تا اولین تراکنش یا کنش ارزشمند", unit: "زمان", operator: "lte" },
      { id: "wallet-home-path-abandonment", name: "رهاشدن مسیر اصلی", unit: "درصد", operator: "lte" },
    ],
    benefitName: "اثر کاهش اصطکاک مسیرهای آغازین و رهاشدن کار",
    guardrails: ["قابلیت‌های عمیق کاربران حرفه‌ای حذف یا غیرقابل‌کشف نشوند.", "دسترس‌پذیری و پشتیبانی فارسی/عربی در مسیر اصلی حفظ شود."],
    risks: ["ساده‌سازی بیش‌ازحد ممکن است کاربر حرفه‌ای را کند یا محدود کند.", "جابجایی مسیرها می‌تواند آموزش و پشتیبانی را موقتاً افزایش دهد."],
    dependencies: ["تعریف کنش‌های اصلی از دادهٔ رفتار کاربر.", "نقشهٔ فعلی قابلیت‌ها و مسیرهای جایگزین."],
    gateTitle: "اثبات سادگی بدون افت دسترسی",
    gateEvidence: ["سه کنش اصلی و روش سنجش زمان/رهاشدن مشخص شده باشند.", "راه دسترسی به قابلیت‌های عمیق برای کاربران حرفه‌ای در آزمون بررسی شود."],
    difficulty: "medium",
    impact: "high",
    suggestedPhase: 2,
  }),
  walletScenario({
    id: "wallet-round-up",
    title: "پس‌انداز گردشی (Round-up)",
    summary: "باقی‌ماندهٔ خرد تراکنش‌ها با کنترل روشن کاربر به سبد هدف در کیف داخلی هدایت می‌شود.",
    valueHypothesis: "پس‌انداز گردشیِ شفاف و قابل‌توقف می‌تواند رفتار پس‌انداز عادتی را تقویت کند؛ شروع باید در لایهٔ کیف داخلی و با کنترل مجوز، سقف و تسویه انجام شود.",
    domainIds: ["wallet", "transactions", "limits", "policy"],
    kpis: [
      { id: "wallet-round-up-activation", name: "فعال‌سازی پس‌انداز گردشی", unit: "درصد" },
      { id: "wallet-round-up-continuity", name: "تداوم پس‌انداز در دورهٔ سنجش", unit: "درصد" },
      { id: "wallet-round-up-retained-balance", name: "موجودی باقی‌مانده در سبد هدف", unit: "واحد ارز سناریو" },
    ],
    benefitName: "اثر پس‌انداز گردشی بر مانده و تداوم پس‌انداز",
    guardrails: ["پیش‌نمایش مبلغ و رضایت صریح قبل از فعال‌سازی.", "توقف، لغو و بازگردانی باید برای کاربر قابل فهم و در دسترس باشد.", "از نگهداری موازی دفترکل یا پایگاه داده استفاده نشود."],
    risks: ["مجوز، رضایت، تسویه یا مغایرت می‌تواند اعتماد کاربر را آسیب بزند.", "برداشت خرد ناخواسته ممکن است باعث کمبود ماندهٔ قابل‌خرج شود."],
    dependencies: ["ثبت رویداد و دفترکل فعلی کیف.", "موتور سقف و پالیسی برای opt-in، توقف و بازگردانی.", "شروع فقط روی کیف داخلی تا روشن‌شدن دامنهٔ تسویه."],
    gateTitle: "اجازه و تطبیق ماندهٔ داخلی",
    gateEvidence: ["جریان opt-in/opt-out و نحوهٔ توقف تأیید شده باشد.", "تطبیق دفترکل، سقف و قواعد بازگردانی در کیف داخلی آزموده شود.", "شرط مجوز و تسویهٔ بیرونی پیش از گسترش روشن باشد."],
    difficulty: "medium",
    impact: "high",
    suggestedPhase: 2,
  }),
  walletScenario({
    id: "wallet-financial-assistant",
    title: "دستیار مالی شخصیِ قابل‌توضیح",
    summary: "دستیار اختیاری، با توضیح منبع پیشنهاد و کنترل روشن کاربر، رفتار مالی را به بینش و اقدام تبدیل می‌کند.",
    valueHypothesis: "تحلیل رفتار و پیشنهادهای مالی اختیاری می‌تواند مشارکت و انجام اقدام مناسب را بالا ببرد، به‌شرط دادهٔ کافی، opt-in، توضیح منبع و امکان خاموش‌کردن و حذف داده.",
    domainIds: ["wallet", "transactions", "support", "profile", "i18n", "policy"],
    kpis: [
      { id: "wallet-assistant-satisfaction", name: "رضایت از دستیار", unit: "امتیاز" },
      { id: "wallet-assistant-engagement", name: "مشارکت در پیشنهادهای اختیاری", unit: "درصد" },
      { id: "wallet-assistant-completion", name: "انجام پیشنهاد مالی", unit: "درصد" },
    ],
    benefitName: "اثر قابل‌اندازه‌گیری بر انجام پیشنهاد یا هزینهٔ پشتیبانی",
    guardrails: ["پیشنهادها opt-in، قابل‌توضیح، قابل‌خاموش‌کردن و قابل‌حذف باشند.", "منبع داده و عدم‌قطعیت پاسخ نمایش داده شود.", "درخواست حساس یا نامطمئن به پشتیبانی انسانی ارجاع شود."],
    risks: ["دادهٔ کم یا نادرست می‌تواند پیشنهاد نامناسب ایجاد کند.", "ابهام در استفاده از دادهٔ مالی می‌تواند اعتماد و حریم خصوصی را تضعیف کند."],
    dependencies: ["دادهٔ رفتار مالی کافی و مجاز.", "تعریف دسترسی، رضایت، نگهداری و حذف داده.", "منابع معتبر پیشنهاد و مسیر پشتیبانی انسانی."],
    gateTitle: "آمادگی داده و کنترل کاربر",
    gateEvidence: ["کفایت و مجوز داده برای پایلوت مستند شود.", "opt-in، توضیح منبع، خاموش‌کردن و حذف داده آزموده شوند.", "کیفیت پیشنهاد و مسیر ارجاع انسانی معیار روشن داشته باشد."],
    difficulty: "high",
    impact: "long-term-high",
    suggestedPhase: 3,
  }),
  walletScenario({
    id: "wallet-savings-gamification",
    title: "بازی‌وارسازی پس‌انداز",
    summary: "چالش و پیشرفت بر رفتار واقعی پس‌انداز بنا می‌شود، نه صرفاً بازکردن اپ.",
    valueHypothesis: "چالش‌ها و پیشرفت قابل مشاهده می‌توانند تکمیل هدف و تداوم پس‌انداز واقعی را تقویت کنند؛ افزایش تعامل بدون بهبود پس‌انداز باید به توقف یا بازطراحی منجر شود.",
    domainIds: ["wallet", "transactions", "redesign", "profile"],
    kpis: [
      { id: "wallet-gamification-goal-completion", name: "تکمیل هدف پس‌انداز", unit: "درصد" },
      { id: "wallet-gamification-savings-continuity", name: "تداوم پس‌انداز واقعی", unit: "درصد" },
    ],
    benefitName: "اثر تکمیل هدف و تداوم پس‌انداز واقعی",
    guardrails: ["بازشدن اپ به‌تنهایی معیار موفقیت نباشد.", "مقایسهٔ اجتماعی و طراحی رفتار آسیب‌زا به حداقل برسد.", "نتیجهٔ واقعی ماندهٔ پس‌انداز در معیار موفقیت بماند."],
    risks: ["تعامل بیشتر بدون بهبود رفتار پس‌انداز می‌تواند گمراه‌کننده باشد.", "چالش نامناسب ممکن است کاربر را به هدف مالی ناسازگار سوق دهد."],
    dependencies: ["تعریف هدف پس‌انداز و مشاهدهٔ ماندهٔ واقعی در کیف.", "رویدادهای قابل اتکا برای تداوم و تکمیل هدف."],
    gateTitle: "اثر بر پس‌انداز واقعی",
    gateEvidence: ["شاخص تکمیل و تداوم پس‌انداز واقعی تعریف شده باشد.", "اگر تعامل بالا رود اما پس‌انداز واقعی بهتر نشود، توقف/بازطراحی ثبت شود."],
    difficulty: "medium",
    impact: "medium",
    suggestedPhase: 3,
  }),
  travelScenario({
    id: "travel-one-touch-bundle",
    lane: "experience",
    title: "بستهٔ سفر یک‌لمسی",
    summary: "اجزای سفر زیارتی در سه بستهٔ اقتصادی، استاندارد و VIP با یک قیمت و یک جریان سفارش جمع می‌شوند.",
    valueHypothesis: "فروش بستهٔ یک‌قیمت می‌تواند پراکندگی خرید سفر را کم کند و از حاشیهٔ بسته، اسپرد تبدیل و فروش افزودهٔ بیمه ارزش بسازد؛ اعداد سودآوری باید با دادهٔ واقعی هر SKU سنجیده شوند.",
    domainIds: ["tickets", "hotel", "wallet", "card", "insurance", "currency"],
    part: "A",
    ideaNumber: 1,
    owner: "مدیر محصول سفر",
    firstStep: "تعریف سه SKU اقتصادی/استاندارد/VIP، قیمت‌گذاری بر پایهٔ مارجین و طراحی جدول bundle.",
    benefitName: "حاشیهٔ خالص بسته به‌علاوهٔ اسپرد تبدیل و فروش افزودهٔ بیمه (فرض سند: آغاز درآمد ماه ۲–۳)",
    kpis: [
      { id: "travel-bundle-net-margin", name: "حاشیهٔ خالص هر بسته", unit: "ارز سناریو" },
      { id: "travel-bundle-conversion", name: "تبدیل مشاهدهٔ پیشنهاد به خرید بسته", unit: "درصد" },
    ],
    guardrails: ["موجودی، ارز تسویه و قیمت هر جزء پیش از فروش بسته بررسی شود.", "از دفترکل یا پایگاه دادهٔ موازی برای bundle استفاده نشود.", "تخفیف از سقف و مارجین مصوب تجاوز نکند."],
    risks: ["قیمت‌گذاری اشتباه می‌تواند مارجین را منفی کند.", "وابستگی به موجودی چند تأمین‌کننده می‌تواند تجربهٔ سفارش را مختل کند."],
    dependencies: ["وضعیت موجودی بلیت و هتل از منابع فعلی.", "قاعدهٔ تسویهٔ ارزی S-1 در هسته.", "تعریف bundle و جریان سفارش ترکیبی روی هستهٔ موجود."],
    gateTitle: "حاشیه و موجودی واقعی سه SKU",
    gateEvidence: ["برای هر SKU قیمت، هزینه و مارجین با منبع ثبت شده باشد.", "تأمین و لغو اجزای بلیت/هتل قابل پوشش باشد.", "مسیر تسویه با ارز هر تأمین‌کننده بررسی شود."],
    scores: [5, 4, 4, 4, 5],
    suggestedOrder: 2,
  }),
  travelScenario({
    id: "travel-ziyarat-mode",
    lane: "experience",
    title: "حالت زیارت؛ تجربهٔ شش‌اقدامی",
    summary: "در زمان سفر، اپ به شش اقدام مرتبط محدود می‌شود و خدمات عمیق‌تر همچنان در دسترس می‌مانند.",
    valueHypothesis: "یک لایهٔ تجربهٔ ساده بر دامنه‌های فعلی می‌تواند زمان رسیدن به اقدام و نگهداشت زائر را بهتر کند و ویترین بسته، Pass و دستیار باشد؛ سند اثر نگهداشت را از ماه ۱ فرض می‌کند. ایده عمدتاً UI است و بک‌اند/مجوز تازه پیش‌فرض گرفته نمی‌شود.",
    domainIds: ["redesign", "mobile", "i18n", "tickets", "hotel", "support", "wallet"],
    part: "A",
    ideaNumber: 2,
    owner: "طراح ارشد UX",
    firstStep: "طراحی شش دکمه و منطق تشخیص سفر (تاریخ بلیت/GPS)؛ اجرای تست A/B روی کاربران فعلی.",
    benefitName: "اثر نگهداشت و تبدیل ایده‌های مکمل سفر",
    kpis: [
      { id: "travel-ziyarat-time-to-action", name: "زمان تا اقدام اصلی در حالت زیارت", unit: "زمان", operator: "lte" },
      { id: "travel-ziyarat-retention", name: "نگهداشت کاربران واجد سفر", unit: "درصد" },
    ],
    guardrails: ["قابلیت‌های دیگر اپ حذف نشوند و مسیر بازگشت به تجربهٔ کامل روشن باشد.", "تشخیص سفر به‌صورت خودکار خطای پرهزینه یا افشای داده ایجاد نکند.", "تست A/B و گروه مقایسه پیش از ادعای اثر تعریف شوند."],
    risks: ["تشخیص اشتباه سفر می‌تواند صفحهٔ نامرتبط نشان دهد.", "پنهان‌شدن قابلیت‌ها ممکن است تجربهٔ کاربر حرفه‌ای را بدتر کند."],
    dependencies: ["تاریخ بلیت/GPS فقط با مجوز مناسب برای تشخیص سفر.", "APIهای خدمات موجود؛ بدون بک‌اند جدید در فرض اولیه.", "اندازه‌گیری زمان اقدام و نگهداشت کاربران فعلی."],
    gateTitle: "تجربهٔ کم‌ریسک و حفظ دسترسی",
    gateEvidence: ["طرح شش اقدام و مسیر کامل اپ در کنار هم آزمون شده باشد.", "مجوز و دقت تشخیص سفر بررسی شود.", "نتیجهٔ تست A/B و معیار نگهداشت ثبت شود."],
    scores: [5, 5, 3, 5, 5],
    suggestedOrder: 1,
  }),
  travelScenario({
    id: "travel-newcash-pass",
    lane: "experience",
    title: "اشتراک NewCash Pass",
    summary: "یک اشتراک سفر، مزایای مشخصی مانند اسپرد بهتر، لانج، بیمه و تخفیف پذیرندگان را در یک قیمت عرضه می‌کند.",
    valueHypothesis: "اشتراک فصلی یا سالانه می‌تواند درآمد تکرارشونده و چسبندگی ایجاد کند، به‌شرط آنکه ارزش مزایا برای زائر روشن و مارجین آن پس از هزینهٔ مزایا مثبت باشد.",
    domainIds: ["insurance", "special-offer", "card", "wallet", "qr"],
    part: "A",
    ideaNumber: 3,
    owner: "مدیر رشد",
    firstStep: "بستهٔ مزایا بر پایهٔ فیچر پرمیوم ۱۳، قیمت‌گذاری و صف تمدید طراحی شود.",
    benefitName: "درآمد تکرارشوندهٔ اشتراک و اثر تمدید (فرض سند: آغاز درآمد ماه ۲)",
    kpis: [
      { id: "travel-pass-renewal", name: "نرخ تمدید اشتراک", unit: "درصد" },
      { id: "travel-pass-net-margin", name: "حاشیهٔ خالص اشتراک پس از مزایا", unit: "ارز سناریو" },
    ],
    guardrails: ["هزینه و محدودیت هر مزیت قبل از عرضه محاسبه شود.", "مزایای قابل استفاده و شرایط تمدید شفاف باشند.", "درآمد تکرارشونده با درآمد ناخالص اشتباه نشود."],
    risks: ["ارزش مزایا ممکن است برای تمدید کافی نباشد.", "مصرف مزایا می‌تواند از درآمد اشتراک بیشتر شود."],
    dependencies: ["مزایای پرمیوم موجود و قرارداد لانج/بیمه/پذیرندگان.", "تعریف ثبت خرید و تمدید روی سامانهٔ فعلی."],
    gateTitle: "ارزش قابل تمدید و اقتصاد مزایا",
    gateEvidence: ["قیمت و مارجین پس از محاسبهٔ مصرف مزایا ثبت شده باشد.", "فرض تمدید با کاربران فعلی سنجیده شود.", "مسیر قرارداد و عرضهٔ مزایای شریک روشن باشد."],
    scores: [4, 4, 3, 4, 4],
    suggestedOrder: 3,
  }),
  travelScenario({
    id: "travel-arabic-softpos",
    lane: "access",
    title: "SoftPOS عربی برای پذیرندگان",
    summary: "نماینده و مغازه‌دار واجد شرایط بتواند با گوشی سازگار خود، پرداخت پذیرندگی را بپذیرد؛ QR موجود مسیر جایگزین می‌ماند.",
    valueHypothesis: "SoftPOS می‌تواند شبکهٔ پذیرش را بدون خرید گستردهٔ دستگاه توسعه دهد؛ شروع آن به مسیر مجوز و انطباق PCI MPoC و بانک صادرکننده وابسته است.",
    domainIds: ["qr", "card", "agents", "i18n", "limits", "policy"],
    part: "A",
    ideaNumber: 4,
    owner: "مدیر فنی (CTO)",
    firstStep: "SDK استاندارد PCI MPoC انتخاب و درخواست مجوز با بانک صادرکننده آغاز شود.",
    benefitName: "حاشیهٔ خالص کارمزد پذیرندگی فعال (فرض سند: آغاز درآمد ماه ۶–۹)",
    kpis: [
      { id: "travel-softpos-active-merchants", name: "پذیرندگان فعال SoftPOS", unit: "پذیرنده" },
      { id: "travel-softpos-net-fee-margin", name: "حاشیهٔ خالص کارمزد", unit: "ارز سناریو" },
    ],
    guardrails: ["بدون مسیر مجوز/انطباق تأییدشده دریافت یا پردازش پرداخت انجام نشود.", "QR فعلی تا احراز آمادگی SoftPOS به‌عنوان fallback باقی بماند.", "امنیت دستگاه، کارت و عملیات ممیزی شود."],
    risks: ["مجوز و انطباق MPoC می‌تواند زمان‌بر یا ناممکن باشد.", "دستگاه یا SDK ناسازگار ریسک امنیتی و عملیاتی ایجاد می‌کند."],
    dependencies: ["SDK سازگار و آزمودهٔ PCI MPoC.", "بانک صادرکننده و مسیر مجوز روشن.", "شبکهٔ فعلی نمایندگان و موتور QR."],
    gateTitle: "مجوز و انطباق پیش از پایلوت پرداخت",
    gateEvidence: ["نظر مکتوب بانک صادرکننده دربارهٔ مسیر مجوز موجود باشد.", "SDK و کنترل‌های MPoC بررسی شده باشند.", "طرح fallback به QR و کنترل امنیتی پایلوت مستند باشد."],
    scores: [4, 4, 4, 3, 4],
    suggestedOrder: 4,
  }),
  travelScenario({
    id: "travel-pilgrim-counter",
    lane: "access",
    title: "پیشخوان زائر؛ کیوسک فرودگاه",
    summary: "زائر در یک پیشخوان سبک، با احراز هویت و صدور کارت/شارژ، از لحظهٔ ورود به خدمت متصل می‌شود.",
    valueHypothesis: "کیوسک یا پیشخوان در فرودگاه مشهد و مرز نجف می‌تواند تجربهٔ ورود و جذب کاربر را کوتاه کند؛ feasibility مکان، مجوز و مدل کمیسیون باید پیش از هزینهٔ ثابت روشن شود.",
    domainIds: ["agents", "kyc", "card", "wallet", "currency"],
    part: "B",
    ideaNumber: 5,
    owner: "توسعه بین‌الملل",
    firstStep: "feasibility فرودگاه مشهد/مرز نجف و بریف فرنچایز شبکهٔ نمایندگان تهیه شود.",
    benefitName: "کارمزد صدور، شارژ اولیه و اسپرد به‌ازای هر محل (فرض سند: آغاز درآمد از ماه ۶)",
    kpis: [
      { id: "travel-counter-acquisition-cost", name: "هزینهٔ جذب هر کاربر در پیشخوان", unit: "ارز سناریو", operator: "lte" },
      { id: "travel-counter-successful-issue-load", name: "صدور و شارژ موفق", unit: "درصد" },
      { id: "travel-counter-location-economics", name: "اقتصاد خالص هر محل", unit: "ارز سناریو" },
    ],
    guardrails: ["شروع فقط پس از امکان‌سنجی کتبی مکان، مجوز و شریک.", "مدل کمیسیون به نماینده بر اجارهٔ ثابت اولویت دارد.", "KYC و صدور کارت مطابق کنترل‌های موجود انجام شود."],
    risks: ["هزینه و مجوز مکان فرودگاهی/مرزی می‌تواند پایلوت را غیرممکن کند.", "ترافیک پایین یا خرابی عملیات می‌تواند اقتصاد محل را منفی کند."],
    dependencies: ["توافق فرودگاه/آستان و شریک اجرایی.", "شبکهٔ نمایندگان و جریان KYC، صدور کارت و شارژ.", "مدل اقتصادی هر محل با هزینه و کمیسیون واقعی."],
    gateTitle: "امکان‌سنجی مکان و شریک اجرایی",
    gateEvidence: ["مجوز و امکان فعالیت در دو مکان کاندید بررسی شده باشد.", "هزینهٔ راه‌اندازی و اقتصاد هر محل با مدل کمیسیونی سنجیده شود.", "شریک فرنچایز و مسئولیت KYC/عملیات مشخص باشند."],
    scores: [4, 3, 4, 3, 5],
    suggestedOrder: 5,
  }),
  travelScenario({
    id: "travel-pilgrim-assistant",
    lane: "experience",
    title: "دستیار زیارت؛ هوش مصنوعی عربی",
    summary: "زائر به‌جای جست‌وجو میان خدمات، سؤال می‌پرسد و پاسخ قابل استناد یا ارجاع انسانی می‌گیرد.",
    valueHypothesis: "دستیار عربی مبتنی بر RAG می‌تواند کشف خدمت را ساده و بخشی از بار پشتیبانی را کاهش دهد؛ فقط منابع مصوب، نمایش عدم‌قطعیت و ارجاع پرسش حساس به اپراتور مجاز است.",
    domainIds: ["support", "i18n", "tickets", "hotel", "wallet", "transactions"],
    part: "B",
    ideaNumber: 6,
    owner: "مدیر فنی (CTO)",
    firstStep: "پایلوت RAG عربی روی ۵۰ پرسش پرتکرار با پاسخ اپراتور پشتیبان اجرا شود.",
    benefitName: "کاهش قابل‌سنجش بار پشتیبانی و اثر بر اشتراک Pass (فرض سند: صرفه‌جویی از ماه ۴)",
    kpis: [
      { id: "travel-assistant-answer-quality", name: "کیفیت پاسخ دستیار", unit: "درصد پاسخ درست" },
      { id: "travel-assistant-correct-handoff", name: "ارجاع صحیح پرسش حساس به انسان", unit: "درصد" },
      { id: "travel-assistant-support-load", name: "بار پشتیبانی برای موضوعات پوشش‌داده‌شده", unit: "حجم", operator: "lte" },
    ],
    guardrails: ["پاسخ از FAQ/کاتالوگ/قواعد مصوب باشد و منبع نمایش داده شود.", "پرسش شرعی، حقوقی، سقف یا حساس با عدم‌قطعیت برچسب و به انسان ارجاع شود.", "کیفیت پاسخ و ارجاع پیش از گسترش بازبینی شود."],
    risks: ["خطای پاسخ می‌تواند زیان مالی یا آسیب به کاربر ایجاد کند.", "منبع قدیمی یا ناقص پاسخ ظاهراً مطمئن اما نادرست می‌سازد."],
    dependencies: ["FAQ و کاتالوگ عربیِ تأییدشده.", "قواعد سقف و خدمات با مالک و تاریخ به‌روز.", "چت فعلی و صف پشتیبانی انسانی برای handoff."],
    gateTitle: "منبع مجاز و ارجاع انسانی مطمئن",
    gateEvidence: ["منابع و مالک به‌روزرسانی محتوا تأیید شده باشد.", "برچسب عدم‌قطعیت و handoff پرسش حساس آزموده شود.", "معیار کیفیت پاسخ روی پرسش‌های پرتکرار ثبت شود."],
    scores: [4, 3, 3, 4, 4],
    suggestedOrder: 6,
  }),
  travelScenario({
    id: "travel-trusted-hosts",
    lane: "access",
    title: "میزبان معتمد؛ بازار راهنمای P2P",
    summary: "راهنمای محلی احرازشده، رزرو و پرداخت امن در کیف را تا پس از خدمت ارائه می‌کند.",
    valueHypothesis: "بازار میزبان معتمد می‌تواند دسترسی به راهنمای محلی و درآمد کمیسیون بسازد؛ اعتماد به احراز هویت، escrow، کیفیت خدمت و فرایند بازپرداخت وابسته است.",
    domainIds: ["agents", "kyc", "wallet", "qr", "support", "policy"],
    part: "B",
    ideaNumber: 7,
    owner: "مدیر محصول بازار",
    firstStep: "۲۰ میزبان پایلوت از شبکهٔ فعلی انتخاب و پروتکل escrow/رزرو تعریف شود.",
    benefitName: "کمیسیون خالص رزرو پس از هزینهٔ خدمت و بازپرداخت (فرض سند: درآمد از ماه ۹)",
    kpis: [
      { id: "travel-hosts-net-booking-commission", name: "کمیسیون خالص رزرو", unit: "ارز سناریو" },
      { id: "travel-hosts-service-quality", name: "کیفیت خدمت میزبان", unit: "امتیاز" },
      { id: "travel-hosts-refund-rate", name: "نرخ بازپرداخت/شکایت", unit: "درصد", operator: "lte" },
    ],
    guardrails: ["هویت میزبان و سطح خدمت پیش از عرضه بررسی شود.", "وجه رزرو مطابق ضوابط و بدون ادعای escrow تأییدنشده نگهداری شود.", "امکان شکایت، بازپرداخت و مسدودسازی سریع وجود داشته باشد."],
    risks: ["کیفیت ضعیف یا آسیب میزبان به اعتبار پلتفرم لطمه می‌زند.", "تعهدهای پرداخت/مسئولیت پلتفرم ممکن است نیازمند مجوز و قرارداد باشد."],
    dependencies: ["KYC میزبان‌ها و انتخاب پایلوت از شبکهٔ نمایندگان.", "پروتکل حقوقی و عملیاتی رزرو، نگهداری وجه و بازپرداخت.", "پشتیبانی شکایت و امتیازدهی با مالک مشخص."],
    gateTitle: "هویت، escrow و کنترل کیفیت خدمت",
    gateEvidence: ["هویت ۲۰ میزبان پایلوت راستی‌آزمایی شده باشد.", "مدل نگهداری وجه/تسویه و مسئولیت بازپرداخت بررسی شود.", "سقف رزرو میزبان تازه‌وارد و مسیر مسدودسازی روشن باشد."],
    scores: [3, 3, 4, 3, 4],
    suggestedOrder: 7,
  }),
  travelScenario({
    id: "travel-nfc-bracelet",
    lane: "access",
    title: "دستبند زائر؛ پرداخت و ایمنی NFC",
    summary: "دستبند متصل به کیف یا کارت می‌تواند پرداخت را در ازدحام ساده کند و مسیر دسترسی اضطراری داشته باشد.",
    valueHypothesis: "دستبند NFC می‌تواند تجربهٔ پرداخت بدون گوشی و دسترسی اضطراری را در ازدحام بهبود دهد؛ تولید و rollout فقط پس از پیش‌ثبت‌نام، شریک تولید و سنجش اقتصاد سخت‌افزار بررسی می‌شود.",
    domainIds: ["card", "wallet", "limits", "agents", "policy"],
    part: "B",
    ideaNumber: 8,
    owner: "مدیر محصول کارت",
    firstStep: "بریف شریک تولید و صف پیش‌ثبت‌نام با آستانهٔ پیشنهادی ۱۰٬۰۰۰ نفر آماده شود.",
    benefitName: "فروش/رهن دستبند، کارمزد تراکنش و اسپانسرینگ احتمالی (فرض سند: افق درآمد ماه ۱۲ به بعد)",
    kpis: [
      { id: "travel-nfc-bracelet-presignups", name: "پیش‌ثبت‌نام واجد شرایط", unit: "ثبت‌نام", guardrail: true },
      { id: "travel-nfc-hardware-economics", name: "اقتصاد خالص سخت‌افزار هر دستبند", unit: "ارز سناریو" },
      { id: "travel-nfc-successful-transactions", name: "تراکنش موفق دستبند", unit: "درصد" },
    ],
    guardrails: ["آستانهٔ ۱۰٬۰۰۰ پیش‌ثبت‌نام فرضیهٔ سند است و پیش از سفارش واقعی سنجیده می‌شود.", "سقف کارت/کیف، توکن‌سازی و مسدودسازی گم‌شدن دستبند روشن باشد.", "سازگاری و پشتیبانی سخت‌افزار پیش از rollout بررسی شود."],
    risks: ["زنجیرهٔ تأمین و خدمات پس از فروش می‌تواند هزینه‌زا باشد.", "سقف یا امنیت ناکافی اتصال کارت/کیف امکان زیان ایجاد می‌کند."],
    dependencies: ["شریک تولید و امکان پشتیبانی منطقه‌ای.", "اتصال NFC به کیف/کارت فعلی با توکن‌سازی و موتور سقف.", "فرایند گم‌شدن، غیرفعال‌سازی و بازیابی."],
    gateTitle: "پیش‌فروش، شریک تولید و سازگاری کارت",
    gateEvidence: ["آستانهٔ پیش‌ثبت‌نام و کیفیت ثبت علاقه سنجیده شود.", "پیشنهاد شریک تولید و هزینهٔ سخت‌افزار دریافت شود.", "سازگاری کارت/سقف/توکن و مسدودسازی تست شود."],
    scores: [3, 2, 5, 2, 5],
    suggestedOrder: 8,
    explicitPresaleTarget: 10_000,
  }),
];

export function getStrategicScenario(id: string): StrategicScenario | undefined {
  return strategicScenarioCatalog.find((scenario) => scenario.id === id);
}
