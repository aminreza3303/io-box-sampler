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
