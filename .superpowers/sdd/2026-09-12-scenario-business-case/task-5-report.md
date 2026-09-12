# Task 5 implementation report

Status: DONE_WITH_CONCERNS — implementation and automated verification are complete; authenticated browser smoke is pending only until the user signs in manually.

## Changes

- Added the scenario catalog section for all 13 documented ideas, grouped by wallet/travel track and travel lane, with source-hypothesis labels and gate warnings. Selecting a card only calls the parent selection handler; it does not call an API.
- Added a controlled assumptions form for technical, financial, KPI/gate, milestone, guardrail/risk, and priority inputs. It exposes evidence/provenance, blank monetary fields, manual FX metadata, all four phase shares, independent conservative/base/optimistic cases, and an explicit “copy base case” action without hidden multipliers.
- Refactored the scenario page into a state coordinator, preserving project/team selection, analysis/history restoration, legacy rendering, and Hermes session flow; selecting a catalog card pre-fills the draft and analysis is submitted only after the explicit analyze action.
- Kept the user-owned untracked plan copy `docs/superpowers/plans/2026-09-12-scenario-business-case.md` untouched and unstaged.

## Verification

- `npx vitest run tests/domain/scenario-catalog.test.ts tests/domain/scenario-planner.test.ts tests/domain/scenario-business-case.test.ts tests/auth/scenario-api-contract.test.ts tests/auth/scenario-decision-api.test.ts` — 5 files, 68 tests passed.
- `$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/newcash_test'; npm run build` — passed, including Next.js type checking and static page generation. The URL is a process-local placeholder; no live DB was used. Next.js emitted its existing workspace-root warning because both repository and app lockfiles are present.
- `git diff --check` — passed; Git emitted only line-ending normalization warnings for the modified page.
- Local development database is now ready using PGlite 0.5.8 with its PostgreSQL-wire socket adapter on `127.0.0.1:5432`; all Prisma migrations and the demo seed completed successfully. This is a local testing adapter, not a replacement for the PostgreSQL 16 service in Docker Compose/production.
- The development app is live on port 3001 and bound to `192.168.1.61`: `http://localhost:3001` and `http://192.168.1.61:3001`. Login responds with HTTP 200; protected scenario routes redirect to login as expected. No authentication was automated or bypassed. After the user signs in manually, verify the 13 interactive cards, authorized rosters, RTL/responsive layout, and console.

## Review context

- Task base: `cd16f79c23581229c896b6829fe66c2ca4de2855`.
- No new automated React component test was added; the package has no React Testing Library and the plan assigns behavioral interaction checks to the browser smoke.

## Fix round 1 — restore IDs restricted to current rosters

### Changes

- Added `apps/command-center/lib/scenario-restore.ts` with a pure helper that preserves only project and team IDs present in the supplied current rosters.
- Updated `apps/command-center/components/scenarios/scenario-planner-page.tsx` so both snapshot-based and legacy history restoration pass through the helper before setting the editable draft. Other draft fields and server-side authorization are unchanged.
- Added `apps/command-center/tests/domain/scenario-restore.test.ts`, covering retention of authorized IDs and removal of stale/unrecognized IDs for both rosters.

### Commands and exact results

- From `apps/command-center`: `npm test -- --run tests/domain/scenario-restore.test.ts` — **1 file passed, 1 test passed**.
- From `apps/command-center`: `npm test -- --run tests/domain/scenario-restore.test.ts tests/domain/scenario-catalog.test.ts tests/domain/scenario-planner.test.ts tests/domain/scenario-business-case.test.ts tests/auth/scenario-api-contract.test.ts tests/auth/scenario-decision-api.test.ts` — **6 files passed, 69 tests passed**.
- From repository root: `git diff --check` — **passed**; Git printed only its existing LF-to-CRLF normalization warning for the edited page.
- No database setup or build was attempted.

### Self-review

- Restored project/team IDs are filtered against `projects` and `teams` currently held by the page before the restored draft reaches form state, preventing stale or unrecognized values from appearing selected or entering a later submission.
- Snapshot and legacy restore paths both use the same filter; non-roster draft content is preserved.
- No server-side authorization code was changed. No unrelated files were modified; the pre-existing untracked plan copy remains untouched and unstaged.
- Concern: none for this fix. The previously noted authenticated browser smoke remains pending as documented above.
