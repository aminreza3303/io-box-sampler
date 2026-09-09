# Task 3 Review Fixes Implementation Plan

> **For agentic workers:** Execute this plan inline in the current task. Do not dispatch subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real Prisma-backed local password path and fail-closed scoped proposal authorization for the isolated command-center app.

**Architecture:** `User.passwordHash` is a required persisted field added by a forward-only migration. Seed upserts compute bcryptjs hashes from fixed local-only demo passwords, while auth explicitly selects and validates the hash before comparing it and maps only public session fields. RBAC treats organization, project, and team scope as mutually exclusive and requires complete, in-scope proposal identifiers for manager approvals.

**Tech Stack:** Prisma 7, PostgreSQL, bcryptjs, Next.js, TypeScript, Vitest.

**Spec:** `.superpowers/sdd/2026-09-09-moqarr-farmandehi/task-3-brief.md` and `.superpowers/sdd/2026-09-09-moqarr-farmandehi/task-3-review-package.md`

## Global Constraints

- Do not reset, drop, or recreate the database; add only a forward migration.
- Preserve existing legacy Vite edits in `src/main.jsx`, `src/demo/journey.js`, and `src/journey-extensions.css`.
- Organization proposal approval is CEO-only.
- Non-CEO authorization fails closed for missing or empty scopes.
- Seed demo credentials are documented only as local-development credentials.

### Task 1: Align Prisma schema, migration, generated client, and seed

**Files:**
- Modify: `apps/command-center/prisma/schema.prisma`
- Create: `apps/command-center/prisma/migrations/20260909120000_add_user_password_hash/migration.sql`
- Modify: `apps/command-center/prisma/seed.ts`
- Modify: `apps/command-center/lib/auth.ts`

**Interfaces:**
- `User.passwordHash` is a required `String` in Prisma and a non-empty bcrypt hash is required at authentication time.
- `authenticateWithPassword` returns `null` for absent, empty, malformed, or unavailable password-hash data.

- [ ] Add `passwordHash String` to `User`.
- [ ] Add `ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';` followed by `ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;`; never issue reset/drop SQL.
- [ ] Hash `ceo-demo-password`, `manager-demo-password`, and `member-demo-password` with `bcryptjs.hash(..., 12)` and include the results in both seed create and update upserts. Keep the credentials in a local-development comment and do not log them.
- [ ] Replace the auth cast with a Prisma `select` containing `passwordHash`, `archivedAt`, and active team/project membership data. Reject a missing/empty hash and catch bcrypt compare errors as a failed login.
- [ ] Run `prisma validate` and `prisma generate` so the client assumptions match the shipped schema.

### Task 2: Harden RBAC and add regressions

**Files:**
- Modify: `apps/command-center/lib/rbac.ts`
- Modify: `apps/command-center/tests/auth/login.test.ts`
- Modify: `apps/command-center/tests/auth/rbac.test.ts`

**Interfaces:**
- `assertPermission(actor, permission, scope)` rejects non-CEO empty/missing/mixed scopes and rejects organization mutations for non-CEOs.
- `canApproveProposal(actor, proposal)` returns `true` for CEOs only when the proposal is well-formed; managers require exactly one valid project or team identifier in their scope; all other proposals return `false`.

- [ ] Add tests for missing/empty permission scopes, malformed project/team proposals, mixed project+team proposals, and manager out-of-scope identifiers.
- [ ] Add a login regression where the mocked user has no `passwordHash` property and assert authentication resolves `null` without throwing.
- [ ] Implement scope validation before role shortcuts except for CEO organization handling; enforce proposal scope/identifier shape and manager membership checks.
- [ ] Run focused auth/domain tests, TypeScript, and the bounded production build.

### Task 3: Truthful report and commit

**Files:**
- Modify: `.superpowers/sdd/2026-09-09-moqarr-farmandehi/task-3-report.md`

- [ ] Record exact changed files, migration safety, seed credential handling, test counts/commands, Prisma validation/generation, TypeScript/build results, and any bounded environment caveat.
- [ ] Verify `git diff` contains no changes to legacy `src` files and commit the fix with `fix: close task 3 auth and rbac review findings`.
- [ ] Return the resulting commit hash.
