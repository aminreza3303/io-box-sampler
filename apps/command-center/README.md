# مقر فرماندهی

## اجرای لوکال

```text
npm install
npm --prefix apps/command-center install
npm --prefix apps/command-center exec prisma migrate deploy
npm --prefix apps/command-center exec prisma db seed
npm run dev:command-center -- --hostname 0.0.0.0
```

سپس روی همان شبکه از `http://<LAN-IP>:3000/login` وارد شوید؛ روی این سیستم آدرس فعلی `http://192.168.1.61:3000/login` است. login و RBAC فعال است؛ پورت را روی مودم port-forward نکنید. اگر Windows Firewall دسترسی را بست، برای شبکه Private یک inbound rule برای TCP/3000 بسازید.

## Docker برای سرور

```text
docker compose up --build
```

قبل از استقرار مقدارهای `DATABASE_URL` و `AUTH_SESSION_SECRET` را با secret واقعی جایگزین کنید. compose شامل PostgreSQL با volume و health check است و migration را هنگام شروع app اجرا می‌کند.

## مسیرهای اصلی

- `/command-center` — نمای خط زمانی فعالیت‌ها و چهار فاز هر کار
- `/domains` — نقشهٔ ۲۸ دامنهٔ نیوکاش، روابط، قواعد و نقشهٔ راه تعاملی
- `/operations`, `/finance`, `/admin` — فرایندهای عملیات، کنترل مالی و حاکمیت ادمین
- `/ai` — گفت‌وگوی اجرایی با Hermes مادر و حافظهٔ اجراهای محلی
- `/scenarios` — طراحی سناریوهای کسب‌وکار و برآورد زمان، هزینه و حجم تغییر بر اساس دامنه‌ها
- `/projects`, `/teams`, `/backlog`, `/risks` — مدیریت پرتفولیو
- `/agents` — سلامت و اجرای Hermes/OMP
- `/ceo/memory`, `/ceo/goals`, `/ceo/scenarios`, `/ceo/proposals` — اتاق مدیرعامل
- `/audit` و `/api/metrics` — ردپا و شاخص‌ها
- مستندات پشتیبان نقشه در `docs/obsidian/newcash-vault/` نگه‌داری می‌شوند؛ تجربهٔ اصلی دانش محصول در `/domains` وبی است و برای استفاده نیاز به بازکردن Obsidian ندارد.

در `/ai` و `/scenarios` می‌توان یک پروژه را به Hermes وصل کرد. پیام‌های همان کاربر و پروژه در یک session پایدار و در workspace همان پروژه اجرا می‌شوند. Hermes فقط proposal می‌سازد؛ task بعد از تأیید مدیرعامل در `/ceo/proposals` ایجاد می‌شود. چت بدون پروژه one-shot باقی می‌ماند.

برای اجرای local، `hermes` باید در PATH باشد یا `HERMES_EXECUTABLE` را در `.env.local` تنظیم و سرویس را restart کنید. به‌صورت پیش‌فرض adapter از `openrouter` با مدل `openai/gpt-4o-mini` استفاده می‌کند؛ این دو مقدار با `HERMES_PROVIDER` و `HERMES_MODEL` قابل تغییرند. مسیر `COMMAND_CENTER_PROJECT_ROOT` ریشهٔ مجاز workspaceهاست و override هر پروژه با `COMMAND_CENTER_PROJECT_<CODE>_PATH` تنظیم می‌شود. در Docker، workspaceها باید داخل volume mount شده باشند.

در `/scenarios` نرخ نفر-روز، ظرفیت هفتگی تیم و بافر ریسک قابل تنظیم است. اگر نرخ نفر-روز وارد نشود، سیستم هزینه را عمداً محاسبه نمی‌کند و فقط زمان و حجم تغییر را نمایش می‌دهد. برآوردها به‌عنوان تحلیل ثبت می‌شوند و هیچ تغییر مالی یا عملیاتی خودکاری ایجاد نمی‌کنند.
