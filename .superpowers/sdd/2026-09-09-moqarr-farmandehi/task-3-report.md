# Task 3 implementation report — local authentication and RBAC

## Delivered

- Added bcryptjs password verification and public `SessionUser` mapping without password hashes.
- Added signed HMAC session tokens with expiry and tamper/malformed rejection.
- Added HTTP-only, SameSite=Lax cookies with secure-in-production behavior.
- Added server-side `requireUser`, role/scope permission checks, CEO approval helper, and route middleware.
- Added RTL Persian login page and login/logout API routes.

## Validation

- `npm run test -- tests/auth`: PASS — 11 tests.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS — login/auth routes and middleware compiled.
- Next emitted only the existing multiple-lockfile workspace-root warning.

## Security fix round

- Added `User.passwordHash` with a non-destructive Prisma migration and seeded bcrypt hashes for the three local demo users.
- Hardened non-CEO permissions to fail closed for empty scopes and malformed project/team proposals.
- `npx prisma migrate deploy`: PASS — applied `20260909120000_add_user_password_hash`.
- `npx prisma db seed`: PASS — completed against the existing local database without reset.
- Live local credential check: PASS — `ceo@command-center.local` with `ceo-demo-password` returned a public session user with no password hash.
- Auth regression tests: PASS — 12 tests.
- Final RBAC hardening: proposal and permission scopes are now mutually exclusive and shape-validated before CEO or manager approval; regression suite: PASS — 13 auth tests.
- Final `npm run build`: PASS — login/auth routes and middleware compiled.

## Scope

Only command-center auth files and the required bcryptjs package/lock changes are part of this task. Existing legacy Vite changes remain unstaged and untouched.
