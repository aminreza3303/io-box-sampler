export type DomainGroupId = "infra" | "core" | "finance" | "ecosystem" | "platform";
export type DomainPriority = "P0" | "P1" | "P2" | "عرضی";
export type DomainStatus = "CONFIRMED" | "OPEN_DECISION";

export type DomainRecord = {
  id: string;
  title: string;
  group: DomainGroupId;
  priority: DomainPriority;
  status: DomainStatus;
  summary: string;
  rules: string[];
};

export type DomainRelationship = {
  from: string;
  to: string;
  label: string;
  explanation: string;
};

export type RoadmapStep = {
  id: string;
  title: string;
  duration: string;
  summary: string;
  exitCriteria: string;
  deliverables: string[];
};

export const domainGroupMeta: Array<{ id: DomainGroupId; title: string; subtitle: string; color: string }> = [
  { id: "infra", title: "زیرساخت افقی", subtitle: "P0 · همهٔ دامنه‌ها به این لایه متصل‌اند", color: "cyan" },
  { id: "core", title: "هستهٔ نئوبانک", subtitle: "P0 · مسیرهای حیاتی محصول", color: "rose" },
  { id: "finance", title: "محصولات مالی و عملیات", subtitle: "P1 · درآمد، تسویه و عملیات", color: "orange" },
  { id: "ecosystem", title: "اکوسیستم", subtitle: "P2 · خدمات مکمل و تجربهٔ کاربر", color: "amber" },
  { id: "platform", title: "پلتفرم کلاینت", subtitle: "عرضی · تجربه و توسعه‌پذیری", color: "emerald" },
];

export const domains: DomainRecord[] = [
  {
    id: "currency",
    title: "ارز و تبدیل",
    group: "infra",
    priority: "P0",
    status: "CONFIRMED",
    summary: "مدیریت کیف‌های چندارزی، نرخ تبدیل و تعیین ارز خدمت بر اساس تسویهٔ تأمین‌کننده.",
    rules: ["W-1: کیف پول به‌ازای هر ارز؛ امروز تومان و دینار و فردا درهم و ارزهای جدید.", "S-1: ارز خدمت برابر ارز تسویهٔ تأمین‌کننده است.", "ارز یک دادهٔ قابل پیکربندی است، نه مقدار hard-code."],
  },
  {
    id: "limits",
    title: "موتور سقف‌ها",
    group: "infra",
    priority: "P0",
    status: "CONFIRMED",
    summary: "اعمال سقف تراکنش، روزانه و ماهانه بر اساس سطح KYC، ارز و نوع عملیات.",
    rules: ["L-1: مقدار سقف داده است و بدون deploy تغییر می‌کند.", "L-2: نرخ‌شمار جمعی روزانه و ماهانه نگه داشته می‌شود.", "رسیدن به سقف باید پیام کاربر و گزارش انطباق بسازد."],
  },
  {
    id: "policy",
    title: "پالیسی و دسترسی",
    group: "infra",
    priority: "P0",
    status: "CONFIRMED",
    summary: "لایهٔ مرکزی برای اینکه هر نقش به چه فعل و شیئی دسترسی دارد.",
    rules: ["P-1: نقش مجموعه‌ای از مجوزهای فعل + شیء است.", "نقش‌ها شامل کاربر، نماینده، پشتیبان، ادمین مالی و سوپرادمین‌اند.", "P-2: هر اعمال حساس باید audit trail داشته باشد."],
  },
  {
    id: "kyc",
    title: "هویت و KYC",
    group: "core",
    priority: "P0",
    status: "CONFIRMED",
    summary: "افتتاح حساب، اسکن پاسپورت، ویدیو تأیید، صف بررسی و بازیابی حساب.",
    rules: ["سطح KYC مقدار سقف‌های کاربر را تعیین می‌کند.", "مسدودسازی و بازیابی باید قابل ردیابی باشد.", "صف بررسی دستی و SLA آن بخشی از عملیات است."],
  },
  {
    id: "wallet",
    title: "کیف پول چندارزی",
    group: "core",
    priority: "P0",
    status: "CONFIRMED",
    summary: "موجودی و دفترکل جدا برای هر کاربر و هر ارز، با شارژ و برداشت.",
    rules: ["کلید حساب برابر (کاربر × ارز) است.", "دفترکل باید دوطرفه و قابل حسابرسی باشد.", "تبدیل ارز سه اثر دارد: بدهکار مبدأ، بستانکار مقصد و سود/زیان FX."],
  },
  {
    id: "card",
    title: "کارت بانکی",
    group: "core",
    priority: "P0",
    status: "CONFIRMED",
    summary: "صدور، شارژ از کیف، رمزها، استعلام، گردش، مسدودسازی، تمدید و بازگشت موجودی.",
    rules: ["هر عملیات کارت به کیف و پالیسی متصل است.", "گم‌شدن کارت باید مسیر مسدودسازی و جایگزینی داشته باشد.", "یکپارچه‌سازی شاپرک/پرداخت‌یار باید قابل audit باشد."],
  },
  {
    id: "transfer",
    title: "انتقال وجه",
    group: "core",
    priority: "P0",
    status: "CONFIRMED",
    summary: "انتقال کیف به کیف، کیف به کارت بانکی و کیف به شبا/IBAN.",
    rules: ["همهٔ انتقال‌ها از موتور سقف عبور می‌کنند.", "ارز مبدأ و مقصد باید صریح باشند.", "وضعیت انتقال از درخواست تا تسویه قابل ردیابی است."],
  },
  {
    id: "qr",
    title: "پرداخت QR پذیرندگان",
    group: "core",
    priority: "P0",
    status: "CONFIRMED",
    summary: "اسکن QR، کسر از کیف، اعمال تخفیف و تسویهٔ پذیرنده.",
    rules: ["ارز پرداخت با ارز تسویهٔ پذیرنده کنترل می‌شود.", "تخفیف قبل از ثبت مبلغ نهایی تسویه اعمال می‌شود.", "پرداخت و تسویه باید با شناسهٔ مشترک audit شوند."],
  },
  {
    id: "fx-market",
    title: "بازار خرید و فروش ارز",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "بازار دوطرفهٔ خرید و فروش تومان و دینار با نرخ خرید، فروش و اسپرد.",
    rules: ["نیوکاش طرف معامله و مدیریت‌کنندهٔ پوزیشن ارزی است.", "معامله مشروط به عبور از سقف‌های کاربر است.", "نرخ، قفل نرخ و سود/زیان معامله باید ثبت شود."],
  },
  {
    id: "loan",
    title: "وام",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "درخواست، اعتبارسنجی، پرداخت، برنامهٔ بازپرداخت، وصول و جریمهٔ تأخیر.",
    rules: ["وام به سطح KYC و سقف اعتباری وابسته است.", "پرداخت و بازپرداخت در ارز مشخص و با دفترکل ثبت می‌شود.", "مجوز و الزامات نظارتی قبل از اجرای واقعی باید تأیید شوند."],
  },
  {
    id: "gold",
    title: "طلا",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "خرید با نرخ لحظه‌ای، نگهداری موجودی طلا و فروش مجدد به عرضه‌کننده.",
    rules: ["قیمت خرید و فروش و زمان قفل نرخ باید ثبت شود.", "موجودی طلا از کیف پول نقدی جداست.", "تسویه با عرضه‌کننده و ریسک قیمت گزارش می‌شود."],
  },
  {
    id: "insurance",
    title: "بیمه",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "فروش پالیسی بیمه، از جمله بیمهٔ سفر/پزشکی، با اتصال به شریک بیمه‌گر.",
    rules: ["پالیسی باید وضعیت صدور، فعال، لغو و خسارت داشته باشد.", "ارز حق‌بیمه برابر ارز تسویهٔ بیمه‌گر است.", "قرارداد و مجوز شریک باید بخشی از کارت دامنه باشد."],
  },
  {
    id: "special-offer",
    title: "موتور Special Offer",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "کمپین تخفیف پذیرنده‌محور که در پرداخت QR اعمال می‌شود.",
    rules: ["کمپین دامنه، زمان، شرایط و بودجهٔ مشخص دارد.", "تخفیف باید قبل از تسویهٔ خالص پذیرنده محاسبه شود.", "هر استفاده از پیشنهاد قابل گزارش و audit است."],
  },
  {
    id: "buy-toman",
    title: "خرید تومان",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "شارژ تومان از چهار کانال، ارسال رسید و تکمیل عملیات در بازهٔ مشخص.",
    rules: ["رسید و وضعیت تطبیق پرداخت باید ذخیره شود.", "SLA هدف برای شارژ کمتر از ۲۰ دقیقه است.", "شارژ از سقف، KYC و پالیسی عبور می‌کند."],
  },
  {
    id: "tickets",
    title: "بلیت",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "جست‌وجو و خرید بلیت هواپیما، قطار و اتوبوس با تغییر و استرداد.",
    rules: ["ارز سفارش برابر ارز تسویهٔ تأمین‌کننده است.", "وضعیت رزرو و استرداد مستقل از پرداخت قابل ردیابی است.", "کلاس، صندلی و قوانین کودک بخشی از قرارداد محصول‌اند."],
  },
  {
    id: "hotel",
    title: "رزرو هتل",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "رزرو هتل، انتخاب اتاق، استرداد و تغییر با شبکهٔ B2B هتل.",
    rules: ["ارز سفارش برابر ارز تسویهٔ هتل است.", "نوع اتاق، ظرفیت کودک و شرایط استرداد ذخیره می‌شود.", "Watcher و وضعیت تأیید رزرو باید قابل مشاهده باشد."],
  },
  {
    id: "agents",
    title: "شبکهٔ نمایندگان",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "نمایندگان شارژ، صدور کارت و فروش بلیت با ثبت‌نام و تسویهٔ کمیسیون.",
    rules: ["نقش نماینده دسترسی و عملیات مجاز او را تعیین می‌کند.", "کمیسیون و تسویهٔ نماینده باید جداگانه گزارش شود.", "گفت‌وگو و مدارک نماینده audit می‌شوند."],
  },
  {
    id: "admin-panel",
    title: "پنل ادمین و وب",
    group: "finance",
    priority: "P1",
    status: "CONFIRMED",
    summary: "پنل وب/PWA برای مدیریت دامنه‌ها، 2FA، گزارش و عملیات پشتیبانی.",
    rules: ["دسترسی ادمین از لایهٔ پالیسی مرکزی می‌آید.", "تغییر سقف و نرخ بدون audit مجاز نیست.", "گزارش‌ها باید به تفکیک ارز و نقش قابل فیلتر باشند."],
  },
  {
    id: "topup",
    title: "شارژ و اینترنت",
    group: "ecosystem",
    priority: "P2",
    status: "CONFIRMED",
    summary: "شارژ همراه اول، ایرانسل، شاتل و رایتل و خرید بستهٔ اینترنت.",
    rules: ["اپراتور و نوع بسته قبل از کسر وجه مشخص می‌شوند.", "ارز خدمت از قرارداد تسویهٔ اپراتور می‌آید.", "استعلام و نتیجهٔ خرید به سفارش متصل می‌شوند."],
  },
  {
    id: "rates",
    title: "نمایش نرخ ارز",
    group: "ecosystem",
    priority: "P2",
    status: "CONFIRMED",
    summary: "نمایش نرخ لحظه‌ای، مبدل و تاریخچهٔ تغییرات برای کاربر و عملیات.",
    rules: ["نرخ نمایش با نرخ اجرای معامله یکی فرض نمی‌شود.", "ماتریس cross-rate برای دینار، تومان و ارزهای آینده نگهداری می‌شود.", "منبع و زمان نرخ باید نمایش داده شود."],
  },
  {
    id: "snapp",
    title: "اسنپ",
    group: "ecosystem",
    priority: "P2",
    status: "CONFIRMED",
    summary: "شارژ اسنپ تاکسی و اسنپ‌فود از مسیر یکپارچه‌سازی مربوطه.",
    rules: ["پیش از شارژ، گیرنده و مبلغ تأیید می‌شوند.", "رسید سرویس بیرونی به تراکنش کیف متصل است.", "خطای provider نباید باعث کسر نهایی بدون وضعیت شود."],
  },
  {
    id: "support",
    title: "چت و پشتیبانی",
    group: "ecosystem",
    priority: "P2",
    status: "CONFIRMED",
    summary: "چت و تماس صوتی با پشتیبان، نماینده و کاربر با پوشش چندزبانه.",
    rules: ["سطح دسترسی پشتیبان باید حداقلی و قابل audit باشد.", "پشتیبانی عربی ۲۴ ساعته یکی از نیازهای عملیاتی است.", "مکالمه به کاربر و سفارش مرتبط می‌شود."],
  },
  {
    id: "donations",
    title: "نذورات",
    group: "ecosystem",
    priority: "P2",
    status: "CONFIRMED",
    summary: "جذب نذورات زائران بین‌الملل با قرارداد درگاه مربوطه.",
    rules: ["مقصد نذورات و رسید باید شفاف باشند.", "تسویهٔ شریک و ارز آن در قرارداد ثبت می‌شود.", "گزارش جمع‌آوری از تراکنش‌های عادی جداست."],
  },
  {
    id: "profile",
    title: "پروفایل و امنیت",
    group: "ecosystem",
    priority: "P2",
    status: "CONFIRMED",
    summary: "رمز شش‌رقمی، امنیت کیف، اعلان تراکنش و تنظیمات کاربر.",
    rules: ["عملیات حساس نیازمند احراز مجدد است.", "اعلان نباید دادهٔ محرمانهٔ غیرضروری داشته باشد.", "تغییرات امنیتی در audit ثبت می‌شوند."],
  },
  {
    id: "transactions",
    title: "سفارشات و تراکنش‌ها",
    group: "ecosystem",
    priority: "P2",
    status: "CONFIRMED",
    summary: "تاریخچه، جزئیات، وضعیت و ردیابی تمام سفارش‌ها و تراکنش‌ها.",
    rules: ["هر تراکنش ارز، منبع، مقصد و وضعیت مشخص دارد.", "تغییر وضعیت append-only و قابل audit است.", "گزارش کاربر و گزارش مالی از یک ledger مشترک تغذیه می‌شوند."],
  },
  {
    id: "i18n",
    title: "چندزبانه",
    group: "platform",
    priority: "عرضی",
    status: "CONFIRMED",
    summary: "پشتیبانی عربی، فارسی و انگلیسی با ترجمهٔ جدا از کد و RTL/LTR خودکار.",
    rules: ["زبان و locale در تمام جریان‌ها یکسان اعمال می‌شوند.", "ترجمه‌ها مستقل از کد و قابل بازبینی‌اند.", "گسترش زبان باید بدون بازنویسی دامنه‌ها ممکن باشد."],
  },
  {
    id: "redesign",
    title: "بازطراحی UI/UX",
    group: "platform",
    priority: "عرضی",
    status: "CONFIRMED",
    summary: "سیستم دیزاین جدید، تجربهٔ ساده برای توریست و دسترس‌پذیری بهتر.",
    rules: ["کامپوننت‌ها و توکن‌های طراحی مشترک می‌شوند.", "جریان‌های مالی باید با متن و خطای قابل فهم نمایش داده شوند.", "بازطراحی با چندزبانه و بازنویسی موبایل هماهنگ است."],
  },
  {
    id: "mobile",
    title: "بازنویسی موبایل",
    group: "platform",
    priority: "عرضی",
    status: "OPEN_DECISION",
    summary: "تصمیم برای خروج از Flutter و انتخاب KMP، React Native، نیتیو یا ترکیبی.",
    rules: ["تصمیم نهایی با مالک محصول و قبل از گام چهارم است.", "قرارداد API و منطق دامنه باید مستقل از کلاینت بماند.", "گزینه‌ها با معیار UX، سرعت، تیم و هزینه مقایسه می‌شوند."],
  },
];

export const domainRelationships: DomainRelationship[] = [
  { from: "currency", to: "wallet", label: "کیف‌ها بر اساس ارز", explanation: "قانون W-1 باعث می‌شود موجودی تومان، دینار و ارزهای آینده در حساب‌های جدا نگه‌داری شوند." },
  { from: "currency", to: "fx-market", label: "بازار ارز", explanation: "بازار خرید و فروش از نرخ و ارزهای قابل پیکربندی استفاده می‌کند." },
  { from: "currency", to: "rates", label: "نمایش نرخ", explanation: "نمایش نرخ باید ماتریس تبدیل چندارزی و زمان نرخ را بشناسد." },
  { from: "currency", to: "tickets", label: "ارز تسویه", explanation: "بلیت با ارز تسویهٔ تأمین‌کننده قیمت‌گذاری و تسویه می‌شود." },
  { from: "currency", to: "hotel", label: "ارز تسویه", explanation: "رزرو هتل از کیف ارزی استفاده می‌کند که قرارداد هتل تعیین می‌کند." },
  { from: "currency", to: "qr", label: "ارز پذیرنده", explanation: "پرداخت QR باید ارز تسویهٔ پذیرنده را رعایت کند." },
  { from: "limits", to: "wallet", label: "کنترل عملیات", explanation: "شارژ، برداشت و تبدیل قبل از تغییر موجودی از سقف عبور می‌کنند." },
  { from: "limits", to: "transfer", label: "سقف انتقال", explanation: "انتقال کیف به کیف، کارت یا شبا نرخ‌شمار و سقف جدا دارد." },
  { from: "limits", to: "fx-market", label: "سقف FX", explanation: "خرید و فروش تومان/دینار بدون کنترل سقف مجاز نیست." },
  { from: "limits", to: "loan", label: "سقف اعتبار", explanation: "مبلغ وام تابع سطح KYC و سقف اعتباری کاربر است." },
  { from: "limits", to: "qr", label: "سقف پرداخت", explanation: "پرداخت پذیرنده نیز یک عملیات مالی محدودشده است." },
  { from: "policy", to: "kyc", label: "مجوز بررسی", explanation: "فقط نقش‌های مجاز می‌توانند KYC را تأیید یا مسدود کنند." },
  { from: "policy", to: "wallet", label: "دسترسی موجودی", explanation: "مشاهده، اصلاح و برداشت موجودی به نقش و audit وابسته است." },
  { from: "policy", to: "card", label: "عملیات کارت", explanation: "صدور، تمدید و مسدودسازی کارت در یک لایهٔ مرکزی کنترل می‌شود." },
  { from: "policy", to: "transfer", label: "مجوز انتقال", explanation: "فاعل و مقصد انتقال باید در scope مجاز باشند." },
  { from: "policy", to: "qr", label: "دسترسی پذیرنده", explanation: "پرداخت، لغو و تسویهٔ QR نقش‌های جداگانه دارند." },
  { from: "policy", to: "agents", label: "نقش نماینده", explanation: "نمایندهٔ شارژ، صدور کارت و فروش بلیت مجوزهای متفاوت دارد." },
  { from: "policy", to: "admin-panel", label: "پنل ادمین", explanation: "پنل ادمین مصرف‌کنندهٔ اصلی ماتریس نقش × مجوز است." },
  { from: "kyc", to: "wallet", label: "سطح کاربر", explanation: "سطح KYC سقف‌ها و قابلیت‌های کیف پول را تعیین می‌کند." },
  { from: "kyc", to: "loan", label: "اعتبارسنجی", explanation: "درخواست وام بدون هویت و سطح KYC معتبر وارد ارزیابی نمی‌شود." },
  { from: "kyc", to: "limits", label: "سطح سقف", explanation: "ارتقای KYC باید ماتریس سقف کاربر را تغییر دهد." },
  { from: "wallet", to: "card", label: "شارژ کارت", explanation: "کارت برای شارژ و بازگشت موجودی به کیف متصل است." },
  { from: "wallet", to: "transfer", label: "مبدأ انتقال", explanation: "تمام مسیرهای انتقال موجودی را از کیف مناسب ارز کسر می‌کنند." },
  { from: "wallet", to: "qr", label: "کسر پرداخت", explanation: "QR مبلغ نهایی پس از تخفیف را از کیف ارز خدمت کم می‌کند." },
  { from: "wallet", to: "buy-toman", label: "شارژ تومان", explanation: "خرید تومان پس از تطبیق پرداخت، موجودی کیف تومان را افزایش می‌دهد." },
  { from: "wallet", to: "fx-market", label: "تسویه معامله", explanation: "بازار ارز کیف مبدأ و مقصد را به‌صورت دوطرفه به‌روزرسانی می‌کند." },
  { from: "wallet", to: "transactions", label: "ledger و تاریخچه", explanation: "تاریخچهٔ کاربر از رویدادهای قابل حسابرسی دفترکل تغذیه می‌شود." },
  { from: "wallet", to: "tickets", label: "پرداخت بلیت", explanation: "بلیت از کیف ارزی متناسب با تسویهٔ تأمین‌کننده پرداخت می‌شود." },
  { from: "wallet", to: "hotel", label: "پرداخت هتل", explanation: "رزرو هتل موجودی کیف ارز خدمت را مصرف می‌کند." },
  { from: "qr", to: "special-offer", label: "اعمال تخفیف", explanation: "موتور پیشنهاد قبل از ثبت مبلغ نهایی پرداخت QR اجرا می‌شود." },
  { from: "special-offer", to: "admin-panel", label: "مدیریت کمپین", explanation: "ادمین کمپین، شرایط، بودجه و گزارش مصرف را مدیریت می‌کند." },
  { from: "fx-market", to: "rates", label: "نرخ مرجع", explanation: "بازار از نرخ‌های مرجع استفاده می‌کند اما نرخ اجرای معامله مستقل ثبت می‌شود." },
  { from: "loan", to: "transactions", label: "برنامه بازپرداخت", explanation: "پرداخت، قسط و جریمه باید مانند سفارش‌های مالی در تاریخچه دیده شوند." },
  { from: "gold", to: "currency", label: "ارزش‌گذاری", explanation: "خرید و فروش طلا به ارز تسویه و نرخ لحظه‌ای وابسته است." },
  { from: "insurance", to: "currency", label: "حق‌بیمه", explanation: "ارز حق‌بیمه از قرارداد تسویهٔ شریک بیمه‌گر می‌آید." },
  { from: "agents", to: "buy-toman", label: "کانال شارژ", explanation: "نمایندگان یکی از مسیرهای عملیاتی خرید و شارژ تومان هستند." },
  { from: "agents", to: "card", label: "خدمات کارت", explanation: "نمایندهٔ صدور کارت در چرخهٔ کارت و احراز نقش دارد." },
  { from: "agents", to: "tickets", label: "فروش بلیت", explanation: "نمایندهٔ بلیت با موجودی، رزرو و تسویهٔ تأمین‌کننده کار می‌کند." },
  { from: "admin-panel", to: "limits", label: "تنظیم سقف", explanation: "ادمین مالی مقدار سقف را از دادهٔ پیکربندی و با audit تغییر می‌دهد." },
  { from: "admin-panel", to: "policy", label: "اعمال مجوز", explanation: "پنل نقش‌ها و مجوزهای قابل استفاده در عملیات را مدیریت می‌کند." },
  { from: "topup", to: "wallet", label: "کسر از کیف", explanation: "خرید شارژ و بسته از کیف ارز خدمت انجام می‌شود." },
  { from: "snapp", to: "wallet", label: "پرداخت سرویس", explanation: "شارژ اسنپ تراکنش بیرونی و کسر کیف را در یک سفارش نگه می‌دارد." },
  { from: "support", to: "policy", label: "دسترسی پشتیبان", explanation: "پشتیبان باید فقط به داده و عملیاتی دسترسی داشته باشد که نقش او اجازه می‌دهد." },
  { from: "profile", to: "policy", label: "امنیت حساب", explanation: "رمز و اعلان بخشی از کنترل دسترسی و رویدادهای امنیتی هستند." },
  { from: "transactions", to: "support", label: "پشتیبانی سفارش", explanation: "پشتیبان برای پاسخ‌گویی به وضعیت سفارش به تاریخچهٔ قابل مشاهده نیاز دارد." },
  { from: "i18n", to: "support", label: "زبان پشتیبانی", explanation: "زبان کاربر و پاسخ پشتیبانی باید در یک تجربهٔ چندزبانه هماهنگ باشند." },
  { from: "i18n", to: "redesign", label: "RTL/LTR", explanation: "بازطراحی باید از ابتدا با ترجمه، RTL و LTR اجرا شود." },
  { from: "i18n", to: "mobile", label: "قرارداد زبان", explanation: "انتخاب فناوری موبایل نباید پشتیبانی چندزبانه را به یک کلاینت گره بزند." },
  { from: "redesign", to: "mobile", label: "سیستم دیزاین", explanation: "بازنویسی موبایل باید توکن‌ها و الگوهای تجربهٔ جدید را مصرف کند." },
];

export const roadmapSteps: RoadmapStep[] = [
  { id: "discovery", title: "کشف و مستندسازی", duration: "۱ ماه", summary: "تکمیل کارت‌های دامنه، ماتریس نقش × مجوز، سقف‌ها و قراردادهای یکپارچه‌سازی.", exitCriteria: "تیم فنی سند دامنه را امضا کند.", deliverables: ["۲۸ کارت دامنه", "ماتریس Policy", "لیست پرسش‌های باز و الزامات نظارتی"] },
  { id: "foundation", title: "زیرساخت افقی", duration: "۲ ماه", summary: "دفترکل چندارزی، موتور سقف‌ها، پالیسی متمرکز و audit trail.", exitCriteria: "سند Ledger توسط بیزینس بازبینی و تأیید شود.", deliverables: ["حساب (کاربر × ارز)", "ماتریس سقف قابل ویرایش", "لایهٔ Policy قابل تست"] },
  { id: "core", title: "هستهٔ نئوبانک", duration: "۴ ماه", summary: "KYC، کارت، انتقال وجه و پرداخت QR با shadow-run کنترل‌شده.", exitCriteria: "پاریتهٔ عملکردی هسته اثبات شود.", deliverables: ["KYC و کارت", "انتقال و تسویه", "QR + Special Offer پایه"] },
  { id: "financial", title: "محصولات مالی", duration: "۴ ماه", summary: "وام، طلا، بیمه و بازار FX تومان/دینار پس از تأیید مجوزها.", exitCriteria: "مجوزهای نظارتی فعال و کنترل‌های انطباق آماده باشند.", deliverables: ["چرخهٔ وام", "طلا و بیمه", "بازار دوطرفهٔ ارز"] },
  { id: "ecosystem", title: "اکوسیستم و تجربه", duration: "۴ ماه", summary: "بلیت، هتل، اسنپ، چت، نذورات، چندزبانه، بازطراحی و بازنویسی موبایل.", exitCriteria: "تصمیم فناوری موبایل قبل از شروع این گام ثبت شده باشد.", deliverables: ["خدمات اکوسیستم", "عربی/فارسی/انگلیسی", "تصمیم KMP/RN/نیتیو/ترکیبی"] },
];

export function getDomainById(id: string): DomainRecord | undefined {
  return domains.find((domain) => domain.id === id);
}

export function getDomainConnections(id: string) {
  const dependencies = domainRelationships.filter((relationship) => relationship.to === id);
  const dependents = domainRelationships.filter((relationship) => relationship.from === id);
  return { dependencies, dependents };
}

export const domainGroups = domainGroupMeta.map((group) => ({
  ...group,
  domains: domains.filter((domain) => domain.group === group.id),
}));
