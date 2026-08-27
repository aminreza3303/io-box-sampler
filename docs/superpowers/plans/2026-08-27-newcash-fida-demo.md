# NewCash FIDA Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, RTL, Persian interactive prototype that demonstrates the NewCash agent-assisted FIDA registration and payment journey.

**Architecture:** Isolate journey state and transition rules in a small pure module so the React shell only renders the active step and sends named events. `main.jsx` composes the console, wizard, operations rail, user profile, and external-environment overlays from that state; `styles.css` provides the responsive RTL design system.

**Tech Stack:** React 19, Vite, plain CSS, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-27-newcash-fida-demo-design.md`

## Global Constraints

- Prototype data is synthetic; it must not contain real personal, card, identity, SMS, or payment data.
- Use Persian copy and RTL layout throughout the user-facing demo.
- Keep the existing Vite/React runtime and dependency set; do not add a backend, API calls, external fonts, persistence, or server-side changes.
- The tracking code is valid only when it has at least six non-whitespace characters.
- Verify both external overlays, code-copy acknowledgements, success receipt, and reset in a browser walkthrough.

---

### Task 1: Define testable journey-state transitions

**Files:**
- Create: `src/demo/journey.js`
- Create: `tests/journey.test.js`

**Interfaces:**
- Produces: `initialJourney`, `journeyReducer(state, event)`, `isTrackingCodeValid(code)`.
- Consumes: no browser APIs; the React UI imports these exports.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialJourney, isTrackingCodeValid, journeyReducer } from '../src/demo/journey.js';

test('advances the registration journey and exposes secure-code states', () => {
  let state = journeyReducer(initialJourney, { type: 'NEXT' });
  assert.equal(state.step, 2);
  state = journeyReducer(state, { type: 'FIDA_PORTAL_COMPLETED' });
  assert.equal(state.step, 3);
  assert.equal(state.smsReady, true);
});

test('requires six characters for a payment tracking code and reset clears progress', () => {
  assert.equal(isTrackingCodeValid('12345'), false);
  assert.equal(isTrackingCodeValid('123456'), true);
  const reset = journeyReducer({ ...initialJourney, step: 7, paymentReady: true }, { type: 'RESET' });
  assert.equal(reset.step, 1);
  assert.equal(reset.paymentReady, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/journey.test.js`

Expected: FAIL because `src/demo/journey.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export const initialJourney = { step: 1, smsReady: false, paymentReady: false };

export function isTrackingCodeValid(code) {
  return code.trim().length >= 6;
}

export function journeyReducer(state, event) {
  if (event.type === 'RESET') return initialJourney;
  if (event.type === 'NEXT') return { ...state, step: Math.min(state.step + 1, 7) };
  if (event.type === 'FIDA_PORTAL_COMPLETED') return { ...state, step: 3, smsReady: true };
  return state;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/journey.test.js`

Expected: PASS with two passing subtests.

- [ ] **Step 5: Commit**

```bash
git add src/demo/journey.js tests/journey.test.js
git commit -m "feat: add FIDA demo journey state"
```

### Task 2: Build the integrated representative console

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `initialJourney`, `journeyReducer`, and `isTrackingCodeValid` from `src/demo/journey.js`.
- Produces: the interactive application mounted by the current Vite entrypoint.

- [ ] **Step 1: Write the failing visual acceptance checklist**

```text
At http://127.0.0.1:5173:
1. The viewport is RTL and Persian, with a NewCash navigation sidebar.
2. Seven wizard states render with progress and agent/user context.
3. Step 3 opens a labelled FIDA simulation and reveals an SMS code on confirmation.
4. Step 6 opens a labelled gateway simulation and reveals an OTP on confirmation.
5. A tracking code shorter than six characters cannot submit; a valid one displays a receipt.
6. Reset returns to the initial request state.
```

- [ ] **Step 2: Verify the current app fails the checklist**

Run: `npm run dev`

Expected: the existing LockerLab screen is visible instead of the NewCash RTL console.

- [ ] **Step 3: Replace the composition with focused UI units**

```jsx
function App() {
  const [journey, dispatch] = useReducer(journeyReducer, initialJourney);
  const [overlay, setOverlay] = useState(null);
  return <main className="newcash-app" dir="rtl">...</main>;
}
```

Implement `Sidebar`, `Topbar`, `WizardProgress`, `UserProfile`, `OperationsRail`, `FidaPortalModal`, `PaymentGatewayModal`, `SecureCodeCard`, and `SuccessReceipt` as focused components in `src/main.jsx`. Each component receives only the state and callback props it renders.

- [ ] **Step 4: Add the responsive RTL visual system**

```css
.newcash-app { direction: rtl; min-height: 100vh; }
.console-grid { display: grid; grid-template-columns: 272px minmax(0, 1fr) 310px; }
@media (max-width: 980px) { .console-grid { grid-template-columns: 1fr; } }
```

Style the financial-dashboard palette, cards, warning/temporary states, overlays, buttons, wizard progression, code cards, receipt, focus states, and reduced-motion fallback described in the spec.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: Vite completes without errors and writes the production bundle to `dist`.

- [ ] **Step 6: Browser walkthrough and commit**

Run: `npm run dev`

Complete the six acceptance-checklist actions in a browser, then commit:

```bash
git add src/main.jsx src/styles.css
git commit -m "feat: build NewCash FIDA registration demo"
```

### Task 3: Final regression verification

**Files:**
- Modify: none unless a verification failure requires a focused correction.

**Interfaces:**
- Consumes: all artifacts from Tasks 1 and 2.
- Produces: verified local demo ready for presentation.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: the original domain tests and `tests/journey.test.js` all pass.

- [ ] **Step 2: Run formatting and build checks**

Run: `git diff --check; npm run build`

Expected: no whitespace errors and a successful production build.

- [ ] **Step 3: Inspect final changes**

Run: `git status --short; git log -2 --oneline`

Expected: clean working tree and focused commits for journey state and the demo console.
