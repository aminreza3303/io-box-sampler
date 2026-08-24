# LockerLab — Parametric Smart Locker Configurator

LockerLab is a local engineering dashboard for generating manufacturable modular smart-locker cabinet configurations from locker demand and physical constraints.

It is intentionally a 2D, SVG-first tool. The application separates configurable locker definitions, deterministic layout optimization, scoring, manufacturing derivation, and the dashboard UI so a product engineer can inspect the trade-offs behind each alternative.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

The default project starts with 15 small, 10 medium, and 5 large lockers. Configuration is persisted in browser `localStorage` under `smart-locker-configurator:v1`.

## Workflow

1. **Project setup** — set the project name, demand mix, exact columns, and exact rows. The grid must contain exactly the requested number of boxes.
2. **Locker types** — edit width, height, depth, capacity, weight limit, material, thickness, usage, and hardware defaults.
3. **Constraints** — set construction allowances such as divider, frame, door gap, and controller-package width. Overall cabinet dimensions are calculated, not entered.
4. **Generate layout** — calculate the complete cabinet envelope from the filled grid.
5. **Compare alternatives** — inspect the top candidates as compact SVG previews and select a different trade-off when needed.
6. **Manufacturing** — review the derived material schedule, hardware architecture, the existing top-row controller locker, cable routing, ventilation, and assembly sequence.
7. **Export** — download the complete JSON configuration or a manufacturing BOM CSV. JSON packages can be imported into another local session.

## Optimization model

The optimizer requires `rows × columns` to equal total demand, fills every cell, calculates each column width from the widest box in that column, calculates each row height from the tallest box in that row, and derives the complete outer cabinet dimensions. One existing top-row cell is marked controller-ready for later assignment; it never adds cabinet width.

The composite score is normalized to 0–100:

```text
score = 0.12 widthFit
      + 0.12 heightFit
      + 0.16 spaceUse
      + 0.16 manufacturing
      + 0.14 accessibility
      + 0.10 balance
      + 0.10 cableRouting
      + 0.10 serviceAccess
```

The score breakdown is exposed in the Generate Layout view so width/height fit, utilization, manufacturing simplicity, access, balance, cable routing, and serviceability remain inspectable.

## Commands

```bash
npm test       # Node built-in domain and application tests
npm run build  # Production Vite build
```

The test suite covers default demand, invalid constraints, mixed-size packing, exact locker counts, deterministic ranking, score bounds, manufacturing quantities, JSON export, CSV export, reducer edits, and generation state.

## Project structure

- `src/domain/locker.js` — locker types, configuration model, validation, and quantities
- `src/domain/optimizer.js` — deterministic layout generation and scoring
- `src/domain/manufacturing.js` — materials, hardware, and assembly derivation
- `src/app/useConfigurator.js` — reducer-backed application state and actions
- `src/app/storage.js` — local persistence
- `src/app/export.js` — JSON/CSV serialization and browser downloads
- `src/main.jsx` — dashboard composition and SVG visualization
- `src/styles.css` — responsive engineering dashboard styling
- `tests/` — domain and application tests

## Deferred scope

Three.js/3D visualization, backend persistence, authentication, electrical schematics, finite-element validation, live CAD export, and real hardware integrations are not part of this local prototype.
