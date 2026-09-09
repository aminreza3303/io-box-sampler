# مقرفرماندهی Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ساخت یک اپ مستقل و لوکال برای فرماندهی پروژه‌های نرم‌افزاری، تیم‌ها، افراد، تایم‌لاین چهارفازی، ایجنت‌های Hermes/OMP و اتاق فرمان مدیرعامل، بدون آسیب‌زدن به دموی فعلی نیوکش.

**Architecture:** اپ فرماندهی در `apps/command-center` به‌صورت Next.js full-stack اجرا می‌شود و از PostgreSQL/Prisma برای persistence استفاده می‌کند. API دامنه تنها مسیر تغییر داده است؛ Hermes و ایجنت‌های فرزند از طریق runtime adapter اجرا می‌شوند و قبل از هر mutation مدیریتی یک `PlanProposal` قابل تأیید تولید می‌کنند. اپ فعلی Vite در ریشه ریپو حفظ می‌شود و با مسیر اجرای جداگانه قابل اجرا باقی می‌ماند.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, local email/password sessions, Zod, Vitest, Playwright, Hermes CLI, OMP/Oh My Pi CLI.

**Spec:** `C:\Users\a.sedabadi\Documents\ChatGPT\PO\docs\superpowers\specs\2026-08-26-moqarr-farmandehi-design.md`

## Global Constraints

- تمام رابط‌های جدید فارسی و RTL هستند.
- تغییرات فعلی کاربر در `src/main.jsx`، `src/demo/journey.js` و `src/journey-extensions.css` نباید overwrite یا reformat شوند.
- اپ موجود Vite و اپ جدید فرماندهی دو entrypoint مستقل دارند.
- دیتابیس توسعه PostgreSQL لوکال است؛ SQLite استفاده نمی‌شود.
- سه پروژه seed اولیه «نیوکاش»، «شاطی» و «تراز» هستند؛ تیم‌های seed اولیه «شاطی» و «نیوکاش» هستند.
- هر `Task` دقیقاً چهار `TaskPhase` دارد: `PRODUCT`, `DESIGN`, `DEVELOPMENT`, `DELIVERY`.
- نقش‌ها: `CEO`, `MANAGER`, `MEMBER`; تأیید proposalهای سطح سازمان فقط برای `CEO` است.
- ایجنت‌ها مستقیماً در دیتابیس write نمی‌کنند؛ mutation فقط از service/API دامنه انجام می‌شود.
- پرامپت‌های فرزندان از ساختار OMP محلی مشتق می‌شوند و با داده متغیر به‌صورت جدا از system prompt تزریق می‌شوند.
- secrets فقط از env خوانده می‌شوند و در prompt، UI، seed یا log نوشته نمی‌شوند.
- استانداردها به‌صورت practiceهای قابل استفاده پیاده می‌شوند، نه ادعای certification: ISO 21502 برای governance/planning/risk/delivery، performance domains PMI برای scope/schedule/stakeholder/resource/measurement/risk، و Scrum Guide 2020 برای product backlog، sprint backlog، review و retrospective.
- تمام taskها با تست مستقل، build/lint و commit کوچک پایان می‌یابند.

## File Map Before Implementation

- Create `apps/command-center/package.json`: dependencies و scriptهای اپ مستقل.
- Create `apps/command-center/app/**`: routeها، layout RTL و صفحات UI.
- Create `apps/command-center/components/ui/**`: primitives تولیدشده/تنظیم‌شده از shadcn/ui.
- Create `apps/command-center/components/command-center/**`: تایم‌لاین، proposal review، memory editor، scenario builder و agent monitor.
- Create `apps/command-center/lib/db.ts`: singleton Prisma client.
- Create `apps/command-center/lib/auth.ts`: local credentials، session encode/decode و current user.
- Create `apps/command-center/lib/rbac.ts`: مجوزهای role/scope.
- Create `apps/command-center/lib/validators.ts`: schemaهای Zod برای mutationها و پیام ایجنت.
- Create `apps/command-center/server/domain/**`: serviceهای transaction-safe برای task، phase، memory، rule و proposal.
- Create `apps/command-center/server/agents/**`: runtime adapter، process runner، orchestrator و fake runtime.
- Create `apps/command-center/prompts/agents/**`: promptهای versioned برای Hermes و سه agent فرزند.
- Create `apps/command-center/prisma/schema.prisma`: مدل relational.
- Create `apps/command-center/prisma/seed.ts`: داده‌های توسعه و کاربر مدیرعامل.
- Create `apps/command-center/tests/**`: unit، integration و contract tests.
- Create `apps/command-center/Dockerfile` و `apps/command-center/docker-compose.yml`: artifact استقرار بعدی.
- Modify root `package.json` only to add explicit `dev:command-center`, `build:command-center` و `test:command-center` scripts.
- Do not modify the existing FIDA demo implementation files unless an explicit integration bug blocks the new entrypoint.

### Task 1: Scaffold the Isolated Command Center App

**Files:**
- Create: `apps/command-center/package.json`
- Create: `apps/command-center/tsconfig.json`
- Create: `apps/command-center/next.config.ts`
- Create: `apps/command-center/postcss.config.mjs`
- Create: `apps/command-center/app/layout.tsx`
- Create: `apps/command-center/app/page.tsx`
- Create: `apps/command-center/app/globals.css`
- Create: `apps/command-center/lib/utils.ts`
- Modify: `package.json`
- Test: `apps/command-center/tests/smoke.test.ts`

**Interfaces:**
- Produces `apps/command-center` with `npm run dev`, `npm run build` and `npm run test` scripts.
- Produces `cn(...inputs: ClassValue[]): string` in `lib/utils.ts` for shadcn primitives.
- Root scripts call the isolated app without changing the existing `npm run dev` behavior.

- [ ] **Step 1: Write the failing smoke test**

Create a test that asserts the command-center package exposes the expected scripts and that the root package preserves the existing `dev` script.

```ts
import test from "node:test";
import assert from "node:assert/strict";
import root from "../../../package.json" with { type: "json" };
import commandCenter from "../package.json" with { type: "json" };

test("command center is isolated from the legacy app", () => {
  assert.equal(typeof root.scripts.dev, "string");
  assert.equal(commandCenter.scripts.dev, "next dev");
  assert.equal(commandCenter.scripts.build, "next build");
  assert.equal(commandCenter.scripts.test, "vitest run");
});
```

- [ ] **Step 2: Run the smoke test and verify it fails**

Run: `node --test apps/command-center/tests/smoke.test.ts`

Expected: FAIL because the isolated app package and test file do not exist yet.

- [ ] **Step 3: Add the isolated package and minimal RTL page**

Use Next.js, React, TypeScript, Tailwind, shadcn dependencies, Prisma, Zod and test dependencies in the app package. Set `dir="rtl"`, `lang="fa"`, title `مقرفرماندهی`, and render a minimal heading from `app/page.tsx`.

- [ ] **Step 4: Add root scripts without changing the legacy command**

Add:

```json
{
  "dev:command-center": "npm --prefix apps/command-center run dev",
  "build:command-center": "npm --prefix apps/command-center run build",
  "test:command-center": "npm --prefix apps/command-center run test"
}
```

- [ ] **Step 5: Run the smoke test and production build**

Run: `node --test apps/command-center/tests/smoke.test.ts`

Run: `npm run build:command-center`

Expected: PASS and a successful Next.js production build. The existing root `npm run build` must remain the Vite build.

- [ ] **Step 6: Commit**

```bash
git add apps/command-center package.json
git commit -m "feat: scaffold isolated command center app"
```

### Task 2: Add PostgreSQL Schema, Prisma Client and Standard Project Artifacts

**Files:**
- Create: `apps/command-center/prisma/schema.prisma`
- Create: `apps/command-center/prisma/seed.ts`
- Create: `apps/command-center/lib/db.ts`
- Create: `apps/command-center/lib/validators.ts`
- Create: `apps/command-center/server/domain/project-service.ts`
- Create: `apps/command-center/server/domain/task-service.ts`
- Test: `apps/command-center/tests/domain/project-service.test.ts`
- Test: `apps/command-center/tests/domain/task-service.test.ts`
- Create: `apps/command-center/.env.example`

**Interfaces:**
- `createProject(input, actor): Promise<Project>`
- `createTask(input, actor): Promise<TaskWithPhases>`
- `updateTaskPhase(taskId, phase, patch, actor): Promise<TaskPhase>`
- `listCommandCenterSnapshot(filters, actor): Promise<CommandCenterSnapshot>`

Use relational enums for role, task status, phase type/status, priority, proposal status and memory scope. Enforce a unique `(taskId, phaseType)` constraint and seed exactly four phases per task.

- [ ] **Step 1: Write failing domain tests**

Test that a new task receives exactly four phases, invalid phase types are rejected, a member cannot mutate another team’s task, and a dependency cannot point to the same task.

```ts
test("createTask creates the four canonical phases", async () => {
  const task = await createTask(validTaskInput, ceoActor);
  assert.deepEqual(task.phases.map((phase) => phase.phaseType), [
    "PRODUCT", "DESIGN", "DEVELOPMENT", "DELIVERY",
  ]);
});
```

- [ ] **Step 2: Run targeted tests and verify failure**

Run: `npm --prefix apps/command-center run test -- tests/domain/project-service.test.ts tests/domain/task-service.test.ts`

Expected: FAIL because Prisma schema and service functions are not defined.

- [ ] **Step 3: Implement schema and migration**

Create models for User, Project, Team, TeamMember, Task, TaskPhase, TaskDependency, Goal, Risk, Issue, Decision, Sprint, AuditEvent and their relations. Include `createdAt`, `updatedAt`, soft archive where the model can be archived, and indexes for project/team/status/date queries.

- [ ] **Step 4: Start the local PostgreSQL-compatible development database**

Because the current machine has neither `psql` nor Docker, use the local Prisma Postgres development server for this phase:

```text
npm --prefix apps/command-center exec prisma dev --name moqarr-farmandehi --detach
npm --prefix apps/command-center exec prisma dev ls
```

Copy the returned local `DATABASE_URL` into `apps/command-center/.env.local`. Keep this instance named `moqarr-farmandehi` so it can be stopped or restarted without losing the project database accidentally.

- [ ] **Step 5: Implement seed and domain services**

Seed the three projects, two teams, CEO/manager/member users, a product backlog, one active sprint, sample risks/issues/decisions and tasks distributed across the four phases. Wrap multi-row task creation in a transaction.

- [ ] **Step 6: Run migration, seed and tests**

Run: `npm --prefix apps/command-center exec prisma migrate dev --name init_command_center`

Run: `npm --prefix apps/command-center exec prisma db seed`

Run: `npm --prefix apps/command-center run test -- tests/domain/project-service.test.ts tests/domain/task-service.test.ts`

Expected: migration/seed succeed against `DATABASE_URL`; targeted tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/command-center/prisma apps/command-center/lib apps/command-center/server apps/command-center/tests
git commit -m "feat: add command center project domain"
```

### Task 3: Implement Local Authentication and Role-Based Access

**Files:**
- Create: `apps/command-center/lib/auth.ts`
- Create: `apps/command-center/lib/rbac.ts`
- Create: `apps/command-center/app/login/page.tsx`
- Create: `apps/command-center/app/api/auth/login/route.ts`
- Create: `apps/command-center/app/api/auth/logout/route.ts`
- Create: `apps/command-center/middleware.ts`
- Test: `apps/command-center/tests/auth/rbac.test.ts`
- Test: `apps/command-center/tests/auth/login.test.ts`

**Interfaces:**
- `authenticateWithPassword(email, password): Promise<SessionUser | null>`
- `requireUser(request): Promise<SessionUser>`
- `assertPermission(actor, permission, scope): void`
- `canApproveProposal(actor, proposal): boolean`

- [ ] **Step 1: Write failing tests**

Cover valid/invalid login, protected route redirect, CEO approval permission, manager project-scope permission and member denial for organization memory.

- [ ] **Step 2: Implement local credentials and signed session cookie**

Hash seeded passwords with a password hashing library, issue an HTTP-only secure-in-production cookie, reject expired/malformed sessions and never return password hashes in API responses.

- [ ] **Step 3: Add middleware and server-side guards**

Protect all command-center pages except `/login` and auth routes. Repeat permission checks inside every mutation service so UI hiding is never the only control.

- [ ] **Step 4: Run auth tests and build**

Run: `npm --prefix apps/command-center run test -- tests/auth`

Run: `npm run build:command-center`

Expected: all auth tests PASS and protected pages compile.

- [ ] **Step 5: Commit**

```bash
git add apps/command-center/lib apps/command-center/app/login apps/command-center/app/api/auth apps/command-center/middleware.ts apps/command-center/tests/auth
git commit -m "feat: add local auth and role permissions"
```

### Task 4: Build the RTL Command Center and Gantt Timeline

**Files:**
- Create: `apps/command-center/app/command-center/page.tsx`
- Create: `apps/command-center/app/api/snapshot/route.ts`
- Create: `apps/command-center/app/api/tasks/route.ts`
- Create: `apps/command-center/app/api/tasks/[taskId]/route.ts`
- Create: `apps/command-center/components/command-center/command-center-shell.tsx`
- Create: `apps/command-center/components/command-center/timeline-grid.tsx`
- Create: `apps/command-center/components/command-center/task-row.tsx`
- Create: `apps/command-center/components/command-center/task-detail-sheet.tsx`
- Create: `apps/command-center/components/command-center/filter-bar.tsx`
- Create: `apps/command-center/components/ui/{button,badge,avatar,calendar,dialog,dropdown-menu,input,select,sheet,table,tabs,toast,tooltip}.tsx`
- Modify: `apps/command-center/app/globals.css`
- Test: `apps/command-center/tests/domain/timeline.test.ts`
- Test: `apps/command-center/tests/e2e/command-center.spec.ts`

**Interfaces:**
- `buildTimelineColumns(range, zoom): TimelineColumn[]`
- `getPhaseBarGeometry(phase, range): PhaseBarGeometry | null`
- `CommandCenterSnapshot`: `{ projects, teams, users, tasks, phases, risks, issues, sprints }`

- [ ] **Step 1: Write timeline geometry tests**

Test that phase bars align to start/end dates, out-of-range phases are clipped, four phases render in order, RTL labels remain readable, and a zero-length phase gets a minimum visible marker.

- [ ] **Step 2: Implement snapshot API and timeline pure functions**

Validate query filters with Zod, apply actor scope in the service, and return normalized rows. Keep date math outside React components.

- [ ] **Step 3: Implement shadcn-based shell and filters**

Use Sidebar, Tabs, Table, Select, Calendar, Badge, Avatar, Sheet and Toast. Keep task names fixed on the right and the timeline horizontally scrollable. Add filters for project, team, assignee, status, phase and zoom.

- [ ] **Step 4: Implement four-segment task rows and detail sheet**

Render the phase segments with semantic labels, progress percentage, blocked/overdue indicators, dependencies and resource conflicts. The detail sheet edits only through the API and refreshes the affected row.

- [ ] **Step 5: Run unit, E2E and responsive checks**

Run: `npm --prefix apps/command-center run test -- tests/domain/timeline.test.ts`

Run: `npm --prefix apps/command-center exec playwright test tests/e2e/command-center.spec.ts`

Expected: task creation, phase editing, filtering and timeline rendering PASS at desktop and mobile viewport sizes.

- [ ] **Step 6: Commit**

```bash
git add apps/command-center/app apps/command-center/components apps/command-center/tests
git commit -m "feat: add rtl project command center timeline"
```

### Task 5: Add Projects, Teams, People, Backlog, Sprint and Risk Management

**Files:**
- Create: `apps/command-center/app/projects/page.tsx`
- Create: `apps/command-center/app/teams/page.tsx`
- Create: `apps/command-center/app/backlog/page.tsx`
- Create: `apps/command-center/app/risks/page.tsx`
- Create: `apps/command-center/app/api/projects/route.ts`
- Create: `apps/command-center/app/api/teams/route.ts`
- Create: `apps/command-center/app/api/users/route.ts`
- Create: `apps/command-center/app/api/sprints/route.ts`
- Create: `apps/command-center/server/domain/portfolio-service.ts`
- Test: `apps/command-center/tests/domain/portfolio-service.test.ts`
- Test: `apps/command-center/tests/e2e/portfolio.spec.ts`

**Interfaces:**
- `createTeam(input, actor): Promise<Team>`
- `addTeamMember(teamId, userId, actor): Promise<TeamMember>`
- `createSprint(input, actor): Promise<Sprint>`
- `updateRiskOrIssue(input, actor): Promise<Risk | Issue>`

- [ ] **Step 1: Write failing service tests**

Cover scoped team membership, sprint date validation, backlog item ordering, risk ownership, issue escalation and manager restrictions.

- [ ] **Step 2: Implement portfolio APIs and services**

Expose project charter fields, backlog, sprint dates, stakeholders, owners, capacity, risks, issues, decisions and metrics needed by ISO/PMI/Scrum-inspired workflows.

- [ ] **Step 3: Build management pages**

Use tables and sheets for CRUD, show project status summary, sprint progress, capacity, overdue work, risk heat and decision log. Every mutation shows success/error feedback and records an audit event.

- [ ] **Step 4: Run targeted and E2E tests**

Run: `npm --prefix apps/command-center run test -- tests/domain/portfolio-service.test.ts`

Run: `npm --prefix apps/command-center exec playwright test tests/e2e/portfolio.spec.ts`

Expected: CEO can manage all seeded entities, manager is scoped, member can update only permitted work.

- [ ] **Step 5: Commit**

```bash
git add apps/command-center/app apps/command-center/server apps/command-center/tests
git commit -m "feat: add portfolio team backlog and risk management"
```

### Task 6: Add Hermes/OMP Runtime Adapters and Three Child Agent Prompts

**Files:**
- Create: `apps/command-center/server/agents/types.ts`
- Create: `apps/command-center/server/agents/process-runner.ts`
- Create: `apps/command-center/server/agents/hermes-adapter.ts`
- Create: `apps/command-center/server/agents/omp-adapter.ts`
- Create: `apps/command-center/server/agents/orchestrator.ts`
- Create: `apps/command-center/prompts/agents/hermes-mother.md`
- Create: `apps/command-center/prompts/agents/product-analyst.md`
- Create: `apps/command-center/prompts/agents/builder.md`
- Create: `apps/command-center/prompts/agents/reviewer.md`
- Create: `apps/command-center/app/agents/page.tsx`
- Create: `apps/command-center/app/api/agents/health/route.ts`
- Create: `apps/command-center/app/api/agents/runs/route.ts`
- Test: `apps/command-center/tests/agents/contract.test.ts`
- Test: `apps/command-center/tests/agents/orchestrator.test.ts`

**Interfaces:**

```ts
export type AgentRuntime = "hermes" | "omp";

export interface AgentRequest {
  runId: string;
  role: string;
  prompt: string;
  cwd: string;
  timeoutMs: number;
}

export interface AgentResult {
  kind: "result" | "proposal" | "question" | "blocked" | "error";
  runId: string;
  output: string;
  data?: unknown;
  error?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AgentRuntimeAdapter {
  health(): Promise<{ available: boolean; version?: string; detail: string }>;
  run(request: AgentRequest): Promise<AgentResult>;
  stop(runId: string): Promise<void>;
}
```

- [ ] **Step 1: Write failing adapter contract tests**

Use a fake process runner to test valid JSON result, malformed result, timeout, non-zero exit, missing Bun/OMP and stop behavior. Assert no adapter path can directly call Prisma mutation methods.

- [ ] **Step 2: Implement safe process runner**

Spawn commands with an explicit executable path from env, sanitized argument arrays, cwd allowlist and timeout. Capture stdout/stderr separately, cap output bytes, kill the process on timeout and return `blocked` with an actionable detail.

- [ ] **Step 3: Implement Hermes and OMP adapters**

Hermes runs as mother/orchestrator. OMP runs child prompts through the installed `omp` CLI or the direct Bun entrypoint when the wrapper cannot resolve `bun.exe`. Runtime health must surface the current availability instead of silently falling back.

- [ ] **Step 4: Add versioned prompts from OMP patterns**

Keep role boundaries explicit: product analyst is scout/librarian-derived, builder is designer/task-derived, reviewer is reviewer/security-reviewer-derived. Include JSON output schema, ownership, no-direct-write rule, context limits and escalation format.

- [ ] **Step 5: Implement agent monitor UI and health endpoint**

Show mother/child roster, runtime health, queued/running/completed/blocked runs, duration, retries, last output summary and retry/cancel controls. Do not expose secrets or full prompt payloads to members.

- [ ] **Step 6: Run contract tests and build**

Run: `npm --prefix apps/command-center run test -- tests/agents`

Expected: fake runtime tests PASS; real health endpoint reports `blocked` with a clear Bun/OMP message if the local executable is unavailable.

- [ ] **Step 7: Commit**

```bash
git add apps/command-center/server/agents apps/command-center/prompts apps/command-center/app/agents apps/command-center/tests/agents
git commit -m "feat: add hermes omp agent runtime adapters"
```

### Task 7: Build CEO Memory, Goals, Scenarios and Approval Proposals

**Files:**
- Create: `apps/command-center/server/domain/memory-service.ts`
- Create: `apps/command-center/server/domain/rule-service.ts`
- Create: `apps/command-center/server/domain/proposal-service.ts`
- Create: `apps/command-center/server/domain/rule-evaluator.ts`
- Create: `apps/command-center/app/ceo/memory/page.tsx`
- Create: `apps/command-center/app/ceo/goals/page.tsx`
- Create: `apps/command-center/app/ceo/scenarios/page.tsx`
- Create: `apps/command-center/app/ceo/proposals/page.tsx`
- Create: `apps/command-center/app/api/ceo/memory/route.ts`
- Create: `apps/command-center/app/api/ceo/goals/route.ts`
- Create: `apps/command-center/app/api/ceo/scenarios/route.ts`
- Create: `apps/command-center/app/api/ceo/proposals/[proposalId]/route.ts`
- Create: `apps/command-center/components/command-center/memory-editor.tsx`
- Create: `apps/command-center/components/command-center/scenario-builder.tsx`
- Create: `apps/command-center/components/command-center/proposal-review.tsx`
- Test: `apps/command-center/tests/domain/rule-evaluator.test.ts`
- Test: `apps/command-center/tests/domain/proposal-service.test.ts`
- Test: `apps/command-center/tests/e2e/ceo-room.spec.ts`

**Interfaces:**
- `searchMemory(query, scope, actor): Promise<MemoryItem[]>`
- `evaluateScenario(scenarioId, snapshot): RuleEvaluation`
- `createProposalFromAgent(input): Promise<PlanProposal>`
- `approveProposal(proposalId, actor): Promise<ApprovalResult>`
- `rejectProposal(proposalId, actor, reason): Promise<PlanProposal>`

- [ ] **Step 1: Write failing rule and approval tests**

Test AND/OR conditions for task status, phase, due date, progress, capacity, risk, priority and project; assert evaluation is read-only; assert approval creates changes atomically; assert rejection records reason and leaves tasks unchanged.

```ts
test("approval applies a proposal atomically", async () => {
  const proposal = await createProposalFromAgent(overdueTaskProposal);
  const result = await approveProposal(proposal.id, ceoActor);
  assert.equal(result.status, "APPLIED");
  assert.ok(await findTask(result.createdTaskId));
});
```

- [ ] **Step 2: Implement memory scope, versioning and text search**

Support organization/project/team/task scope, tags, validity dates, source, superseded version and links. Search organization data first by exact scope and then by PostgreSQL text search; return source IDs with every context bundle.

- [ ] **Step 3: Implement goals and scenario rule evaluator**

Persist condition groups as validated JSON, restrict operators to the allowlisted domain fields, evaluate against a read-only snapshot and emit a deterministic explanation for each matched or failed condition.

- [ ] **Step 4: Implement proposal service and transactional approval**

Represent proposed create/update/assign/priority/date/risk actions as a diff. On approval, re-check permissions and current versions inside a transaction; reject stale proposals with a conflict status instead of applying an outdated diff.

- [ ] **Step 5: Connect orchestrator to CEO room**

Build a context bundle from current status, relevant memory, goals and matched rules; call Hermes; persist the child runs and proposal; never apply the returned action before CEO approval.

- [ ] **Step 6: Build CEO pages and E2E flow**

Provide memory CRUD, goal cards, no-code scenario builder, matched-condition explanation and proposal diff review with Approve/Reject buttons. Limit these routes to CEO/authorized managers according to scope.

- [ ] **Step 7: Run tests and commit**

Run: `npm --prefix apps/command-center run test -- tests/domain/rule-evaluator.test.ts tests/domain/proposal-service.test.ts`

Run: `npm --prefix apps/command-center exec playwright test tests/e2e/ceo-room.spec.ts`

Expected: the full scenario `status → memory → condition → Hermes → proposal → CEO approval → timeline update → audit` PASS.

```bash
git add apps/command-center/server/domain apps/command-center/app/ceo apps/command-center/app/api/ceo apps/command-center/components/command-center apps/command-center/tests
git commit -m "feat: add ceo memory scenarios and proposal approvals"
```

### Task 8: Add Audit, Metrics, Docker Artifacts and Final Verification

**Files:**
- Create: `apps/command-center/app/audit/page.tsx`
- Create: `apps/command-center/app/api/audit/route.ts`
- Create: `apps/command-center/server/domain/audit-service.ts`
- Create: `apps/command-center/server/domain/metrics-service.ts`
- Create: `apps/command-center/Dockerfile`
- Create: `apps/command-center/docker-compose.yml`
- Create: `apps/command-center/.dockerignore`
- Modify: `apps/command-center/README.md`
- Test: `apps/command-center/tests/integration/audit.test.ts`
- Test: `apps/command-center/tests/e2e/full-command-center.spec.ts`

**Interfaces:**
- `recordAuditEvent(event): Promise<AuditEvent>`
- `getProjectMetrics(filters, actor): Promise<ProjectMetrics>`
- `docker compose up --build` starts app and PostgreSQL with health checks.

- [ ] **Step 1: Write failing audit and metrics tests**

Assert every mutation includes actor/action/before/after/correlationId, proposal approval and rejection are queryable, and metrics calculate overdue count, phase completion, cycle time, team load and risk totals within actor scope.

- [ ] **Step 2: Implement audit and metrics services**

Use transaction hooks in domain services so failed mutations do not emit successful audit events. Add dashboard summaries aligned to scope, schedule, resources, risk, measurement and delivery practices.

- [ ] **Step 3: Add Docker artifacts for later server deployment**

Use a multi-stage Node image for the command-center app, a PostgreSQL service with a named volume, env-based `DATABASE_URL`, migration command on startup and health checks. Do not require Docker for the current local development workflow.

- [ ] **Step 4: Add runbook and verify both apps**

Document:

```text
npm install
npm --prefix apps/command-center install
npm --prefix apps/command-center exec prisma migrate dev
npm --prefix apps/command-center exec prisma db seed
npm run dev:command-center
```

Then run:

```text
npm test
npm run build
npm run test:command-center
npm run build:command-center
npm --prefix apps/command-center exec playwright test
```

Expected: legacy Vite tests/build remain green; command-center tests/build/E2E pass; `docker compose config` validates without requiring the daemon.

- [ ] **Step 5: Commit**

```bash
git add apps/command-center
git commit -m "feat: add audit metrics and docker deployment artifacts"
```

## Plan Self-Review

- Spec coverage: timeline and four phases are Task 4; projects/teams/people/tasks and RBAC are Tasks 2–5; Hermes/OMP and three children are Task 6; memory/goals/scenarios/proposals and CEO approval are Task 7; audit, metrics, standards mapping and Docker are Task 8.
- Existing repo safety: all new product code is isolated under `apps/command-center`; only root scripts are modified, and the dirty legacy files are explicitly protected.
- Type consistency: `AgentRequest`, `AgentResult` and `AgentRuntimeAdapter` are defined before adapter/orchestrator consumers; domain service signatures are defined before UI/API consumers.
- No direct agent writes: adapters return structured results; proposal approval is the only path that applies agent-generated mutations.
- Runtime caveat made explicit: OMP wrapper currently depends on Bun resolution; direct Bun entrypoint/env configuration and a visible blocked state are part of Task 6.
- Standards are tailored to the product: ISO/PMI/Scrum concepts become concrete fields, views, statuses and metrics without forcing a single delivery method.
