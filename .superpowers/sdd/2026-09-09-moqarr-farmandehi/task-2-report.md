# Task 2 Report: Add PostgreSQL Schema, Prisma Client and Standard Project Artifacts

## Status

COMPLETE — the focused review-fix round is implemented and verified. Changes remain isolated to `apps/command-center` plus this report; the legacy Vite files and unrelated artifacts were not touched.

## Delivered Work

- Pinned `prisma` and `@prisma/client` to stable ORM version `7.10.0`; pinned Vitest to `3.2.4`, replacing the Task 1 Rolldown native-binding failure without deleting the lockfile or `node_modules`.
- Added Prisma 7 configuration, a PostgreSQL schema, and a generated `init_command_center` migration.
- Modelled User, Project, Team, TeamMember, Task, TaskPhase, TaskDependency, Goal, Risk, Issue, Decision, Sprint, BacklogItem, AuditEvent, and Memory, with the required enums, relation/index coverage, soft archives, and unique `(taskId, phaseType)` constraint.
- Added an idempotent seed program for exactly three projects (`نیوکاش`, `شاطی`, `تراز`), exactly two teams (`نیوکاش`, `شاطی`), CEO/manager/member users, a product backlog, one active sprint, standard artifacts, and tasks seeded across all four canonical phases.
- Added a Prisma singleton, typed replaceable `DomainActor` boundary, Zod input validation, permission-aware project/task services, transactional task creation, dependency protection, phase updating, and command-center snapshots.
- Moved `dotenv` from `devDependencies` to runtime `dependencies`; the existing runtime imports in `lib/db.ts` and `prisma/seed.ts` are now packaged correctly.
- Enforced the intended ACTIVE-sprint contract in `createTask`: a supplied `sprintId` must resolve to an unarchived sprint with `status: "ACTIVE"` in the same project/team scope.
- Added explicit MANAGER denial coverage to the CEO-only project service test and ACTIVE-sprint coverage to the task service test.
- Diagnosed the seed failure: raw `pg` and a single PrismaPg query succeeded, but the seed's concurrent four-way `TeamMember.upsert` caused the local Prisma dev server to close a connection (`P1017`, `ConnectionClosed`). Converted those idempotent membership upserts to sequential operations.

## Validation

| Check | Result |
| --- | --- |
| `npm run test -- tests/domain/project-service.test.ts tests/domain/task-service.test.ts` | PASS; 18 tests |
| `npx tsc --noEmit` | PASS |
| `npm exec prisma validate` | PASS |
| `npm exec prisma generate` | PASS; Prisma Client 7.10.0 generated |
| `npm exec prisma migrate status` | PASS; schema up to date |
| `npm exec prisma db seed` (bounded to 30 seconds, existing DB, no reset) | PASS; `Command center seed completed.` |

The seed command was run from `apps/command-center`, where `prisma.config.ts` resolves `prisma/seed.ts`. The database was not reset or dropped. The seed remains idempotent and completed after the sequential-upsert mitigation.

## Self-Review

- Kept the legacy Vite files and all listed user changes unstaged and unmodified.
- `.env.local` remains ignored and untracked; generated build artifacts and unrelated user files remain untouched.
- Checked scoped diffs for whitespace errors and unresolved placeholders; none found.
- The legacy app's regression run was not repeated because this fix round was scoped to the isolated command-center app.

## Commit

Pending: `fix: close task 2 review findings`
