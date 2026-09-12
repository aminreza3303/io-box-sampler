# گزارش موج اصلاح یافته‌های بازبینی نهایی

مبنای بازبینی: `9a7b71c39bc57812992c3b606d58885d44c9d579`

## اصلاح‌ها

1. **تغییر ارز:** تغییر ارز اکنون تأیید صریح می‌خواهد. لغو، پیش‌نویس را دست‌نخورده نگه می‌دارد؛ با تأیید، نرخ نفر-روز، هزینه‌های اولیه و جاری، حاشیهٔ مالی محرک‌ها و همهٔ تبدیل‌های دستی در هر سه حالت پاک می‌شوند تا مبلغ‌ها در ارز تازه دوباره وارد شوند. صفر صریح نیز مبلغ ثبت‌شده محسوب می‌شود. فرم‌های تبدیل ذخیره‌نشده هنگام تغییر ارز remount می‌شوند تا دادهٔ ارز قبلی قابل ثبت در ارز جدید نباشد. تبدیل FX خودکار اضافه نشده و مبالغ خالی `null` می‌مانند.
2. **وزن اولویت:** اگر معیار یا وزنی برای امتیازدهی فرستاده شود، دست‌کم یک وزن باید مثبت باشد. وزن صفر در کنار وزن مثبت همچنان معتبر است؛ نبود کامل معیار و وزن نیز همچنان مجاز است.
3. **ترتیب کارت‌های سفر:** کارت‌ها داخل هر lane بر اساس `suggestedOrder` مرتب می‌شوند. رابط تصریح می‌کند که این ترتیب صرفاً پیشنهاد سند است و به‌معنای تصویب یا اولویت اجرایی نیست.
4. **نمایش effort:** جمع تعدیل‌شده و ذخیره با علامت تقریبی نمایش داده می‌شود و کل تلاش برنامه‌ریزی‌شده صریحاً «گردشده به ۱ رقم اعشار» برچسب می‌خورد.
5. **تاریخ provenance:** `recordedAt` برای evidenceهای «دادهٔ داخلی» و «مصوب» از همان schema تاریخ تقویمی معتبر `YYYY-MM-DD` استفاده می‌کند که با ورودی تاریخ فرم سازگار است؛ متن دلخواه و روز ناممکن رد می‌شود.

## مرزهای حفظ‌شده

- هیچ migration یا تغییر snapshot/DB اضافه نشد؛ snapshotهای قبلی دست‌نخورده‌اند.
- تبدیل خودکار ارز، جایگزینی مبلغ خالی با صفر، یا نرخ پنهان اضافه نشد.
- چهار فاز محصول، طراحی، توسعه و تحویل تغییر نکردند.
- سرور توسعه متوقف یا راه‌اندازی مجدد نشد.
- plan کپی‌شدهٔ کاربر و تغییر قبلی `task-5-report.md` خارج از این گزارش و commit باقی می‌مانند.

## آزمون‌ها و خروجی دقیق

فرمان متمرکز:

```text
npm test -- --run tests/domain/scenario-currency.test.ts tests/auth/scenario-api-contract.test.ts tests/domain/scenario-catalog-section.test.ts tests/domain/scenario-business-case-panel.test.ts tests/domain/scenario-catalog.test.ts
```

خروجی نهایی:

```text
> command-center@0.1.0 test
> vitest run --run tests/domain/scenario-currency.test.ts tests/auth/scenario-api-contract.test.ts tests/domain/scenario-catalog-section.test.ts tests/domain/scenario-business-case-panel.test.ts tests/domain/scenario-catalog.test.ts


 RUN  v3.2.4 C:/Users/a.sedabadi/Documents/newcash-scenario-business-case/apps/command-center

 ✓ tests/domain/scenario-catalog-section.test.ts (1 test) 4ms
 ✓ tests/domain/scenario-catalog.test.ts (5 tests) 13ms
 ✓ tests/domain/scenario-currency.test.ts (3 tests) 11ms
 ✓ tests/domain/scenario-business-case-panel.test.ts (5 tests) 28ms
 ✓ tests/auth/scenario-api-contract.test.ts (32 tests) 120ms

 Test Files  5 passed (5)
      Tests  46 passed (46)
   Start at  13:58:25
   Duration  1.08s (transform 735ms, setup 0ms, collect 1.70s, tests 176ms, environment 1ms, prepare 945ms)
```

Typecheck:

```text
Command: npx tsc --noEmit --pretty false
Exit code: 0
stdout/stderr: (empty)
```

The first catalog-order test draft attempted server rendering and hit the repository's classic JSX test transform (`React is not defined` in the existing `Badge`). That test was replaced with a pure ordering-helper test used by the component; the final focused run above passes.

## Self-review

Reviewed the complete scoped diff and confirmed it contains only the five findings and their regression tests, plus this report. No task, payment, ledger, or workflow behavior changed. `git diff --check` returned exit code 0; Git emitted only its existing LF-to-CRLF working-copy notices.
