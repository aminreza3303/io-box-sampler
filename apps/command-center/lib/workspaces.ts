export type WorkspaceKind = "operations" | "finance" | "admin";
export type ProcessStepStatus = "ready" | "control" | "blocked" | "planned";

export type ProcessDefinition = {
  id: string;
  title: string;
  kind: WorkspaceKind;
  owner: string;
  summary: string;
  status: "active" | "review" | "planned";
  readOnly?: boolean;
  requiresCeoApproval?: boolean;
  inputs: string[];
  outputs: string[];
  controls: string[];
  steps: Array<{
    id: string;
    title: string;
    description: string;
    owner: string;
    status: ProcessStepStatus;
    controls: string[];
  }>;
};

const operations: ProcessDefinition[] = [
  {
    id: "identity-and-kyc",
    title: "ثبت‌نام و احراز هویت",
    kind: "operations",
    owner: "تیم شاطی",
    summary: "از ایجاد حساب تا بررسی مدارک، فعال‌سازی مشتری و ثبت نتیجه کنترل‌ها.",
    status: "active",
    inputs: ["مشخصات مشتری", "مدرک هویتی", "نتیجه تطبیق"],
    outputs: ["هویت تأییدشده", "پرونده بررسی", "محدودیت‌های اولیه"],
    controls: ["ثبت کامل ردپا", "کنترل تکراری بودن هویت", "صف بررسی دستی"],
    steps: [
      { id: "capture", title: "دریافت اطلاعات", description: "ثبت مشخصات و رضایت‌های لازم مشتری.", owner: "محصول", status: "ready", controls: ["اعتبارسنجی ورودی"] },
      { id: "verify", title: "تطبیق و بررسی", description: "اجرای کنترل‌های هویتی و ارجاع موارد مشکوک.", owner: "ریسک", status: "control", controls: ["ممیزی تصمیم", "تفکیک وظایف"] },
      { id: "activate", title: "فعال‌سازی", description: "فعال‌کردن دسترسی‌ها پس از عبور از کنترل‌ها.", owner: "توسعه", status: "ready", controls: ["اصل حداقل دسترسی"] },
    ],
  },
  {
    id: "card-lifecycle",
    title: "صدور و چرخه عمر کارت",
    kind: "operations",
    owner: "تیم شاطی",
    summary: "مدیریت درخواست، صدور، فعال‌سازی، مسدودی و جایگزینی کارت.",
    status: "active",
    inputs: ["درخواست مشتری", "وضعیت حساب", "آدرس تحویل"],
    outputs: ["کارت فعال", "وضعیت ارسال", "گزارش رویداد"],
    controls: ["احراز هویت مرحله‌ای", "تطبیق مالک کارت", "محدودیت صدور"],
    steps: [
      { id: "request", title: "درخواست", description: "ثبت درخواست کارت و کنترل شرایط دریافت.", owner: "محصول", status: "ready", controls: ["بررسی شرایط"] },
      { id: "issue", title: "صدور و ارسال", description: "ارسال وضعیت امن به سرویس صدور و پیگیری تحویل.", owner: "عملیات", status: "control", controls: ["کلیدگذاری امن"] },
      { id: "manage", title: "مدیریت کارت", description: "فعال‌سازی، مسدودی و جایگزینی با ثبت علت.", owner: "پشتیبانی", status: "ready", controls: ["ثبت علت تغییر"] },
    ],
  },
  {
    id: "transfer",
    title: "انتقال وجه",
    kind: "operations",
    owner: "تیم نیوکاش",
    summary: "تشکیل درخواست انتقال، کنترل سقف و ریسک، سپس هماهنگی با دفترکل.",
    status: "review",
    inputs: ["مبدأ و مقصد", "مبلغ و ارز", "دلیل انتقال"],
    outputs: ["درخواست انتقال", "وضعیت تسویه", "رسید قابل رهگیری"],
    controls: ["کنترل موجودی", "کنترل سقف", "تأیید موارد پرریسک"],
    steps: [
      { id: "intent", title: "تشکیل درخواست", description: "ساخت درخواست غیرقابل‌ابهام با مقصد و ارز مشخص.", owner: "محصول", status: "ready", controls: ["تأیید دو مرحله‌ای"] },
      { id: "screen", title: "کنترل ریسک", description: "بررسی سقف‌ها، موجودی و نشانه‌های ریسک.", owner: "مالی", status: "control", controls: ["قواعد قابل ممیزی"] },
      { id: "settle", title: "تسویه و رسید", description: "ارسال برای تسویه و ثبت نتیجه در دفترکل.", owner: "توسعه", status: "blocked", controls: ["عدم تکرار درخواست"] },
    ],
  },
  {
    id: "merchant-qr",
    title: "پذیرنده، QR و پیشنهاد",
    kind: "operations",
    owner: "تیم تراز",
    summary: "ثبت پذیرنده، ساخت QR، اعمال پیشنهاد و گزارش تسویه به پذیرنده.",
    status: "active",
    inputs: ["پرونده پذیرنده", "قوانین پیشنهاد", "رویداد خرید"],
    outputs: ["پذیرنده فعال", "تراکنش ثبت‌شده", "محاسبه پاداش"],
    controls: ["تطبیق پذیرنده", "ضدتقلب", "سقف پیشنهاد"],
    steps: [
      { id: "onboard", title: "ثبت پذیرنده", description: "دریافت اطلاعات کسب‌وکار و ارزیابی اولیه.", owner: "عملیات", status: "ready", controls: ["تأیید مدارک"] },
      { id: "pay", title: "پرداخت با QR", description: "ثبت پرداخت با شناسه یکتا و وضعیت روشن.", owner: "توسعه", status: "ready", controls: ["کلید idempotency"] },
      { id: "offer", title: "پیشنهاد و تسویه", description: "محاسبه پیشنهاد واجد شرایط و آماده‌سازی تسویه.", owner: "رشد", status: "control", controls: ["ثبت نسخه قانون"] },
    ],
  },
  {
    id: "customer-support",
    title: "پشتیبانی و رسیدگی",
    kind: "operations",
    owner: "تیم شاطی",
    summary: "دریافت درخواست، اولویت‌بندی، پاسخ‌گویی و بستن تیکت با رضایت‌سنجی.",
    status: "active",
    inputs: ["پیام مشتری", "تاریخچه حساب", "رویداد محصول"],
    outputs: ["تیکت پاسخ‌داده‌شده", "ارجاع تخصصی", "سیگنال بهبود"],
    controls: ["سطح دسترسی داده", "SLA", "ثبت علت ارجاع"],
    steps: [
      { id: "intake", title: "دریافت و دسته‌بندی", description: "ساخت تیکت و تعیین فوریت و موضوع.", owner: "پشتیبانی", status: "ready", controls: ["حذف داده حساس"] },
      { id: "resolve", title: "پاسخ یا ارجاع", description: "پاسخ با دانش تأییدشده یا ارجاع به مالک فرایند.", owner: "مادر Hermes", status: "control", controls: ["پیشنهاد هوش مصنوعی"] },
      { id: "close", title: "بستن و یادگیری", description: "ثبت نتیجه و استخراج مسئله تکرارشونده.", owner: "محصول", status: "planned", controls: ["تأیید مشتری"] },
    ],
  },
  {
    id: "top-up-and-orders",
    title: "شارژ حساب و سفارش‌ها",
    kind: "operations",
    owner: "تیم نیوکاش",
    summary: "مدیریت درخواست شارژ، وضعیت سفارش و بازگشت وجه در صورت خطا.",
    status: "review",
    inputs: ["درخواست شارژ", "روش پرداخت", "وضعیت سفارش"],
    outputs: ["موجودی در انتظار", "سفارش نهایی", "درخواست بازگشت"],
    controls: ["تفکیک وضعیت مجوز و تسویه", "ثبت بازگشت", "کنترل تکرار"],
    steps: [
      { id: "authorize", title: "مجوز پرداخت", description: "ثبت درخواست و نتیجه مجوز بدون ادعای تسویه.", owner: "مالی", status: "control", controls: ["دو وضعیت مجزا"] },
      { id: "order", title: "هماهنگی سفارش", description: "اتصال نتیجه به سفارش و دفترکل داخلی.", owner: "توسعه", status: "ready", controls: ["ردپای کامل"] },
      { id: "refund", title: "بازگشت وجه", description: "ساخت پیشنهاد بازگشت برای تأیید مالک مالی.", owner: "مالی", status: "planned", controls: ["تأیید انسانی"] },
    ],
  },
];

const finance: ProcessDefinition[] = [
  {
    id: "multi-currency-ledger",
    title: "کیف پول چندارزی و دفترکل",
    kind: "finance",
    owner: "تیم نیوکاش",
    summary: "نمایش موجودی، ثبت دوطرفه رویدادها و تطبیق دفترکل با وضعیت عملیاتی.",
    status: "active",
    readOnly: true,
    requiresCeoApproval: true,
    inputs: ["رویداد مالی", "ارز و حساب", "نتیجه تسویه"],
    outputs: ["موجودی قابل مشاهده", "دفترکل دوطرفه", "مغایرت‌ها"],
    controls: ["ثبت دوطرفه", "تطبیق روزانه", "عدم تغییر مستقیم موجودی"],
    steps: [
      { id: "event", title: "دریافت رویداد", description: "دریافت رویداد معتبر از فرایند عملیاتی.", owner: "توسعه", status: "ready", controls: ["اعتبارسنجی امضا"] },
      { id: "post", title: "ثبت دفترکل", description: "ساخت ثبت‌های بدهکار و بستانکار قابل بازسازی.", owner: "مالی", status: "control", controls: ["کنترل تعادل"] },
      { id: "reconcile", title: "تطبیق", description: "شناسایی مغایرت و آماده‌سازی پیشنهاد اصلاح.", owner: "بازرس مالی", status: "control", controls: ["تأیید مدیرعامل"] },
    ],
  },
  {
    id: "fx-trading",
    title: "خرید و فروش ارز",
    kind: "finance",
    owner: "تیم نیوکاش",
    summary: "محاسبه نرخ، کنترل موجودی و ساخت پیشنهاد معامله بدون اجرای واقعی در پنل.",
    status: "review",
    readOnly: true,
    requiresCeoApproval: true,
    inputs: ["ارز مبدأ و مقصد", "مبلغ", "نرخ مرجع"],
    outputs: ["پیش‌نمایش معامله", "کارمزد پیشنهادی", "هشدار ریسک"],
    controls: ["نرخ با زمان اعتبار", "سقف معامله", "اجرای فقط پس از تأیید"],
    steps: [
      { id: "quote", title: "محاسبه نرخ", description: "تهیه قیمت با زمان انقضا و منبع مشخص.", owner: "مالی", status: "ready", controls: ["ثبت منبع نرخ"] },
      { id: "risk", title: "کنترل معامله", description: "بررسی سقف، موجودی و ریسک نقدینگی.", owner: "ریسک", status: "control", controls: ["تفکیک وظایف"] },
      { id: "proposal", title: "پیشنهاد تأیید", description: "ارسال خلاصه برای تأیید مدیرعامل یا مالک مجاز.", owner: "مادر Hermes", status: "control", controls: ["بدون اجرای خودکار"] },
    ],
  },
  {
    id: "limits-engine",
    title: "موتور سقف‌ها و کارمزد",
    kind: "finance",
    owner: "تیم تراز",
    summary: "مدیریت سقف‌های مشتری، تیم و محصول با نسخه‌بندی و اثر قابل مشاهده.",
    status: "active",
    readOnly: true,
    requiresCeoApproval: true,
    inputs: ["سطح مشتری", "نوع عملیات", "سیاست ریسک"],
    outputs: ["تصمیم سقف", "کارمزد محاسبه‌شده", "هشدار عبور"],
    controls: ["نسخه‌بندی سیاست", "آزمون قبل از انتشار", "تأیید مدیرعامل"],
    steps: [
      { id: "catalog", title: "کاتالوگ سیاست", description: "تعریف سقف و کارمزد با دامنه روشن.", owner: "ادمین", status: "ready", controls: ["شناسه نسخه"] },
      { id: "simulate", title: "شبیه‌سازی", description: "بررسی اثر سیاست روی سناریوهای منتخب.", owner: "تحلیلگر", status: "control", controls: ["مقایسه قبل/بعد"] },
      { id: "approve", title: "تأیید و انتشار", description: "انتشار فقط بعد از تأیید ثبت‌شده.", owner: "مدیرعامل", status: "control", controls: ["ردپای ممیزی"] },
    ],
  },
  {
    id: "loan",
    title: "تسهیلات و اعتبار",
    kind: "finance",
    owner: "تیم تراز",
    summary: "ارزیابی شرایط، پیشنهاد اعتبار و پیگیری اقساط در قالب کنترل‌شده.",
    status: "planned",
    readOnly: true,
    requiresCeoApproval: true,
    inputs: ["پرونده مشتری", "سابقه بازپرداخت", "سیاست اعتبار"],
    outputs: ["پیشنهاد اعتبار", "برنامه بازپرداخت", "پرچم ریسک"],
    controls: ["عدم تصمیم‌گیری خودکار", "قابل توضیح بودن امتیاز", "اعتراض‌پذیری"],
    steps: [
      { id: "assess", title: "ارزیابی", description: "جمع‌آوری داده مجاز و توضیح عوامل اثرگذار.", owner: "ریسک", status: "planned", controls: ["رضایت داده"] },
      { id: "offer", title: "پیشنهاد", description: "ساخت پیشنهاد غیرالزام‌آور برای بررسی انسانی.", owner: "مالی", status: "planned", controls: ["تأیید انسانی"] },
      { id: "monitor", title: "پایش", description: "پایش تعهدات و هشدارهای سررسید.", owner: "عملیات", status: "planned", controls: ["محدودیت دسترسی"] },
    ],
  },
  {
    id: "gold",
    title: "دارایی طلا",
    kind: "finance",
    owner: "تیم نیوکاش",
    summary: "ثبت موجودی و پیشنهاد خرید/فروش طلا با قیمت مرجع و ریسک شفاف.",
    status: "planned",
    readOnly: true,
    requiresCeoApproval: true,
    inputs: ["وزن و عیار", "قیمت مرجع", "موجودی"],
    outputs: ["ارزش‌گذاری", "پیشنهاد سفارش", "هشدار نوسان"],
    controls: ["قیمت زمان‌دار", "تطبیق موجودی", "تأیید معامله"],
    steps: [
      { id: "price", title: "ارزش‌گذاری", description: "محاسبه ارزش بر اساس قیمت و زمان ثبت.", owner: "مالی", status: "planned", controls: ["ثبت منبع"] },
      { id: "order", title: "پیشنهاد سفارش", description: "ساخت سفارش پیشنهادی بدون ارسال به بازار.", owner: "مادر Hermes", status: "planned", controls: ["عدم اجرای خودکار"] },
      { id: "reconcile", title: "تطبیق دارایی", description: "تطبیق دارایی ثبت‌شده با گزارش نگهدارنده.", owner: "بازرس مالی", status: "planned", controls: ["گزارش مغایرت"] },
    ],
  },
  {
    id: "insurance",
    title: "بیمه",
    kind: "finance",
    owner: "تیم تراز",
    summary: "نمایش پیشنهاد پوشش، صدور مورد پیشنهادی و مدیریت خسارت با تأیید مالک.",
    status: "planned",
    readOnly: true,
    requiresCeoApproval: true,
    inputs: ["پروفایل ریسک", "نوع پوشش", "سابقه خسارت"],
    outputs: ["پیشنهاد پوشش", "حق بیمه", "پرونده خسارت"],
    controls: ["رضایت مشتری", "توضیح استثناها", "تفکیک ارزیابی و تأیید"],
    steps: [
      { id: "quote", title: "پیشنهاد پوشش", description: "پیشنهاد شفاف همراه با استثناها و هزینه.", owner: "محصول", status: "planned", controls: ["نسخه شرایط"] },
      { id: "issue", title: "صدور پیشنهادی", description: "آماده‌سازی پرونده برای تأیید انسانی.", owner: "عملیات", status: "planned", controls: ["کنترل مدارک"] },
      { id: "claim", title: "رسیدگی خسارت", description: "ثبت، ارزیابی و گزارش وضعیت پرونده.", owner: "پشتیبانی", status: "planned", controls: ["ردپای تصمیم"] },
    ],
  },
  {
    id: "merchant-settlement",
    title: "تسویه پذیرندگان",
    kind: "finance",
    owner: "تیم تراز",
    summary: "تطبیق تراکنش‌ها، محاسبه سهم پذیرنده و آماده‌سازی فایل تسویه.",
    status: "active",
    readOnly: true,
    requiresCeoApproval: true,
    inputs: ["تراکنش‌های تأییدشده", "قرارداد پذیرنده", "تقویم تسویه"],
    outputs: ["گزارش تطبیق", "مبلغ پیشنهادی", "مغایرت تسویه"],
    controls: ["تطبیق سه‌گانه", "کنترل برگشت", "تأیید قبل از پرداخت"],
    steps: [
      { id: "match", title: "تطبیق تراکنش", description: "تطبیق رویداد پرداخت، سفارش و دفترکل.", owner: "مالی", status: "control", controls: ["گزارش اختلاف"] },
      { id: "calculate", title: "محاسبه سهم", description: "محاسبه سهم پذیرنده و کارمزد مطابق قرارداد نسخه‌دار.", owner: "توسعه", status: "ready", controls: ["تست قرارداد"] },
      { id: "prepare", title: "آماده‌سازی تسویه", description: "ساخت بسته تسویه برای تأیید مالک مالی.", owner: "مالی", status: "control", controls: ["تأیید انسانی"] },
    ],
  },
];

const admin: ProcessDefinition[] = [
  {
    id: "access-policy",
    title: "نقش‌ها و دسترسی‌ها",
    kind: "admin",
    owner: "ادمین ارشد",
    summary: "تعریف نقش، دامنه دسترسی و جداسازی وظایف در یک کاتالوگ قابل ممیزی.",
    status: "active",
    requiresCeoApproval: true,
    inputs: ["نقش سازمانی", "دامنه پروژه", "حساسیت داده"],
    outputs: ["ماتریس دسترسی", "گزارش تغییر", "هشدار دسترسی اضافه"],
    controls: ["اصل حداقل دسترسی", "بازبینی دوره‌ای", "ثبت دلیل تغییر"],
    steps: [
      { id: "define", title: "تعریف نقش", description: "مشخص‌کردن اجازه‌ها و محدوده هر نقش.", owner: "ادمین", status: "ready", controls: ["مالک مشخص"] },
      { id: "review", title: "بازبینی", description: "بازبینی دسترسی‌های حساس و تعارض وظایف.", owner: "امنیت", status: "control", controls: ["تأیید دو نفره"] },
      { id: "publish", title: "اعمال سیاست", description: "اعمال نسخه تأییدشده و ثبت اثر آن.", owner: "ادمین", status: "control", controls: ["قابل بازگشت"] },
    ],
  },
  {
    id: "limit-catalog",
    title: "کاتالوگ سقف و سیاست",
    kind: "admin",
    owner: "ادمین ارشد",
    summary: "نمایش یکپارچه سقف‌ها، کارمزدها و قواعد کنترل که فرایندها از آن استفاده می‌کنند.",
    status: "review",
    requiresCeoApproval: true,
    inputs: ["تصمیم مدیریتی", "سناریو", "نیاز تیم"],
    outputs: ["نسخه سیاست", "نتیجه شبیه‌سازی", "پیشنهاد انتشار"],
    controls: ["تغییر نسخه‌دار", "آزمون اثر", "تأیید مدیرعامل"],
    steps: [
      { id: "draft", title: "پیش‌نویس", description: "ساخت تغییر با دلیل و دامنه اثر.", owner: "مدیر محصول", status: "ready", controls: ["توضیح اجباری"] },
      { id: "test", title: "آزمون اثر", description: "بررسی سناریوهای مرزی قبل از انتشار.", owner: "تحلیلگر", status: "control", controls: ["ثبت خروجی"] },
      { id: "approve", title: "تأیید", description: "تأیید یا رد تغییر توسط مدیرعامل.", owner: "مدیرعامل", status: "control", controls: ["ردپای ممیزی"] },
    ],
  },
  {
    id: "agent-governance",
    title: "حاکمیت عامل‌ها",
    kind: "admin",
    owner: "مدیرعامل",
    summary: "کنترل پرامپت، runtime، محدوده ابزارها و نتیجه اجراهای Hermes و OMP.",
    status: "active",
    requiresCeoApproval: true,
    inputs: ["درخواست مدیر", "زمینه پروژه", "سیاست ایمنی"],
    outputs: ["اجرای قابل رهگیری", "پیشنهاد", "گزارش مسدودی"],
    controls: ["Hermes به‌عنوان مادر", "ثبت پیام و خروجی", "عدم ادعای اجرای ناموفق"],
    steps: [
      { id: "route", title: "مسیریابی", description: "واگذاری کار به Hermes و زیرعامل مناسب OMP.", owner: "Hermes", status: "ready", controls: ["زمینه محدود"] },
      { id: "run", title: "اجرا", description: "اجرای کنترل‌شده با timeout و گزارش نتیجه.", owner: "OMP", status: "control", controls: ["ثبت runtime"] },
      { id: "review", title: "بررسی خروجی", description: "تبدیل خروجی حساس به پیشنهاد برای تأیید.", owner: "مدیرعامل", status: "control", controls: ["عدم اعمال خودکار"] },
    ],
  },
  {
    id: "audit-and-metrics",
    title: "ممیزی و شاخص‌ها",
    kind: "admin",
    owner: "مدیرعامل",
    summary: "ردگیری تغییرها، سلامت سرویس‌ها و شاخص‌های تحویل در یک نمای واحد.",
    status: "active",
    inputs: ["رویدادهای سیستم", "وضعیت تسک", "سلامت runtime"],
    outputs: ["گزارش مدیریتی", "هشدار", "تصمیم قابل استناد"],
    controls: ["بدون اطلاعات محرمانه", "زمان استاندارد", "سطح دسترسی گزارش"],
    steps: [
      { id: "collect", title: "جمع‌آوری", description: "جمع‌کردن رویدادهای استاندارد از سطح دامنه و اجرا.", owner: "سیستم", status: "ready", controls: ["شناسه یکتا"] },
      { id: "measure", title: "محاسبه شاخص", description: "محاسبه شاخص‌های سلامت و جریان کار.", owner: "تحلیلگر", status: "ready", controls: ["منبع شاخص"] },
      { id: "decide", title: "تصمیم و پیگیری", description: "ساخت اقدام بعدی و اتصال آن به مالک و موعد.", owner: "مدیرعامل", status: "control", controls: ["مالک و موعد"] },
    ],
  },
];

export const workspaceGroups = [
  { id: "operations" as const, title: "عملیات محصول", subtitle: "جریان‌های روزمره‌ای که تیم‌ها اجرا می‌کنند.", processes: operations },
  { id: "finance" as const, title: "فرایندهای مالی", subtitle: "دفترکل، ریسک و پیشنهاد مالی با کنترل انسانی.", processes: finance },
  { id: "admin" as const, title: "کنترل‌های ادمین", subtitle: "سیاست، دسترسی، عامل‌ها و گزارش‌های حاکمیتی.", processes: admin },
];

export function getWorkspaceProcesses(kind: WorkspaceKind) {
  return workspaceGroups.find((group) => group.id === kind)?.processes ?? [];
}

export function getProcessById(id?: string | null) {
  return workspaceGroups.flatMap((group) => group.processes).find((process) => process.id === id);
}
