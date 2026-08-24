# Smart Locker Configurator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flight-booking demo with a local React/Vite engineering dashboard that generates, ranks, visualizes, and exports manufacturable smart-locker cabinet configurations.

**Architecture:** Keep React/Vite as the runtime, with framework-independent domain modules for validation, deterministic layout generation, scoring, and manufacturing derivation. Compose those modules in a reducer-backed application state and a responsive dashboard whose SVG visualization is pure from selected layout props.

**Tech Stack:** React, React DOM, Vite, JavaScript ES modules, SVG, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-24-smart-locker-configurator-design.md`

## Global Constraints

- This is a client-only local application with no backend, authentication, or remote persistence.
- Keep the repository's existing React 18+ and Vite stack; do not migrate to Nuxt for this prototype.
- Use SVG for the 2D cabinet visualization; Three.js is deferred.
- All dimensions are millimetres, volumes are litres, masses are kilograms, and scores are 0–100.
- Replace the current flight demo surface rather than maintaining two unrelated product flows.
- Configuration changes must be editable, validated, persisted to `localStorage`, and exportable as JSON.

---

### Task 1: Build the domain model, optimizer, and manufacturing derivation

**Files:**
- Create: `src/domain/locker.js`
- Create: `src/domain/optimizer.js`
- Create: `src/domain/manufacturing.js`
- Create: `src/app/defaultConfig.js`
- Create: `tests/domain.test.js`
- Modify: `package.json`

**Interfaces:**
- `createDefaultConfig()` returns the complete sample `CabinetConfig` with small/medium/large types and 15/10/5 demand.
- `validateConfig(config)` returns `{ valid: boolean, errors: string[] }`.
- `generateLayouts(config)` returns `{ candidates: LayoutCandidate[], errors: string[] }`.
- `deriveManufacturing(config, candidate)` returns `ManufacturingSpec`.

- [x] **Step 1: Add failing domain tests**

Create `tests/domain.test.js` using `node:test` and `node:assert/strict`. Cover the observable contract:

```js
test('default config contains exact sample demand', () => {
  const config = createDefaultConfig();
  assert.deepEqual(config.demand, { small: 15, medium: 10, large: 5 });
});

test('optimizer preserves every requested locker', () => {
  const { candidates } = generateLayouts(createDefaultConfig());
  assert.ok(candidates.length > 0);
  const counts = countByType(candidates[0].lockers);
  assert.deepEqual(counts, { small: 15, medium: 10, large: 5 });
});

test('optimizer rejects a depth-incompatible configuration', () => {
  const config = createDefaultConfig();
  config.constraints.maxDepthMm = 100;
  const result = generateLayouts(config);
  assert.deepEqual(result.candidates, []);
  assert.match(result.errors[0], /depth/i);
});

test('ranking is deterministic and scores stay in range', () => {
  const first = generateLayouts(createDefaultConfig()).candidates;
  const second = generateLayouts(createDefaultConfig()).candidates;
  assert.deepEqual(first, second);
  assert.ok(first.every((candidate) => candidate.score >= 0 && candidate.score <= 100));
});

test('manufacturing quantities reflect the selected candidate', () => {
  const config = createDefaultConfig();
  const candidate = generateLayouts(config).candidates[0];
  const spec = deriveManufacturing(config, candidate);
  assert.equal(spec.hardware.find((item) => item.item === 'Electronic lock').quantity, candidate.lockers.length);
  assert.ok(spec.materials.some((item) => item.name === 'Locker door sheet'));
});
```

Add a `countByType` helper in the test file that reduces `lockers` by `typeId`, and import the three domain modules plus `createDefaultConfig`.

- [x] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test -- --test-name-pattern="default config|optimizer|ranking|manufacturing"`

Expected: FAIL because the domain modules and test script do not yet exist.

- [x] **Step 3: Implement the canonical model and validation**

In `src/domain/locker.js`, define the default locker types, `createDefaultConfig`, `cloneConfig`, `countLockers`, and `validateConfig`. Compute `capacityLitres` from dimensions when a type is created, but retain an editable value in the returned object. Reject missing types referenced by demand, non-positive dimensions or thicknesses, negative demand, incompatible maximum depth, and all-zero demand.

- [x] **Step 4: Implement deterministic packing and scoring**

In `src/domain/optimizer.js`, flatten demand into lockers sorted by descending height then type id. Enumerate column counts from 1 to `Math.min(totalLockers, Math.max(1, Math.floor(maxWidthMm / preferredModuleWidthMm) + 2))`. Assign each locker to the currently shortest stack, with column index as the tie breaker. Compute dimensions including frame, divider, door gap, and controller bay. Reject over-limit candidates and canonical-signature duplicates.

Implement the exact score weights from the spec and clamp every metric and score to `[0, 100]`. Return candidates sorted by score descending, then width ascending, then column count ascending, retaining at most six.

- [x] **Step 5: Implement manufacturing derivation**

In `src/domain/manufacturing.js`, derive materials for frame, door sheets, divider/back panels, reinforcement, cable channel, and controller bay. Derive per-locker hardware for electronic locks, door sensors, status indicators, hinges, seals, and fastener sets; derive shared power supply, network module, lock controller, sensor controller, and ventilation quantities. Include assembly steps and a controller placement description.

- [x] **Step 6: Add the test command and run the domain suite**

Update `package.json` with:

```json
"test": "node --test tests"
```

Run: `npm test`

Expected: PASS for all domain tests.

- [x] **Step 7: Commit the domain layer**

```bash
git add src/domain src/app/defaultConfig.js tests/domain.test.js package.json package-lock.json
git commit -m "feat: add locker layout optimization domain"
```

### Task 2: Add application state, persistence, and export helpers

**Files:**
- Create: `src/app/storage.js`
- Create: `src/app/export.js`
- Create: `src/app/useConfigurator.js`
- Modify: `src/app/defaultConfig.js`
- Create: `tests/app.test.js`

**Interfaces:**
- `loadConfig()` returns a validated config or the default config.
- `saveConfig(config)` serializes the config to `localStorage`.
- `exportConfigJson(config)` returns a downloadable JSON string.
- `exportManufacturingCsv(spec)` returns a CSV string with a header row.
- `useConfigurator()` exposes `{ state, actions }`, where actions include `updateProject`, `updateDemand`, `updateLockerType`, `updateConstraints`, `generate`, `selectCandidate`, `importConfig`, and `reset`.

- [x] **Step 1: Test JSON/CSV round trips and reducer actions**

Use a small in-memory `localStorage` shim in `tests/app.test.js`. Assert that JSON export parses back to the same schema version, CSV starts with `Item,Quantity`, `updateDemand` changes only the requested type, and `generate` creates an active candidate.

- [x] **Step 2: Implement persistence and export**

Use storage key `smart-locker-configurator:v1`. Guard access to `window.localStorage` so Node tests and restricted browser contexts fall back to memory. Export JSON with two-space indentation and CSV with quoted fields, CRLF row endings, and a UTF-8 BOM-safe browser download helper.

- [x] **Step 3: Implement the configurator state hook**

Use `useReducer` with a state shape `{ config, errors, notice, activeView, isGenerating }`. Every edit updates `updatedAt`, clears stale generation errors, and persists. `generate` calls `validateConfig` then `generateLayouts`; on success it stores candidates, active candidate id, and derived manufacturing data. On failure it preserves the last valid candidates and exposes errors.

- [x] **Step 4: Run application tests**

Run: `npm test`

Expected: PASS for domain and application tests.

### Task 3: Replace the flight UI with the engineering dashboard

**Files:**
- Replace: `src/main.jsx`
- Replace: `src/styles.css`
- Modify: `index.html`

**Interfaces:**
- `App` composes the shell and active view from `useConfigurator`.
- `LockerLayoutSvg({ candidate, lockerTypes, constraints, compact })` is a pure SVG renderer.
- `MetricCard`, `LockerTypeEditor`, `ConstraintEditor`, `CandidateCard`, `ManufacturingView`, and `ExportView` receive data and callbacks via props; none contains optimizer logic.

- [x] **Step 1: Build the shell and project setup view**

Implement a responsive RTL-compatible engineering dashboard with navigation labels, active view state, project name input, quantity cards for small/medium/large, maximum dimension inputs, Generate Layout button, status banners, and top-level metrics.

- [x] **Step 2: Add locker type and constraint editors**

Render controlled inputs for dimensions, capacity, weight capacity, usage, material, thickness, and hardware labels. Render controlled constraint fields for maximum width/height/depth, divider, frame, door gap, controller width, and preferred module width. Show per-field validation errors and call the hook actions on change.

- [x] **Step 3: Implement the SVG layout renderer**

Use a stable `viewBox` based on candidate dimensions. Render frame, controller bay, module columns, locker rectangles colored by type, divider lines, door/lock circles, labels, dimension arrows, accessible titles, and a legend. Compact mode omits detailed annotations for alternative cards.

- [x] **Step 4: Add generation and alternative comparison views**

Show the selected candidate's SVG, score, dimensions, internal volume, utilization, columns, rows, score breakdown bars, warnings, and a list of alternatives. Clicking an alternative calls `selectCandidate` and updates the main preview and manufacturing output.

- [x] **Step 5: Add manufacturing and export views**

Render the derived materials table, hardware table, assembly strategy, controller architecture, and ventilation/cable notes. Add JSON and CSV download buttons, a copy-to-clipboard fallback, and a print-friendly summary.

- [x] **Step 6: Replace the document metadata and styles**

Update `index.html` title and meta colors for the locker configurator. Replace flight-specific CSS with a dark navy/teal engineering palette, dense cards, SVG panel styling, responsive breakpoints at 900px and 620px, focus states, reduced-motion support, and readable contrast.

- [x] **Step 7: Run the production build**

Run: `npm run build`

Expected: Vite produces `dist/` without module or JSX errors.

### Task 4: Verify the complete configurator and document usage

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-24-smart-locker-configurator.md`

- [x] **Step 1: Run all automated checks**

Run: `npm test` and `npm run build`.

Expected: both commands exit with code 0.

- [x] **Step 2: Run the app and perform manual acceptance checks**

Run: `npm run dev -- --host 127.0.0.1` and inspect the app at desktop and narrow viewport sizes. Confirm that editing a locker dimension changes the SVG geometry, lowering maximum width removes candidates, selecting a different candidate updates manufacturing quantities, importing a previously exported JSON restores the configuration, and the navigation reaches all seven views.

- [x] **Step 3: Update README usage documentation**

Document the configurator workflow, default sample, optimizer score, local persistence, JSON/CSV export, test command, and build command. Remove flight-booking-specific instructions.

- [x] **Step 4: Mark plan tasks complete and commit the application**

```bash
git add src tests package.json package-lock.json index.html README.md docs/superpowers/plans/2026-08-24-smart-locker-configurator.md
git commit -m "feat: build smart locker configurator dashboard"
```
