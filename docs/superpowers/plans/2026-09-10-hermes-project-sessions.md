# Hermes Project Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** اتصال چت مقر فرماندهی به session پایدار Hermes در workspace پروژه و تبدیل امن خروجی ساخت‌یافتهٔ آن به proposal قابل تأیید و سپس task چهارمرحله‌ای.

**Architecture:** یک workspace resolver مسیر پروژه را بدون ذخیرهٔ absolute path قابل‌حمل resolve می‌کند. adapter برای Hermes از CLI واقعی `chat --continue --create-if-missing` استفاده می‌کند و session per user/project را در دیتابیس ثبت می‌کند. خروجی پیشنهاد ابتدا validate و در `PlanProposal` ذخیره می‌شود؛ فقط approval مدیرعامل از مسیر موجود task واقعی و چهار phase آن را ایجاد می‌کند.

**Tech Stack:** Next.js 15 App Router، TypeScript، Prisma/PostgreSQL، Zod، Vitest، CLI Hermes و Tailwind/shadcn-style UI.

**Spec:** `docs/superpowers/specs/2026-09-10-hermes-project-sessions-design.md`

## Global Constraints

- اجرای چت برای پروژه در backend و به‌صورت process مخفی انجام می‌شود؛ بازکردن پنجرهٔ گرافیکی Hermes روی دسکتاپ جزو این نسخه نیست.
- Hermes فقط پیشنهاد می‌دهد؛ ساخت یا تغییر task، فایل، موجودی مالی، پرداخت، سیاست یا دادهٔ عملیاتی بدون تأیید صریح انجام نمی‌شود.
- workspace فقط از مسیر allowlisted و با `shell: false` اجرا می‌شود.
- session برای هر `(ownerId, projectId, runtime)` یکتا است.
- چت بدون project برای سازگاری قبلی one-shot باقی می‌ماند و session پروژه‌ای نمی‌سازد.
- `HERMES_EXECUTABLE` override اختیاری است و fallback سیستم `hermes` باید کار کند؛ OMP اجرای جعلی یا fallback نامعتبر ندارد.
- متن Hermes، session id و خطای process با سقف طول ذخیره می‌شوند.

---

### Task 1: قراردادهای workspace و parser پیشنهاد Hermes

**Files:**
- Create: `apps/command-center/server/agents/project-workspace.ts`
- Create: `apps/command-center/server/agents/proposal-parser.ts`
- Modify: `apps/command-center/lib/validators.ts`
- Test: `apps/command-center/tests/agents/project-workspace.test.ts`
- Test: `apps/command-center/tests/agents/proposal-parser.test.ts`

**Interfaces:**
- Consumes: `Project.code`, environment variables `COMMAND_CENTER_PROJECT_ROOT` و `COMMAND_CENTER_PROJECT_<CODE>_PATH`.
- Produces: `resolveProjectWorkspace(project: { code: string }): { key: string; path: string } | { key: string; error: string }` و `parseAgentProposal(output: string): AgentProposal | null`.

- [ ] **Step 1: Write failing resolver tests**

  در `project-workspace.test.ts` سه حالت را مشخص کن: code `newcash` با root پیش‌فرض resolve شود، override با نام uppercase و خط تیره به مسیر env امن تبدیل شود، و مسیر غیرموجود یا خارج از root نتیجهٔ `error` بدهد.

- [ ] **Step 2: Run resolver tests to verify failure**

  Run: `npm test -- --run tests/agents/project-workspace.test.ts`

  Expected: FAIL because the resolver module and exported function do not exist.

- [ ] **Step 3: Implement resolver with an allowlist**

  `resolveProjectWorkspace` باید `COMMAND_CENTER_PROJECT_ROOT` را در صورت وجود وگرنه `path.resolve(process.cwd(), "../..")` بگیرد. برای هر project code ابتدا env override را با تبدیل حروف به uppercase و هر کاراکتر غیرالفبایی به `_` بخواند؛ اگر override نبود، برای `newcash` ریشه و برای کدهای دیگر `<root parent>/<code>` را امتحان کند. با `realpath` مسیر را canonical کن، وجود directory را بررسی کن و اجازه نده مسیر خارج از root یا sibling root باشد؛ خطا را بدون افشای secret برگردان.

- [ ] **Step 4: Write failing proposal parser tests**

  parser باید marker دقیق `<COMMAND_CENTER_PROPOSAL>...</COMMAND_CENTER_PROPOSAL>` را از متن جدا کند، JSON معتبر را به `{ title, summary?, scope, projectId, teamId?, task }` محدود کند، متن بدون marker یا JSON نامعتبر را `null` بدهد و مقادیر طولانی/اولویت ناشناخته را رد کند.

- [ ] **Step 5: Implement Zod-backed parser**

  در `validators.ts` schemaهای `agentTaskProposalSchema` و `agentProposalSchema` را اضافه کن و `parseAgentProposal` را طوری بنویس که فقط اولین marker معتبر را parse کند، متن خارج marker را دست‌نخورده نگه دارد و هیچ side effect نداشته باشد.

- [ ] **Step 6: Run focused tests**

  Run: `npm test -- --run tests/agents/project-workspace.test.ts tests/agents/proposal-parser.test.ts`

  Expected: all resolver and parser cases PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/command-center/server/agents/project-workspace.ts apps/command-center/server/agents/proposal-parser.ts apps/command-center/lib/validators.ts apps/command-center/tests/agents/project-workspace.test.ts apps/command-center/tests/agents/proposal-parser.test.ts
  git commit -m "feat(command-center): add Hermes workspace and proposal contracts"
  ```

### Task 2: session پایدار و adapter واقعی Hermes

**Files:**
- Modify: `apps/command-center/prisma/schema.prisma`
- Create: `apps/command-center/prisma/migrations/20260910103000_add_agent_sessions/migration.sql`
- Modify: `apps/command-center/server/agents/types.ts`
- Modify: `apps/command-center/server/agents/runtime-adapter.ts`
- Modify: `apps/command-center/server/agents/orchestrator.ts`
- Test: `apps/command-center/tests/agents/runtime-adapter.test.ts`

**Interfaces:**
- Consumes: `resolveProjectWorkspace`, `AgentRequest`, `AgentRuntimeAdapter`.
- Produces: `AgentSession` Prisma model، `AgentRequest.projectId?`, `AgentRequest.sessionName?`, و `dispatchToMother(prompt, cwd, options?)` که نتیجهٔ متنی Hermes و session metadata را برمی‌گرداند.

- [ ] **Step 1: Write failing adapter tests**

  با fake `ProcessRunner` تست کن که Hermes بدون env با command `hermes` و آرگومان‌های `chat`, `--continue`, `--create-if-missing`, `--query`, `--oneshot`, `--quiet`, `--in` اجرا شود؛ خروجی non-empty با code صفر `kind: result` بدهد؛ timeout `blocked` و stderr غیرصفر `error` بدهد. تست کن که OMP هنوز قرارداد قبلی را بدون ادعای موفقیت اجرا کند.

- [ ] **Step 2: Run adapter tests to verify failure**

  Run: `npm test -- --run tests/agents/runtime-adapter.test.ts`

  Expected: FAIL because the current adapter calls unsupported `run --json` and no session fields exist.

- [ ] **Step 3: Add Prisma session model and migration**

  به `User` و `Project` relationهای session اضافه کن و مدل زیر را اضافه کن:

  ```prisma
  model AgentSession {
    id                String   @id @default(cuid())
    ownerId           String
    projectId         String
    runtime           String   @default("hermes")
    sessionName       String
    externalSessionId String?
    workspaceKey      String
    workspacePath     String
    status            String   @default("ACTIVE")
    lastRunAt         DateTime?
    owner             User     @relation(fields: [ownerId], references: [id])
    project           Project  @relation(fields: [projectId], references: [id])
    runs              AgentRun[]
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt

    @@unique([ownerId, projectId, runtime])
    @@index([projectId, updatedAt])
  }
  ```

  به `AgentRun`، `agentSessionId String?` و relation nullable اضافه کن. migration باید table، indexها و foreign key با `ON DELETE RESTRICT` بسازد.

- [ ] **Step 4: Update runtime contracts and Hermes invocation**

  `AgentRequest` را با `sessionName?: string` و `runtime?: AgentRuntime` توسعه بده. `CliAgentAdapter` برای Hermes executable را از `HERMES_EXECUTABLE ?? "hermes"` بگیرد و command را به شکل زیر بسازد:

  ```ts
  ["chat", "--continue", sessionName, "--create-if-missing", "--query", prompt, "--oneshot", "--quiet", "--in", cwd]
  ```

  برای Hermes خروجی plain را به `AgentResult` تبدیل کن و session id احتمالی را با parser محدود استخراج کن. برای OMP رفتار قبلی را نگه دار؛ نبود executable باید blocked بماند.

- [ ] **Step 5: Run focused adapter tests**

  Run: `npm test -- --run tests/agents/runtime-adapter.test.ts`

  Expected: all fake-runner assertions PASS.

- [ ] **Step 6: Generate client and verify migration**

  Run: `npx prisma generate` سپس `npx prisma db push` و `npx prisma migrate status` در `apps/command-center`.

  Expected: generated client contains `agentSession`; migration status reports database schema up to date.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/command-center/prisma/schema.prisma apps/command-center/prisma/migrations/20260910103000_add_agent_sessions/migration.sql apps/command-center/server/agents/types.ts apps/command-center/server/agents/runtime-adapter.ts apps/command-center/server/agents/orchestrator.ts apps/command-center/tests/agents/runtime-adapter.test.ts
  git commit -m "feat(command-center): persist project Hermes sessions"
  ```

### Task 3: API سشن، اتصال پروژه و proposal امن

**Files:**
- Create: `apps/command-center/server/agents/session-service.ts`
- Create: `apps/command-center/app/api/ai/sessions/route.ts`
- Modify: `apps/command-center/app/api/ai/chat/route.ts`
- Modify: `apps/command-center/server/domain/proposal-service.ts`
- Modify: `apps/command-center/app/api/ceo/proposals/route.ts`
- Modify: `apps/command-center/app/api/ceo/proposals/[proposalId]/route.ts`
- Test: `apps/command-center/tests/auth/ai-session-api-contract.test.ts`

**Interfaces:**
- Consumes: `resolveProjectWorkspace`, `parseAgentProposal`, `AgentSession`, existing `createProposalFromAgent`, `requireUser`.
- Produces: `getOrCreateAgentSession(actor, projectId)`, `listAgentSessions(actor)`, و responseهای `{ session, workspace, proposal, ... }` از chat.

- [ ] **Step 1: Write failing service/API contract tests**

  تست‌های pure contract باید این موارد را پوشش دهند: project اجباری برای session، عضو خارج scope status 403، session name deterministic برای یک owner/project، chat بدون project بدون session، proposal با task project/team خارج scope رد شود و proposal معتبر فقط ذخیره شود.

- [ ] **Step 2: Run tests to verify failure**

  Run: `npm test -- --run tests/auth/ai-session-api-contract.test.ts`

  Expected: FAIL because service and route contracts do not exist.

- [ ] **Step 3: Implement session service**

  `getOrCreateAgentSession` باید project فعال را با `id` و `code` پیدا کند، scope actor را بررسی کند، workspace را resolve کند و با `upsert` روی `(ownerId, projectId, runtime)` session name محدودشده مثل `command-center-${project.code}-${ownerId}` بسازد. `workspacePath` فقط snapshot تشخیصی است؛ در هر اجرا دوباره resolver validate شود.

- [ ] **Step 4: Extend chat request and persistence**

  `POST /api/ai/chat` فیلد `projectId?: unknown` را validate کند. اگر وجود داشت session را بگیرد، cwd را از resolver بگیرد، `agentSessionId` را روی run بنویسد، session را قبل/بعد اجرا update کند و اطلاعات session را در response برگرداند. اگر project نبود، رفتار فعلی بدون session حفظ شود. prompt باید نام پروژه، قرارداد proposal marker و الزام «proposal، نه task مستقیم» را شامل شود.

- [ ] **Step 5: Parse and persist proposal**

  فقط پس از نتیجهٔ موفق Hermes، `parseAgentProposal` اجرا شود. project/team/assignee با scope actor و relationهای واقعی validate شوند. سپس `createProposalFromAgent` با scope `PROJECT` و payload `{ action: "CREATE_TASK", task: ... }` فراخوانی شود. هیچ call مستقیمی به `prisma.task.create` از chat اضافه نشود. در صورت parse نامعتبر، پاسخ متن حفظ شود و proposal null بماند.

- [ ] **Step 6: Add sessions GET route and audit**

  `GET /api/ai/sessions?projectId=...` فقط sessionهای actor یا همه برای CEO را برگرداند؛ workspace availability را بدون نمایش secret نشان دهد. رویدادهای `AI_SESSION_CREATED` و `AGENT_PROPOSAL_CREATED` با metadata محدود ثبت شوند.

- [ ] **Step 7: Run focused tests**

  Run: `npm test -- --run tests/auth/ai-session-api-contract.test.ts tests/agents/*.test.ts`

  Expected: all session, resolver, parser and adapter tests PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/command-center/server/agents/session-service.ts apps/command-center/app/api/ai/sessions/route.ts apps/command-center/app/api/ai/chat/route.ts apps/command-center/server/domain/proposal-service.ts apps/command-center/app/api/ceo/proposals/route.ts apps/command-center/app/api/ceo/proposals/[proposalId]/route.ts apps/command-center/tests/auth/ai-session-api-contract.test.ts
  git commit -m "feat(command-center): route Hermes chats into project proposals"
  ```

### Task 4: UI انتخاب پروژه، session و نمایش proposal/task

**Files:**
- Modify: `apps/command-center/components/scenarios/scenario-planner-page.tsx`
- Modify: `apps/command-center/app/ai/page.tsx`
- Modify: `apps/command-center/components/navigation/app-nav.tsx`
- Modify: `apps/command-center/README.md`
- Test: `apps/command-center/tests/smoke.test.ts`

**Interfaces:**
- Consumes: `/api/snapshot`, `/api/ai/sessions`, `/api/ai/chat`, `/api/ceo/proposals`.
- Produces: انتخاب project برای Hermes، status session، پیام blocked/ready، لینک proposal و متن روشن دربارهٔ approval.

- [ ] **Step 1: Add project/session controls to scenario chat**

  در پنل Hermes یک select پروژه اضافه کن که از پروژه‌های snapshot تغذیه شود. project انتخاب‌شده را به chat ارسال کن، قبل از ارسال وضعیت session را از `/api/ai/sessions` بخوان و workspace path را فقط به‌صورت نام/کلید نمایشی نشان بده. اگر workspace موجود نبود، دکمهٔ ارسال disabled و خطای راهنما نشان داده شود.

- [ ] **Step 2: Show proposal handoff**

  اگر پاسخ chat proposal داشت، کارت «پیشنهاد در انتظار تأیید» و لینک `/ceo/proposals` نشان بده. متن کارت تأکید کند که task تا approval ساخته نشده است. وضعیت session و زمان آخرین اجرا نیز نمایش داده شود.

- [ ] **Step 3: Align general AI page**

  صفحهٔ `/ai` نیز project selector و session status داشته باشد، اما بدون project ارسال one-shot را مجاز نگه دارد. پیام خطای قدیمی `executable is not configured` را به وضعیت فارسی و actionable تبدیل کن؛ اگر Hermes در PATH پیدا نشد، نام env مورد نیاز را نشان بده.

- [ ] **Step 4: Update docs and smoke contract**

  README مسیر `/api/ai/sessions`، متغیرهای `HERMES_EXECUTABLE`, `COMMAND_CENTER_PROJECT_ROOT` و override پروژه را مستند کند. smoke test باید وجود scriptهای app و route page `/ai` و `/scenarios` را حفظ کند.

- [ ] **Step 5: Run full verification**

  Run: `npm test` در app، `npm test` در root و `npm run build` در `apps/command-center`.

  Expected: همهٔ تست‌ها PASS، build بدون type error و routeهای `/ai`, `/scenarios`, `/api/ai/sessions` در خروجی حاضر باشند.

- [ ] **Step 6: Run local authenticated smoke test**

  با کاربر manager به `/api/auth/login` وارد شو، سپس `POST /api/ai/chat` را با یک project معتبر و پیام کوتاه اجرا کن. انتظار می‌رود `session` در پاسخ برگردد؛ اگر credential/runtime مدل در سیستم در دسترس نبود، پاسخ blocked با پیام دقیق برگردد و task ساخته نشود. سپس `GET /api/ai/sessions` و `GET /api/ceo/proposals` را بررسی کن و رکوردهای آزمایشی تولیدشده را با شناسهٔ دقیق پاکسازی کن.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/command-center/components/scenarios/scenario-planner-page.tsx apps/command-center/app/ai/page.tsx apps/command-center/components/navigation/app-nav.tsx apps/command-center/README.md apps/command-center/tests/smoke.test.ts
  git commit -m "feat(command-center): expose Hermes project sessions in UI"
  ```

### Task 5: یکپارچه‌سازی migration، وضعیت سرویس و تحویل شبکه

**Files:**
- Modify: `apps/command-center/.env.example`
- Modify: `apps/command-center/README.md`
- Modify: `apps/command-center/docker-compose.yml` only if environment forwarding is missing

**Interfaces:**
- Consumes: migration Task 2، routes Task 3، UI Task 4.
- Produces: اجرای لوکال تکرارپذیر و دستور تست از دستگاه دیگر در همان Wi-Fi.

- [ ] **Step 1: Document runtime configuration**

  `.env.example` باید این کلیدها را بدون credential واقعی نشان دهد:

  ```text
  HERMES_EXECUTABLE=hermes
  OMP_EXECUTABLE=
  COMMAND_CENTER_PROJECT_ROOT=
  COMMAND_CENTER_PROJECT_NEWCASH_PATH=
  COMMAND_CENTER_PROJECT_SHATI_PATH=
  ```

- [ ] **Step 2: Verify Docker environment forwarding**

  اگر compose متغیرهای runtime را به app پاس نمی‌دهد، فقط همان environment entries را اضافه کن؛ container نباید مسیر Windows host را به‌عنوان مسیر معتبر فرض کند. برای Docker، workspace باید داخل volume mountشده و allowlisted تنظیم شود.

- [ ] **Step 3: Run final checks**

  Run: `git diff --check`, `npx prisma migrate status`, `npm test`, `npm run build`, و بررسی HTTP `GET http://192.168.1.61:3000/login` و `GET /scenarios` با session معتبر.

- [ ] **Step 4: Commit and report**

  ```bash
  git add apps/command-center/.env.example apps/command-center/README.md apps/command-center/docker-compose.yml
  git commit -m "docs(command-center): document Hermes project runtime"
  ```

  در تحویل نهایی صریحاً گزارش کن که session وبی background است، task فقط پس از approval ایجاد می‌شود، runtime واقعی Hermes پیدا شده یا blocked است، و سرویس روی LAN چه آدرسی دارد.
