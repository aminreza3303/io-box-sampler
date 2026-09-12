# گزارش پیاده‌سازی تسک ۶ — نتایج، تاریخچه و Hermes

## وضعیت

**DONE_WITH_CONCERNS** — تغییرات تسک ۶ پیاده‌سازی و در commit `c17868112096fb698ac33309f314225d446eeb23` ثبت شد. suite هدفمند سبز است. full suite یک‌بار اجرا شد؛ ۱۵۰ تست از ۱۵۰ تستِ اجراشده قبول شدند، اما دو suite به‌علت نبودن `DATABASE_URL` در محیط همان اجرای عمومی پیش از اجرای تست‌ها fail شدند. اجرای جداگانهٔ همان دو suite با دیتابیس توسعهٔ فعال سبز شد. `tsc` نیز چهار خطای موجود در تست workspace و خارج از فایل‌های این تسک دارد.

## پیاده‌سازی

- پنل نتایج جدید برای تحلیل نسخه‌دار: نتایج فنی/مالی سه حالت، تلاش پایه/تعدیل‌شده/ذخیره، چهار فاز، حجم تغییر، دامنه‌های منتخب/متأثر، زمان، ROI، هزینه‌ها، ارزش خالص، KPI، گیت، priority و provenance.
- مقادیر ناموجود مانند ROI، هزینه یا زمان تقویمی به‌شکل «نامشخص / نیازمند داده» نمایش داده می‌شوند، نه صفر. هیچ task count یا critical path ساختگی نشان داده نمی‌شود.
- فرض‌ها provenance را با نوع، منبع و confidence مستقل نمایش می‌دهند؛ confidence کلیِ محاسبه‌نشده ساخته نشده است.
- snapshotهای قدیمی بدون `modelVersion` در رندر جداگانهٔ فقط‌خواندنی نمایش داده می‌شوند. بازکردن history، API ذخیره/تحلیل را فراخوانی نمی‌کند.
- شناسهٔ تحلیل ذخیره‌شده پس از تحلیل و restore نگه‌داری می‌شود؛ هر ویرایش ورودی یا انتخاب کاتالوگ آن را باطل می‌کند. پس از ثبت تصمیم نیز شناسه به snapshot جدید منتقل می‌شود.
- تصمیم مدیرعامل از مسیر موجود `POST /api/scenarios/[id]/decision` ذخیره می‌شود و reason/evidence/owner/review date را می‌گیرد. endpoint فقط CEO را مجاز می‌کند و snapshot مبدأ را تغییر نمی‌دهد؛ workflow یا task خودکار ساخته نمی‌شود.
- درخواست Hermes فقط `scenarioAnalysisId` می‌فرستد. Chat API snapshot را از Prisma می‌خواند، CEO/creator را با `canViewScenarioAnalysis` مجاز می‌کند و context را از دادهٔ ذخیره‌شده می‌سازد. `scenarioContext` ارسالی کلاینت کنار گذاشته می‌شود.
- context builder با whitelist فیلدها، source labels، provenance و ورودی‌های محدودشده JSON معتبر با حداکثر ۱۲٬۰۰۰ کاراکتر می‌سازد؛ ورودی‌های ناشناخته نشت نمی‌کنند. envelope مربوط به snapshot تصمیم CEO نیز به assumptions اصلی برمی‌گردد.
- در چت متصل به snapshot، Hermes فقط تفسیر می‌کند؛ prompt و کنترل سروری جلوی تولید/ذخیرهٔ proposal و ساخت task را می‌گیرند.

## مسیرهای تغییرکرده

- `apps/command-center/components/scenarios/scenario-business-case-panel.tsx` — پنل نتایج، حالت legacy و فرم تصمیم
- `apps/command-center/components/scenarios/scenario-planner-page.tsx` — اتصال results/history/analysisId/decision/Hermes
- `apps/command-center/server/domain/scenario-hermes-context.ts` — context whitelistشده و bounded
- `apps/command-center/app/api/ai/chat/route.ts` — خواندن snapshot مجاز و قرارداد چت فقط‌تفسیری
- `apps/command-center/tests/domain/scenario-business-case-panel.test.ts` — رندر null، legacy و دادهٔ ناقص
- `apps/command-center/tests/domain/scenario-hermes-context.test.ts` — whitelist، حد ۱۲KB، ورودی ناشناخته و decision snapshot
- `apps/command-center/tests/auth/scenario-hermes-chat-contract.test.ts` — ACL snapshot، رد context کلاینت و منع proposal

هیچ schema migration یا تغییر نامرتبطی اضافه نشد. گزارش قبلی `task-5-report.md` و plan کپی‌شدهٔ کاربر در `docs/superpowers/plans/2026-09-12-scenario-business-case.md` نه stage شدند و نه commit.

## اعتبارسنجی

### focused tests

فرمان:

```text
npm test -- tests/domain/scenario-hermes-context.test.ts tests/domain/scenario-business-case-panel.test.ts tests/auth/scenario-hermes-chat-contract.test.ts tests/auth/scenario-decision-api.test.ts tests/domain/proposal-service.test.ts
```

خروجی نهایی:

```text
Test Files  5 passed (5)
     Tests  18 passed (18)
Duration  1.11s
```

تست‌های `scenario-decision-api` و `proposal-service` نیز گذشتند؛ این‌ها CEO-only snapshot و فرایند approval موجود را پوشش می‌دهند.

### full suite — یک اجرا

فرمان:

```text
npm test
```

خروجی:

```text
Test Files  2 failed | 27 passed (29)
     Tests  150 passed (150)
```

دو suite باقی‌مانده (`tests/auth/ai-session-api-contract.test.ts` و `tests/auth/middleware.test.ts`) به‌علت خطای setup `DATABASE_URL must be set before Prisma can connect` متوقف شدند. برای تکمیل، همین دو suite جداگانه با دیتابیس توسعهٔ درحال‌اجرا اجرا شدند:

```text
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable'; npm test -- tests/auth/ai-session-api-contract.test.ts tests/auth/middleware.test.ts
Test Files  2 passed (2)
     Tests  5 passed (5)
```

### بررسی‌های دیگر

- `npx tsc --noEmit`: فایل‌های تسک ۶ خطای TypeScript ندارند؛ چهار خطا فقط در `tests/agents/project-workspace.test.ts` دیده شد، به‌دلیل تعریف type محیطی که `NODE_ENV` را اجباری می‌داند ولی fixtureهای قدیمی آن را نمی‌فرستند.
- `git diff --check`: بدون خطا.
- درخواست به `http://192.168.1.61:3001/scenarios` پاسخ `307` احراز هویت داد؛ سرور فعال ماند و متوقف نشد.
- build اجرا نشد تا با سرور dev که کاربر خواسته بود فعال بماند بر سر خروجی `.next` تداخل نکند.
- smoke تعاملی احراز‌شده اجرا نشد؛ ورود دستی کاربر لازم است. در این turn هیچ credential وارد یا خودکار نشد.

## خودبازبینی

- `scenarioAnalysisId` پیش از ساخت context خوانده و authorization پیش از dispatch انجام می‌شود.
- در حالت سناریو نه متن context کلاینت به prompt افزوده می‌شود و نه proposal خروجی مدل به service ساخت task می‌رسد.
- اندازه‌گیری KPI فقط هنگام وجود `actual` عددی و `operator` انجام می‌شود.
- history legacy فقط render می‌شود و هیچ مسیر ذخیره یا بازتحلیل خودکاری ندارد.
- فقط هفت مسیر Task 6 بالا در commit پیاده‌سازی ثبت شده‌اند؛ تغییر قبلی task-5 report و plan کاربر خارج از index و commit باقی ماندند.

## Fix Round 1 — یافته‌های بازبینی مستقل

Commit اصلاح کد: `386e684821d0c58096bfd65c92c8a83b30c2033b`. تقویت regression test برای سه envelope متوالی نیز در `520ec49b7ba8904070c335925551bb9c20c68428` ثبت شد. مبنای گزارش قبلی: `c17868112096fb698ac33309f314225d446eeb23`.

۱. **تصمیم‌های CEO تکراری:** `unwrapScenarioAssumptions` حالا زنجیرهٔ envelopeهای `sourceAssumptions` را تا ورودی اصلی دنبال می‌کند و در برابر چرخه/دادهٔ malformed متوقف می‌شود. planner، رندر provenance و context builder از همین helper استفاده می‌کنند؛ بنابراین تصمیم‌های پشت‌سرهم ورودی‌ها را از restore یا Hermes پنهان نمی‌کنند.

۲. **operator نامعتبر KPI:** ارزیابی نمایشی به helper خالص `evaluateKpiActual` منتقل شد. فقط `actual` و `target` عددی به‌همراه operator دقیق `gte` یا `lte` نتیجه می‌دهند؛ operator ناشناخته، null یا target/actual ناقص وضعیت `unmeasured` دارد.

۳. **فرض‌های حذف‌شده از context:** whitelist assumptions و estimate اکنون effort overrideها (مقدار effort و evidence)، money conversionها (مقادیر اصلی/تبدیل‌شده، نرخ، تاریخ و منبع) و catalog metadata/source references را شامل می‌شود. provenance همین ورودی‌ها نیز با source labels حفظ می‌شود؛ ناشناخته‌ها همچنان حذف می‌شوند.

۴. **نام ورودی‌های ناقص در fallback حجیم:** مسیر compact و آخرین fallback هر دو نام missing inputها را از `evidenceCompleteness.missingFields` نگه می‌دارند. regression test ورودی whitelisted بزرگ را تا fallback واقعی می‌برد و حفظ نام‌ها و JSON معتبر زیر ۱۲٬۰۰۰ کاراکتر را assert می‌کند.

### فایل‌های fix round

- `apps/command-center/lib/scenario-restore.ts`
- `apps/command-center/lib/scenario-kpi-display.ts`
- `apps/command-center/components/scenarios/scenario-planner-page.tsx`
- `apps/command-center/components/scenarios/scenario-business-case-panel.tsx`
- `apps/command-center/server/domain/scenario-hermes-context.ts`
- `apps/command-center/tests/domain/scenario-restore.test.ts`
- `apps/command-center/tests/domain/scenario-business-case-panel.test.ts`
- `apps/command-center/tests/domain/scenario-hermes-context.test.ts`

### focused verification این fix round

فرمان دقیق:

```text
npm test -- tests/domain/scenario-hermes-context.test.ts tests/domain/scenario-business-case-panel.test.ts tests/domain/scenario-restore.test.ts tests/auth/scenario-decision-api.test.ts tests/auth/scenario-hermes-chat-contract.test.ts tests/domain/proposal-service.test.ts
```

خروجی دقیق:

```text
> command-center@0.1.0 test
> vitest run tests/domain/scenario-hermes-context.test.ts tests/domain/scenario-business-case-panel.test.ts tests/domain/scenario-restore.test.ts tests/auth/scenario-decision-api.test.ts tests/auth/scenario-hermes-chat-contract.test.ts tests/domain/proposal-service.test.ts

 RUN  v3.2.4 C:/Users/a.sedabadi/Documents/newcash-scenario-business-case/apps/command-center

 ✓ tests/domain/scenario-hermes-context.test.ts (5 tests) 15ms
 ✓ tests/domain/scenario-business-case-panel.test.ts (4 tests) 22ms
 ✓ tests/domain/proposal-service.test.ts (4 tests) 25ms
 ✓ tests/auth/scenario-hermes-chat-contract.test.ts (2 tests) 17ms
 ✓ tests/auth/scenario-decision-api.test.ts (5 tests) 26ms
 ✓ tests/domain/scenario-restore.test.ts (3 tests) 5ms

 Test Files  6 passed (6)
      Tests  23 passed (23)
   Start at  13:22:07
   Duration  1.20s (transform 536ms, setup 0ms, collect 1.69s, tests 109ms, environment 1ms, prepare 1.14s)
```

`npx tsc --noEmit` پس از fix نیز اجرا شد. از فایل‌های این fix خطایی باقی نماند؛ تنها همان چهار خطای baseline در `tests/agents/project-workspace.test.ts` (fixture فاقد `NODE_ENV`) گزارش شد. `git diff --check` هم بدون خطا بود.

این گزارش در commit مستندات جداگانه ثبت می‌شود. گزارش Task 5 و plan کپی‌شدهٔ کاربر همچنان خارج از stage و commit باقی می‌مانند.
