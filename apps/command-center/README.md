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

- `/command-center` — نمای timeline و taskها
- `/domains` — نقشهٔ ۲۸ دامنهٔ نیوکاش، روابط، قواعد و نقشهٔ راه تعاملی
- `/projects`, `/teams`, `/backlog`, `/risks` — مدیریت پرتفولیو
- `/agents` — health و اجرای Hermes/OMP
- `/ceo/memory`, `/ceo/goals`, `/ceo/scenarios`, `/ceo/proposals` — اتاق مدیرعامل
- `/audit` و `/api/metrics` — ردپا و شاخص‌ها
- Obsidian محلی: `docs/obsidian/newcash-vault/`؛ فایل اصلی `newcash-map.canvas` است و می‌توان همین پوشه را به‌عنوان vault باز کرد.
