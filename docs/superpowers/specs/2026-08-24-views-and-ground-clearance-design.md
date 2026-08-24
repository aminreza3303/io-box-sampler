# 3D Views and Ground Clearance Design

## Goal

Add engineering views for front elevation, isometric three-quarter perspective, and top/plan view, plus a configurable installation height from the floor and a final-dimensions summary that distinguishes fabricated cabinet size from installed height.

## Scope

- Keep the existing exact-grid calculation model: rows × columns must equal total locker demand.
- Add `groundClearanceMm` to the layout configuration. It represents the vertical distance between the finished floor and the bottom of the cabinet.
- Do not change fabricated cabinet width, body height, or depth when ground clearance changes.
- Calculate `installedTopMm = groundClearanceMm + cabinetHeightMm`.
- Use pure SVG for all views. No Three.js or external geometry dependency is needed.
- Keep every locker cell inside the same outer frame in all views.
- The controller-ready top-row cell remains visible in front, isometric, and top views.

## Data model

```ts
interface LayoutSpec {
  columns: number;
  rows: number;
  groundClearanceMm: number;
}

interface FinalDimensions {
  cabinetWidthMm: number;
  cabinetHeightMm: number;
  cabinetDepthMm: number;
  groundClearanceMm: number;
  installedTopMm: number;
  footprintAreaM2: number;
}
```

`LayoutCandidate.dimensions` remains the fabricated cabinet envelope. A derived `finalDimensions` object is attached to the candidate or computed by a pure helper so export, manufacturing, and the dashboard all display the same values.

## View behavior

The Generate Layout view gets a three-button view switcher:

1. **Front** — existing elevation, row/column cells, door markers, dimensions, and controller-ready cell.
2. **Isometric** — a three-quarter SVG projection with cabinet front, right side depth, top plane, ground line, clearance legs/plinth, and dimension labels for width, body height, depth, ground clearance, and installed top height.
3. **Top** — plan view with the cabinet footprint, column widths, depth, controller-ready cell projection, and footprint dimension.

The isometric projection uses a stable oblique transform: horizontal width maps to `x`, depth maps to `(x + 0.55d, y - 0.32d)`, and height maps vertically. It is illustrative engineering geometry, not a fabrication drawing. The top view uses real derived column widths and cabinet depth, so it remains useful for placement and footprint review.

## Settings and output

The Project Setup view exposes `Installation height from floor` next to the exact rows and columns. The Constraints/Manufacturing view repeats the value as a derived installation parameter. A final-dimensions card always shows:

- Cabinet fabrication: `W × H × D mm`
- Ground clearance: `G mm`
- Installed top elevation: `G + H mm`
- Footprint: `W × D mm` and square metres

Changing only ground clearance updates the installed top elevation and view ground line; it does not regenerate locker geometry or change material quantities.

## State and export

`updateLayout('groundClearanceMm', value)` persists the setting and clears stale generated output only when the geometry-affecting grid changes. Ground clearance changes preserve the candidate geometry but refresh `finalDimensions`. JSON export includes the setting and final dimensions; CSV BOM remains fabrication-only and does not count ground clearance as material.

## Acceptance criteria

- Entering a positive ground clearance changes installed top elevation by the same amount.
- Cabinet W/H/D remains unchanged when only ground clearance changes.
- Front, isometric, and top buttons switch the visible SVG without losing the selected candidate.
- All locker cells remain inside the outer frame in all three views.
- The isometric view visibly includes depth and ground clearance.
- The top view visibly includes footprint dimensions.
- JSON round-trip preserves `groundClearanceMm` and calculated final dimensions.
- Existing exact-grid validation, material calculations, `npm test`, and `npm run build` remain passing.
