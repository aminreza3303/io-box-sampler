# سشن پروژه‌ای Hermes و تبدیل پیشنهاد به کار

## مسئله

در وضعیت فعلی چت مقر فرماندهی فقط یک `AgentRun` ثبت می‌کند و یک اجرای یک‌باره از adapter می‌خواهد. این اجرا به پروژه یا مسیر workspace وصل نیست، session پایدار Hermes را ادامه نمی‌دهد و خروجی متنی آن مستقیماً به task تبدیل نمی‌شود. هدف این تغییر آن است که مدیر بتواند در چت، یک پروژه را به Hermes وصل کند، اجرای بعدی همان session را در همان workspace ادامه دهد و پیشنهادهای ساخت‌یافته را پس از تأیید مدیرعامل به taskهای واقعی پنل تبدیل کند.

## مرزهای محصول

- اجرای چت برای پروژه در backend و به‌صورت process مخفی انجام می‌شود؛ بازکردن پنجرهٔ گرافیکی Hermes روی دسکتاپ جزو این نسخه نیست.
- Hermes فقط پیشنهاد می‌دهد. ساخت یا تغییر task، فایل، موجودی مالی، پرداخت، سیاست یا دادهٔ عملیاتی بدون تأیید صریح انجام نمی‌شود.
- یک session برای هر کاربر، پروژه و runtime نگه‌داری می‌شود تا گفت‌وگوها قاطی نشوند.
- workspace از کد پروژه و پیکربندی محلی resolve می‌شود؛ مسیر absolute کاربر در دیتابیس به‌عنوان قرارداد قابل حمل ذخیره نمی‌شود.
- پروژهٔ `newcash` به ریشهٔ همین repository وصل می‌شود. پروژهٔ `shati` در صورت وجود پوشهٔ هم‌نام در کنار repository قابل استفاده است. پروژه‌ای که workspace آن پیدا نشود، قبل از اجرای Hermes مسدود می‌شود.

## تجربهٔ کاربر

1. مدیر در چت Hermes یک پروژهٔ کاری انتخاب می‌کند.
2. پنل وضعیت workspace و session همان پروژه را نشان می‌دهد: آماده، قابل ادامه یا مسدود.
3. با ارسال پیام، Hermes با session نام‌گذاری‌شدهٔ همان کاربر/پروژه در workspace پروژه اجرا می‌شود.
4. پاسخ متنی نمایش داده می‌شود. اگر Hermes بلوک پیشنهاد ساخت‌یافته برگرداند، پنل لینک پیشنهاد مدیرعامل را نشان می‌دهد.
5. پیشنهاد در `/ceo/proposals` بررسی می‌شود. فقط مدیرعامل می‌تواند آن را قبول یا رد کند.
6. قبول پیشنهاد، task را با پروژه، تیم، مسئول، اولویت و چهار phase محصول/طراحی/توسعه/تحویل در پنل فرماندهی می‌سازد.

## قرارداد Hermes

adapter از CLI واقعی Hermes استفاده می‌کند:

```text
hermes chat --continue <session-name> --create-if-missing --query <prompt> --oneshot --quiet --in <workspace>
```

برای جلوگیری از اجرای ناخواستهٔ دستورهای سیستم، prompt با آرایهٔ argument به process ارسال می‌شود و shell درگیر نیست. پاسخ non-empty با exit code صفر، نتیجهٔ موفق است. session name پایدار در دیتابیس ثبت می‌شود؛ اگر خروجی Hermes شناسهٔ session را منتشر کند، آن شناسه نیز به‌صورت اختیاری ذخیره می‌شود.

Hermes باید در صورت داشتن task پیشنهادی، یک بلوک محدود و قابل parse تولید کند:

```text
<COMMAND_CENTER_PROPOSAL>
{"title":"...","summary":"...","scope":"PROJECT","projectId":"...","teamId":"...","task":{"title":"...","description":"...","priority":"MEDIUM","assigneeId":"..."}}
</COMMAND_CENTER_PROPOSAL>
```

هر دادهٔ داخل بلوک با schema سمت سرور validate می‌شود. بلوک نامعتبر فقط به‌عنوان متن نمایش داده می‌شود و هیچ proposal یا task ساخته نمی‌شود.

## معماری و داده

### workspace resolver

یک سرویس مستقل `project-workspace.ts` با ورودی `project.code` مسیر مجاز را resolve می‌کند. ریشهٔ پیش‌فرض از `COMMAND_CENTER_PROJECT_ROOT` یا دو سطح بالاتر از `apps/command-center` خوانده می‌شود. override هر پروژه با `COMMAND_CENTER_PROJECT_<CODE>_PATH` پشتیبانی می‌شود. مسیر نهایی باید وجود داشته باشد، directory باشد و خارج از ریشهٔ مجاز قرار نگیرد.

### AgentSession

مدل جدید شامل `ownerId`, `projectId`, `runtime`, `sessionName`, `externalSessionId`, `workspacePath`, `status`, `lastRunAt` و timestamps است. روی `(ownerId, projectId, runtime)` unique است. `AgentRun` به‌صورت nullable به session وصل می‌شود تا چت‌های عمومی قبلی همچنان کار کنند.

### proposal

خروجی parse‌شدهٔ Hermes از طریق `createProposalFromAgent` به `PlanProposal` تبدیل می‌شود. هنگام ساخت proposal، پروژه و تیم باید در scope کاربر باشند و task payload با `createTaskSchema` سازگار باشد. proposal هرگز مستقیماً task نمی‌سازد؛ مسیر approve موجود تنها نقطهٔ mutation باقی می‌ماند.

## API

- `GET /api/ai/sessions?projectId=...` وضعیت session و workspace قابل دسترس کاربر را برمی‌گرداند.
- `POST /api/ai/chat` فیلد `projectId` را می‌پذیرد، session را resolve/create می‌کند، اجرای Hermes را در workspace انجام می‌دهد و `session` و `proposal` را کنار پاسخ برمی‌گرداند.
- `GET /api/ceo/proposals` پیشنهاد تولیدشده را طبق scope نمایش می‌دهد؛ approve/reject موجود بدون تغییر قرارداد باقی می‌ماند.

## خطا و امنیت

- نبود workspace، executable یا session به‌صورت status مسدود و پیام شفاف برمی‌گردد.
- عدم دسترسی پروژه یا تیم status 403 است.
- Hermes فقط در workspace allowlisted اجرا می‌شود و `shell: false` حفظ می‌شود.
- task creation به validation موجود و تأیید مدیرعامل محدود است.
- متن Hermes، session id و خطای process با سقف طول ذخیره می‌شوند.
- برای proposalهای agent، audit رویدادهای `AI_SESSION_CREATED`, `AI_CHAT_COMPLETED` و `AGENT_PROPOSAL_CREATED` ثبت می‌شود.

## معیار پذیرش

- در سیستم فعلی، Hermes بدون تنظیم دستی executable از PATH پیدا و با دستور واقعی `chat` اجرا می‌شود.
- دو پیام متوالی برای یک کاربر و پروژه، یک session دیتابیس مشترک و workspace یکسان دارند.
- chat بدون project همچنان برای تحلیل یک‌باره کار می‌کند، اما session پروژه‌ای نمی‌سازد.
- workspace ناموجود، دسترسی خارج scope و خروجی نامعتبر هیچ mutation task ایجاد نمی‌کنند.
- proposal معتبر در پنل مدیرعامل قابل مشاهده است و approve آن یک task با چهار phase می‌سازد.
- OMP همچنان به‌عنوان runtime جداگانهٔ قابل پیکربندی باقی می‌ماند؛ این تغییر اجرای OMP را جعل نمی‌کند.
- تست واحد parser/resolver، تست قرارداد API، migration، build و smoke test شبکه موفق هستند.
