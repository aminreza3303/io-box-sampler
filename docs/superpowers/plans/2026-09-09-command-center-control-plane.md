# مقر فرماندهی Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the command center Persian-first, web-canvas based, AI-aware, and explicit about operational, financial, and admin control flows.

**Architecture:** Keep product vocabulary and process definitions in typed local modules. Use one reusable workspace component for operations, finance, and admin; persist AI conversations through `AgentRun`/`AgentMessage`; keep financial actions read-only or proposal-based. Remove the Obsidian handoff from the web UI while retaining local documentation artifacts.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Prisma/PostgreSQL, Vitest, bundled Vazirmatn font.

**Spec:** `docs/superpowers/specs/2026-09-09-command-center-control-plane-design.md`

## Global Constraints

- فارسی و RTL زبان اصلی رابط است؛ Hermes، OMP، API، QR و نام استانداردهای فنی استثناهای مجازند.
- AI must fail honestly when Hermes/OMP is unavailable.
- No real-money mutation is introduced by this feature.
- CEO approval remains required for proposals and sensitive policy changes.
- Do not expose password hashes, secrets, or unscoped financial records.

---

### Task 1: Typography, copy system, and web navigation

**Files:** `package.json`, `package-lock.json`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/navigation/app-nav.tsx`.

- [ ] Bundle Vazirmatn, apply it to all controls, correct metadata and Persian copy, and remove the Obsidian CTA from the web experience.
- [ ] Replace the crowded flat nav with grouped links to dashboard, domains, AI, portfolio, operations, finance, CEO, admin, and audit.
- [ ] Test login, root redirect, and active navigation.

### Task 2: Web canvas domain workspace

**Files:** `lib/domain-map.ts`, `components/domain-map/domain-map-page.tsx`, `app/domains/page.tsx`, `tests/domain/domain-map.test.ts`.

- [ ] Add search, zoom, selected-node highlighting, relation explanations, and web-only local knowledge copy.
- [ ] Keep the 28 business domains and show their cross-cutting controls without requiring Obsidian.
- [ ] Test domain counts, relation integrity, and build output.

### Task 3: Persistent AI Workspace

**Files:** `prisma/schema.prisma`, forward migration, `server/agents/*`, `app/api/ai/chat/route.ts`, `app/api/ai/runs/route.ts`, `components/ai/ai-workspace-page.tsx`, `app/ai/page.tsx`, tests.

- [ ] Add `AgentRun` and `AgentMessage` with actor scope and status.
- [ ] Create authenticated chat/history routes that use the Hermes mother adapter and persist blocked/failed/success outcomes.
- [ ] Add the Persian chat UI with context chips and proposal-safe copy.

### Task 4: Operations, finance, and admin workspaces

**Files:** `lib/workspaces.ts`, reusable workspace components, `app/operations/page.tsx`, `app/finance/page.tsx`, `app/admin/page.tsx`, tests.

- [ ] Define typed process catalogs for operational and financial flows, with step owners, controls, and exit criteria.
- [ ] Render selected process steps, control warnings, read-only financial status, and admin policy/metrics cards.
- [ ] Verify role-safe access and honest empty/runtime states.

### Task 5: Verification and delivery

- [ ] Run the full Vitest suite and production build.
- [ ] Test the LAN URLs for `/domains`, `/ai`, `/operations`, `/finance`, and `/admin`.
- [ ] Commit only source/docs/migrations; keep `.env.local`, build output, and temporary files ignored.
