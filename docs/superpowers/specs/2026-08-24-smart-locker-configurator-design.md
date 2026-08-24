# Smart Locker Configurator Design

## Goal

Replace the existing flight-booking demo with a local engineering dashboard that converts locker demand, configurable locker definitions, and cabinet constraints into ranked, visual, manufacturable smart-locker layouts.

## Scope and constraints

- This is a client-only local application. There is no backend, authentication, or remote persistence in this phase.
- Keep the repository's existing React 18+ and Vite stack; do not migrate to Nuxt for this prototype.
- Use SVG for the 2D cabinet visualization. Three.js is explicitly deferred.
- All dimensions are in millimetres, volumes in litres, masses in kilograms, and scores are normalized to 0–100.
- Replace the current flight demo surface rather than maintaining two unrelated product flows.
- Configuration changes must be editable, validated, persisted to `localStorage`, and exportable as JSON.

## Product flow

The application opens on a dashboard with a default sample project containing 15 small, 10 medium, and 5 large lockers. The left navigation switches between these views:

1. **Project Setup** — project name, target locker quantities, and the active constraint set.
2. **Locker Types** — edit dimensions, capacity, weight limit, usage label, material, and hardware defaults for each locker type.
3. **Constraints** — maximum cabinet width, height, depth, preferred module width, aisle/accessibility preferences, and manufacturing assumptions.
4. **Generate Layout** — run the deterministic optimizer and show the recommended layout with score and dimensions.
5. **Compare Alternatives** — show the top candidates with compact SVG previews and metric deltas; selecting a candidate makes it the active design.
6. **Manufacturing** — show derived materials, thicknesses, manufacturing methods, assembly strategy, controller module, and a bill of materials.
7. **Export** — download the complete JSON configuration and a readable CSV-style bill of materials; provide a print-friendly summary.

The dashboard uses a persistent left rail, a compact top bar with project status and the active design score, metric cards, and responsive stacked layouts below 900px.

## Domain model

```ts
type LockerTypeId = 'small' | 'medium' | 'large' | string;

interface LockerType {
  id: LockerTypeId;
  name: string;
  code: string;
  dimensions: { width: number; height: number; depth: number };
  capacityLitres: number;
  weightCapacityKg: number;
  allowedUsage: string;
  material: string;
  thicknessMm: number;
  hardware: { lock: string; sensor: string; indicator: string };
}

interface ConstraintSet {
  maxWidthMm: number;
  maxHeightMm: number;
  maxDepthMm: number;
  dividerMm: number;
  frameMm: number;
  doorGapMm: number;
  controllerWidthMm: number;
  preferredModuleWidthMm: number;
}

interface LockerInstance { id: string; typeId: LockerTypeId; column: number; row: number; }

interface LayoutCandidate {
  id: string;
  columns: number;
  rows: number;
  lockers: LockerInstance[];
  dimensions: { width: number; height: number; depth: number };
  metrics: { widthFit: number; heightFit: number; spaceUse: number; manufacturing: number; accessibility: number; balance: number; cableRouting: number; serviceAccess: number };
  score: number;
  warnings: string[];
}

interface ManufacturingSpec {
  materials: Array<{ name: string; material: string; thicknessMm: number; method: string; quantity: number }>;
  assemblySteps: string[];
  hardware: Array<{ item: string; quantity: number; placement: string }>;
}

interface CabinetConfig {
  schemaVersion: 1;
  project: { name: string; createdAt: string; updatedAt: string };
  lockerTypes: LockerType[];
  demand: Record<LockerTypeId, number>;
  constraints: ConstraintSet;
  candidates: LayoutCandidate[];
  activeCandidateId: string | null;
  manufacturing: ManufacturingSpec | null;
}
```

## Optimization engine

The optimizer validates positive dimensions, non-negative quantities, compatible depth, and a non-zero demand before searching. It enumerates column counts from 1 through the smallest practical bound derived from maximum width and preferred module width. For each column count it generates balanced column stacks using a deterministic best-fit assignment: larger lockers are placed first, then each next locker is assigned to the shortest current stack, breaking ties by column index.

Each candidate derives cabinet width from column widths plus dividers, height from the tallest stack plus frame and top/bottom allowances, and depth from the maximum locker depth plus door/frame allowance. Candidates outside any maximum constraint are rejected. Duplicate arrangements are removed by a canonical column signature.

Metrics are normalized to 0–100:

`score = 0.12 widthFit + 0.12 heightFit + 0.16 spaceUse + 0.16 manufacturing + 0.14 accessibility + 0.10 balance + 0.10 cableRouting + 0.10 serviceAccess`

- `widthFit` and `heightFit` reward remaining clearance without excessive unused envelope.
- `spaceUse` measures locker volume divided by external cabinet volume.
- `manufacturing` rewards repeated locker widths, fewer unique panel sizes, and fewer module seams.
- `accessibility` penalizes tall stacks and rewards placing large/high-use units in the middle or lower zones.
- `balance` penalizes uneven column heights and concentrates less mass at the top.
- `cableRouting` rewards consistent vertical channels and a controller bay adjacent to the densest locker module.
- `serviceAccess` rewards a clear controller compartment and layouts that can be serviced by module.

The engine returns candidates sorted descending by score, with the top 6 retained for comparison. It never silently changes requested quantities; warnings explain any fallback or tradeoff.

## Visualization

`LockerLayoutSvg` receives a `LayoutCandidate`, locker type definitions, and constraints. It calculates a fit-to-viewBox scale and renders an outer frame, each locker rectangle, type code, door swing/lock marker, row/column guides, dimension arrows, controller bay, and a legend. Every locker has an accessible `<title>` and keyboard-focusable group. SVG rendering is pure from props so candidates can be compared without shared mutable state.

## Manufacturing and hardware derivation

The manufacturing layer derives a production summary from the active candidate:

- 2.0 mm powder-coated galvanized or mild-steel frame members.
- 1.2 mm formed door sheets and 1.0–1.2 mm divider/back panels.
- CNC laser cutting, press-brake bending, PEM fasteners, bolted modular assembly, and final powder coating.
- Per locker: electronic lock, door sensor, status indicator, hinge set, seal, and fasteners.
- Shared: controller compartment, power supply, network module, lock controller, sensor controller, vertical cable channel, reinforcement, and ventilation paths.

Quantities are computed from the actual locker count, column count, module seams, and controller bay. The UI labels these as suggestions and keeps them editable at the configuration level.

## Application architecture

- `src/domain` contains types, validation, optimizer, scoring, and manufacturing derivation with no React imports.
- `src/app` contains the default configuration, reducer/state transitions, persistence, import/export helpers, and formatting utilities.
- `src/components` contains the shell, forms, metric cards, layout SVG, candidate cards, manufacturing tables, and export controls.
- `src/styles.css` contains the dashboard design system and responsive layout.
- `src/main.jsx` is only the composition root; it must not contain optimization logic.

State transitions are explicit: edit configuration → validate → generate candidates → select candidate → derive manufacturing → export. Invalid input stays visible next to the field and prevents generation. A generation failure keeps the last valid active candidate and shows the reason.

## Component hierarchy

```text
App
├── Sidebar / navigation
├── Topbar / active project status
└── Active view
    ├── ProjectSetupView
    │   ├── DemandProfile
    │   ├── CurrentEnvelopePreview
    │   └── MetricCard[]
    ├── LockerTypesView / LockerTypeEditor[]
    ├── ConstraintsView
    ├── GenerateView
    │   ├── LockerLayoutSvg
    │   ├── MetricCard[]
    │   └── ScoreBreakdown
    ├── CompareView / CandidateCard[] / LockerLayoutSvg
    ├── ManufacturingView
    │   ├── MaterialTable
    │   ├── HardwareTable
    │   └── ControllerArchitecture
    └── ExportView
        ├── JsonPreview
        └── HandoffActions
```

## Configuration JSON example

The persisted/exported shape is JSON-compatible and versioned so a later migration can transform old local files:

```json
{
  "schemaVersion": 1,
  "project": { "name": "North Hub smart locker study", "createdAt": "2026-08-24T00:00:00.000Z", "updatedAt": "2026-08-24T00:00:00.000Z" },
  "demand": { "small": 15, "medium": 10, "large": 5 },
  "constraints": { "maxWidthMm": 1400, "maxHeightMm": 2200, "maxDepthMm": 600, "dividerMm": 10, "frameMm": 25, "doorGapMm": 4, "controllerWidthMm": 160, "preferredModuleWidthMm": 300 },
  "lockerTypes": [{ "id": "small", "code": "S", "dimensions": { "width": 260, "height": 180, "depth": 600 }, "capacityLitres": 28.1, "weightCapacityKg": 12 }],
  "candidates": [],
  "activeCandidateId": null,
  "manufacturing": null
}
```

## Development roadmap

1. **Prototype complete** — validate demand, generate deterministic SVG alternatives, inspect score breakdown, derive the BOM, and export/import JSON locally.
2. **Design-system hardening** — add schema migrations, richer constraint presets, editable manufacturing assumptions, and saved project snapshots.
3. **Production geometry** — introduce a 3D/parametric CAD adapter, panel unfolding rules, door clearances, structural checks, and real module connection details.
4. **Operational integration** — connect controller/lock vendors, add authenticated server persistence, role-based review, and production release approvals.

## Testing and acceptance

The domain layer must have tests for default demand, invalid input, dimension constraint rejection, mixed-size packing, exact requested locker counts, deterministic ranking, score bounds, and manufacturing quantity derivation. The application must build with `npm run build`. Manual verification must confirm that editing a locker dimension changes SVG geometry and metrics, changing constraints removes invalid candidates, candidate selection updates manufacturing data, JSON export/import round-trips, and the dashboard remains usable at mobile width.

## Deferred work

Three.js/3D visualization, backend persistence, authentication, electrical schematics, finite-element structural validation, live CAD export, and real hardware integrations are outside this phase.
