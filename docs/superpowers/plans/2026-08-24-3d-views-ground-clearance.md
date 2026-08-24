# 3D Views and Ground Clearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add front, isometric, and top SVG views plus a ground-clearance setting and final installed-height calculations to the exact-grid locker configurator.

**Architecture:** Keep the current React/Vite application and pure domain modules. Add a pure final-dimensions helper, preserve candidate geometry when only installation height changes, and make the existing SVG renderer switch between front, isometric, and plan projections from a `view` prop.

**Tech Stack:** React, Vite, JavaScript ES modules, SVG, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-24-views-and-ground-clearance-design.md`

## Global Constraints

- Keep the existing exact-grid calculation model: rows × columns must equal total locker demand.
- Add `groundClearanceMm` to the layout configuration. It represents the vertical distance between the finished floor and the bottom of the cabinet.
- Do not change fabricated cabinet width, body height, or depth when ground clearance changes.
- Calculate `installedTopMm = groundClearanceMm + cabinetHeightMm`.
- Use pure SVG for all views. No Three.js or external geometry dependency is needed.
- Keep every locker cell inside the same outer frame in all views.
- The controller-ready top-row cell remains visible in front, isometric, and top views.

---

### Task 1: Add installation data and final-dimension calculations

**Files:**
- Create: `src/domain/dimensions.js`
- Modify: `src/domain/locker.js`
- Modify: `src/domain/optimizer.js`
- Modify: `src/app/useConfigurator.js`
- Modify: `src/app/export.js`
- Modify: `tests/domain.test.js`
- Modify: `tests/app.test.js`

**Interfaces:**
- `calculateFinalDimensions(candidate, layout)` returns `{ cabinetWidthMm, cabinetHeightMm, cabinetDepthMm, groundClearanceMm, installedTopMm, footprintAreaM2 }`.
- `updateLayout('groundClearanceMm', value)` persists the value and preserves candidate geometry.
- `generateLayouts(config)` attaches `finalDimensions` to the candidate.

- [ ] **Step 1: Write failing dimension and persistence tests**

Add tests with the existing Node test runner:

```js
test('final dimensions add ground clearance only to installed top', () => {
  const config = createDefaultConfig();
  const candidate = generateLayouts(config).candidates[0];
  const finalDimensions = calculateFinalDimensions(candidate, config.layout);
  assert.equal(finalDimensions.cabinetWidthMm, candidate.dimensions.width);
  assert.equal(finalDimensions.cabinetHeightMm, candidate.dimensions.height);
  assert.equal(finalDimensions.installedTopMm, candidate.dimensions.height + config.layout.groundClearanceMm);
});

test('changing ground clearance does not change fabricated geometry', () => {
  const config = createDefaultConfig();
  const candidate = generateLayouts(config).candidates[0];
  const before = calculateFinalDimensions(candidate, config.layout);
  const after = calculateFinalDimensions(candidate, { ...config.layout, groundClearanceMm: 450 });
  assert.deepEqual(
    [after.cabinetWidthMm, after.cabinetHeightMm, after.cabinetDepthMm],
    [before.cabinetWidthMm, before.cabinetHeightMm, before.cabinetDepthMm],
  );
  assert.equal(after.installedTopMm - before.installedTopMm, 300);
});
```

Also assert that `JSON.parse(exportConfigJson(config)).layout.groundClearanceMm` is present and that an invalid negative value is rejected by `validateConfig`.

- [ ] **Step 2: Run focused tests and confirm they fail**

Run: `npm test`

Expected: FAIL because `groundClearanceMm`, `calculateFinalDimensions`, and candidate `finalDimensions` do not exist yet.

- [ ] **Step 3: Implement the pure final-dimensions helper**

Create `src/domain/dimensions.js`:

```js
export const calculateFinalDimensions = (candidate, layout) => {
  const groundClearanceMm = Number(layout.groundClearanceMm);
  return {
    cabinetWidthMm: candidate.dimensions.width,
    cabinetHeightMm: candidate.dimensions.height,
    cabinetDepthMm: candidate.dimensions.depth,
    groundClearanceMm,
    installedTopMm: candidate.dimensions.height + groundClearanceMm,
    footprintAreaM2: Number(((candidate.dimensions.width * candidate.dimensions.depth) / 1_000_000).toFixed(2)),
  };
};
```

- [ ] **Step 4: Add and validate the layout setting**

Set the default to `groundClearanceMm: 150` in `createDefaultConfig`. Validate it as a non-negative number. Update `updateLayout` so changing `groundClearanceMm` only updates `config.layout` and recomputes `finalDimensions` for existing candidates; changing `rows` or `columns` continues to clear and regenerate candidates.

- [ ] **Step 5: Attach final dimensions to generated candidates and exports**

Import `calculateFinalDimensions` into the optimizer and attach `finalDimensions` after building the candidate. Ensure `exportConfigJson` serializes it through the existing config object without stripping fields.

- [ ] **Step 6: Run tests and commit the domain change**

Run: `npm test`

Expected: all existing tests plus the new dimension tests pass.

```bash
git add src/domain/dimensions.js src/domain/locker.js src/domain/optimizer.js src/app/useConfigurator.js src/app/export.js tests/domain.test.js tests/app.test.js
git commit -m "feat: calculate installed locker dimensions"
```

### Task 2: Implement front, isometric, and top SVG views

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- `LockerLayoutSvg({ candidate, lockerTypes, constraints, view })` supports `front`, `isometric`, and `top`.
- `ViewToggle({ value, onChange })` switches the active view without changing candidate selection.
- `FinalDimensionsCard({ finalDimensions })` renders fabrication size, clearance, installed top, and footprint.

- [ ] **Step 1: Add the view-switching state and controls**

In `GenerateView`, initialize `const [viewMode, setViewMode] = useState('front')`. Render three buttons labelled `Front`, `Isometric`, and `Top`, and pass `viewMode` to `LockerLayoutSvg`.

- [ ] **Step 2: Preserve the existing front view**

Move the current front projection into a `renderFrontView` branch. Keep all locker cells, dimensions, and the controller-ready marker inside the frame.

- [ ] **Step 3: Add the isometric projection**

Use a pure projection helper:

```js
const project = (x, y, depth) => ({ x: x + depth * 0.55, y: y - depth * 0.32 });
```

Draw the front face from the existing grid, a right side face offset by projected depth, a top face, a floor line, a ground-clearance dimension, and an installed-top dimension. Draw the controller-ready outline on the projected top-row cell.

- [ ] **Step 4: Add the top/plan projection**

Draw the cabinet footprint using the candidate depth and `columnWidths`. Render column boundaries, the controller-ready cell footprint, ground clearance as a placement reference, and width/depth dimension labels.

- [ ] **Step 5: Add final-dimensions cards and installation setting UI**

Add a `Ground clearance from floor` numeric field to Project Setup. Add the final-dimensions card to Generate Layout and Manufacturing so it shows:

```text
Fabrication: W × H × D mm
Ground clearance: G mm
Installed top: G + H mm
Footprint: W × D mm / area m²
```

- [ ] **Step 6: Style all view states responsively**

Add styles for the view toggle, projection panel, ground line, dimension labels, isometric faces, top plan, and final-dimensions card. At mobile width, stack the toggle and keep the SVG within the panel without horizontal overflow.

- [ ] **Step 7: Run the production build**

Run: `npm run build`

Expected: Vite builds without JSX or SVG errors.

### Task 3: Verify the complete feature and update documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-24-views-and-ground-clearance-design.md`
- Modify: `docs/superpowers/plans/2026-08-24-3d-views-ground-clearance.md`

- [ ] **Step 1: Run automated checks**

Run: `npm test`, `npm run build`, and `git diff --check`.

Expected: tests and build exit 0, with no whitespace errors.

- [ ] **Step 2: Run browser acceptance checks**

With `npm run dev -- --host 127.0.0.1`, verify that the Generate Layout view switches among Front, Isometric, and Top; changing ground clearance changes installed top elevation but not fabrication W/H/D; the isometric view shows depth and ground line; and the top view shows footprint dimensions.

- [ ] **Step 3: Update README usage**

Document the three view modes, installation-height input, derived final dimensions, and the distinction between fabrication height and installed top elevation.

- [ ] **Step 4: Mark plan complete and commit**

```bash
git add README.md docs/superpowers/specs/2026-08-24-views-and-ground-clearance-design.md docs/superpowers/plans/2026-08-24-3d-views-ground-clearance.md src tests
git commit -m "feat: add locker cabinet inspection views"
```
