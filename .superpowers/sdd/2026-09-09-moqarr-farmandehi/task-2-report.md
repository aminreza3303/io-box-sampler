# Task 2 Report: Add PostgreSQL Schema, Prisma Client and Standard Project Artifacts

## Status

DONE_WITH_CONCERNS — the command-center domain, schema, generated migration, client configuration, seed program, and focused tests are implemented and ready for the scoped Task 2 commit. The local Prisma development database is running and reports its migration as applied and up to date. Seed completion remains unverified; the Windows seed-command quoting defect found during finalization was corrected, and no further seed/database command was run.

## Delivered Work

- Pinned `prisma` and `@prisma/client` to stable ORM version `7.10.0`; pinned Vitest to `3.2.4`, replacing the Task 1 Rolldown native-binding failure without deleting the lockfile or `node_modules`.
- Added Prisma 7 configuration, a PostgreSQL schema, and a generated `init_command_center` migration.
- Modelled User, Project, Team, TeamMember, Task, TaskPhase, TaskDependency, Goal, Risk, Issue, Decision, Sprint, BacklogItem, AuditEvent, and Memory, with the required enums, relation/index coverage, soft archives, and unique `(taskId, phaseType)` constraint.
- Added an idempotent seed program for exactly three projects (`نیوکاش`, `شاطی`, `تراز`), exactly two teams (`نیوکاش`, `شاطی`), CEO/manager/member users, a product backlog, one active sprint, standard artifacts, and tasks seeded across all four canonical phases.
- Added a Prisma singleton, typed replaceable `DomainActor` boundary, Zod input validation, permission-aware project/task services, transactional task creation, dependency protection, phase updating, and command-center snapshots.
- Added TDD coverage for four phase creation, invalid phase rejection, cross-team member denial, self-dependency denial, and CEO-only project creation/auditing.

## Validation

| Check | Result |
| --- | --- |
| `prisma validate` | PASS |
| Focused finalization validation (`npm --prefix apps/command-center run test -- tests/domain/project-service.test.ts tests/domain/task-service.test.ts`) | PASS; 16 tests |
| Focused finalization validation (`npm exec prisma validate` from `apps/command-center`) | PASS |
| `prisma generate` | PASS |
| Local `prisma dev` (`moqarr-farmandehi`) | RUNNING |
| Initial `prisma migrate dev --name init_command_center` | PASS; migration created and applied |
| `prisma migrate status` against direct local TCP database | PASS; schema up to date |
| `tsc --noEmit` | PASS |
| Command-center `next build` | PASS |

## Concern: Local Seed Transport

Earlier `prisma db seed` attempts reached the named local server but `@prisma/adapter-pg`/`pg` received `Connection terminated unexpectedly` from its returned direct TCP endpoint (`localhost:51214`). During finalization, an absolute quoted Windows seed path also failed before connection because the quotes were passed literally to `tsx`; the config now uses the package-relative `tsx prisma/seed.ts` command. The seed is idempotent, no destructive recovery was attempted, and migration status remains up to date. Per the finalization instruction, the corrected seed command was not rerun.

## Self-Review

- Kept the legacy Vite files and all listed user changes unstaged and unmodified.
- Removed generated `tsconfig.tsbuildinfo`; `.env.local` remains ignored and untracked.
- Checked scoped diffs for whitespace errors and unresolved placeholders; none found.
- The legacy app’s regression run was not repeated because the task was finalizing against a live local database; command-center build and focused tests passed.

## Commit

Pending: `feat: add command center project domain`
