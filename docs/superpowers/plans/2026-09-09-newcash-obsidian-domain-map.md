# نقشه دامنه نیوکاش و Obsidian محلی Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local, Persian Newcash domain map that is interactive inside the command center and openable as an Obsidian Canvas vault artifact.

**Architecture:** `domain-map.ts` is the typed source of truth for 28 domains, roadmap steps, and relationships. The `/domains` client page renders grouped cards and a selected-domain dependency explanation; committed Obsidian files mirror the same product map and remain offline-first. The existing shared navigation links to the new page.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Tailwind CSS, Obsidian Canvas JSON, Markdown, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-newcash-obsidian-domain-map-design.md`

## Global Constraints

- Keep all knowledge artifacts local; do not add a cloud or external sync dependency.
- Preserve the current Persian RTL command-center UI and existing auth/middleware.
- Treat the supplied product facts as confirmed; mark unresolved future decisions as open questions.
- Do not implement real financial execution in this knowledge-map task.
- Keep generated build/cache folders out of git.

---

### Task 1: Add the typed domain-map source and Obsidian vault artifacts

**Files:**
- Create: `apps/command-center/lib/domain-map.ts`
- Create: `docs/obsidian/newcash-vault/newcash-map.canvas`
- Create: `docs/obsidian/newcash-vault/نقشه-راه-بازسازی-نیوکاش.md`
- Create: `docs/obsidian/newcash-vault/دامنه‌ها/00-فهرست-دامنه‌ها.md`
- Create: `docs/obsidian/newcash-vault/README.md`

**Interfaces:**
- Produce `domainGroups`, `roadmapSteps`, `domainRelationships`, `getDomainById`, and `getDomainConnections` for the page.
- Canvas IDs must match the IDs in `domain-map.ts`; each relationship must become a Canvas edge.

- [ ] **Step 1: Define the domain type and all 28 Persian domain records** with id, title, group, priority, status, summary, rules, dependencies, and dependents.
- [ ] **Step 2: Define the roadmap and relationship explanation records** including W-1, S-1, L-1, P-1 and P-2.
- [ ] **Step 3: Write the valid Obsidian Canvas JSON** with Persian nodes, positions, colors, and edges for the same IDs.
- [ ] **Step 4: Write the roadmap, inventory, and vault README** with the local-open instructions and the five-step product sequence.
- [ ] **Step 5: Validate the Canvas as JSON** with `JSON.parse` and verify every edge endpoint exists in the node set.

### Task 2: Build the interactive domain-map page

**Files:**
- Create: `apps/command-center/components/domain-map/domain-map-page.tsx`
- Create: `apps/command-center/app/domains/page.tsx`

**Interfaces:**
- Consume the typed exports from `lib/domain-map.ts`.
- Render selected-domain state, connection lists, open-question callouts, and an `obsidian://` link plus repository artifact path.

- [ ] **Step 1: Render the page header and legend** for infrastructure, P0, P1, P2, and platform groups.
- [ ] **Step 2: Render clickable grouped cards** and set the first infrastructure domain as the initial selection.
- [ ] **Step 3: Render the selected domain’s summary, rules, dependencies, dependents, and relationship explanations.**
- [ ] **Step 4: Render the five roadmap steps and the local Obsidian handoff card.**
- [ ] **Step 5: Keep the page keyboard-accessible** with buttons, labels, and `aria-pressed` on selected domains.

### Task 3: Connect navigation and verify the user flow

**Files:**
- Modify: `apps/command-center/components/navigation/app-nav.tsx`
- Modify: `apps/command-center/README.md`
- Test: `apps/command-center/tests/domain/domain-map.test.ts`

**Interfaces:**
- Add `/domains` to the shared navigation and document it in the route list.
- Test the source-of-truth counts, relationship integrity, and roadmap ordering.

- [ ] **Step 1: Add the “نقشه دامنه” navigation item** with active-route styling.
- [ ] **Step 2: Document the Obsidian vault path and `/domains` route** in the command-center README.
- [ ] **Step 3: Add Vitest coverage** for 28 domains, required IDs, valid relationships, and five roadmap steps.
- [ ] **Step 4: Run `npm test`** and expect all tests to pass.
- [ ] **Step 5: Run `npm run build`** and expect the `/domains` route to be listed.
- [ ] **Step 6: Commit and push** the feature after verifying git status contains no generated artifacts.
