# Scenario Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Persian-first scenario planning workspace that combines the existing business-domain graph with transparent time, cost, and change-volume estimates and a persistent Hermes conversation.

**Architecture:** Keep the domain catalog and calculation rules in a pure server/client-safe module. Persist each scenario analysis in Prisma, expose a guarded API, and let the client page render the deterministic estimate before sending its structured context to the existing Hermes chat endpoint. Use the existing AgentRun/AgentMessage persistence and CEO approval boundary; do not execute financial actions.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma/PostgreSQL local runtime, Tailwind CSS, Vitest, existing Hermes/OMP adapters.

**Spec:** `docs/superpowers/specs/2026-09-10-scenario-planning-design.md`

## Global Constraints

- Persian-first visible copy and Vazirmatn typography.
- Estimates must expose assumptions and must not invent a currency amount when no person-day rate is supplied.
- Hermes can analyze and propose only; no financial or operational mutation is allowed.
- All authenticated users may analyze their own scenarios; CEO may view the complete history.
- New API inputs must validate domain IDs and enforce bounded string/array sizes.
- Existing domain-map, auth, audit, and AgentRun contracts remain backward compatible.

---

### Task 1: Domain impact and estimate engine

**Files:**
- Create: `apps/command-center/lib/scenario-planner.ts`
- Test: `apps/command-center/tests/domain/scenario-planner.test.ts`

**Interfaces:**
- Produces `ScenarioInput`, `ScenarioEstimate`, `calculateScenarioEstimate(input: ScenarioInput): ScenarioEstimate` and `scenarioTemplates`.
- Consumes `domains`, `domainRelationships`, and `getProcessById` from the existing domain/workspace catalogs.

- [ ] **Step 1: Write failing tests** for dependency closure, transfer scenario output, missing rate, and capacity sensitivity.
- [ ] **Step 2: Run `npm test -- --run tests/domain/scenario-planner.test.ts` and confirm the new module is missing.**
- [ ] **Step 3: Implement pure calculation with explicit per-domain complexity, relationship/process/integration/migration counts, four phases, assumptions, and confidence.
- [ ] **Step 4: Run the focused test and then the full command-center test suite.**
- [ ] **Step 5: Commit the calculator and tests with `feat: add scenario impact calculator`.**

### Task 2: Persist scenario analyses and expose guarded API

**Files:**
- Modify: `apps/command-center/prisma/schema.prisma`
- Create: `apps/command-center/prisma/migrations/20260910100000_add_scenario_analyses/migration.sql`
- Create: `apps/command-center/app/api/scenarios/analyze/route.ts`
- Create: `apps/command-center/app/api/scenarios/route.ts`
- Test: `apps/command-center/tests/auth/scenario-api-contract.test.ts`

**Interfaces:**
- `POST /api/scenarios/analyze` consumes `{title, description, domainIds, projectIds?, teamIds?, assumptions?}` and returns `{analysis, estimate}`.
- `GET /api/scenarios` returns the caller’s analyses, or all analyses for CEO.
- Prisma model `ScenarioAnalysis` stores title, description, selected IDs, assumptions JSON, estimate JSON, creator, timestamps.

- [ ] **Step 1: Add tests for input rejection, ownership scope, and the no-rate response shape.**
- [ ] **Step 2: Run the focused tests and confirm the endpoint/model contract is absent.**
- [ ] **Step 3: Add the Prisma model, apply the local migration without resetting data, and generate Prisma Client.**
- [ ] **Step 4: Implement Zod/manual bounded validation, authenticated ownership, deterministic calculator call, and audit event `SCENARIO_ANALYZED`.**
- [ ] **Step 5: Run Prisma status, focused tests, and full tests.**
- [ ] **Step 6: Commit with `feat: persist scenario analyses`.**

### Task 3: Build the scenario planner page

**Files:**
- Create: `apps/command-center/app/scenarios/page.tsx`
- Create: `apps/command-center/components/scenarios/scenario-planner-page.tsx`
- Modify: `apps/command-center/components/navigation/app-nav.tsx`

**Interfaces:**
- Page calls `POST /api/scenarios/analyze`, renders `ScenarioEstimate`, and sends the serialized estimate as context to `/api/ai/chat`.
- Uses existing `domains`, `domainGroups`, and `scenarioTemplates` to render domain selection and template shortcuts.

- [ ] **Step 1: Add the route and navigation link with Persian metadata.**
- [ ] **Step 2: Implement the form, templates, domain search/selection, capacity/rate controls, loading/error states, and estimate cards.**
- [ ] **Step 3: Implement the impact canvas and four-phase breakdown using the API response, including a clear “نیازمند نرخ” state.**
- [ ] **Step 4: Add Hermes chat actions that reuse the structured estimate and show blocked/failed results honestly.**
- [ ] **Step 5: Verify the page through the running LAN server and check mobile layout at a narrow viewport.**
- [ ] **Step 6: Commit with `feat: add scenario planning workspace`.**

### Task 4: Polish contracts, documentation, and verification

**Files:**
- Modify: `apps/command-center/app/api/ai/chat/route.ts`
- Modify: `apps/command-center/README.md`
- Modify: `apps/command-center/tests/smoke.test.ts`

**Interfaces:**
- AI chat accepts optional `scenarioContext` and includes it in the Hermes prompt without allowing the client to bypass existing safety rules.
- README documents `/scenarios`, formula assumptions, and configurable person-day rate.

- [ ] **Step 1: Extend AI chat parsing and prompt context with a bounded scenario estimate.**
- [ ] **Step 2: Add route presence to smoke coverage and update local-run documentation.**
- [ ] **Step 3: Run `npm test`, root tests, `npx prisma migrate status`, and a clean `npm run build` after stopping dev server.**
- [ ] **Step 4: Restart `npm run dev` on `0.0.0.0:3000` and verify all scenario routes return 200/401 as expected.**
- [ ] **Step 5: Commit and push if GitHub credentials are available; otherwise report the local commit and exact push blocker.**
