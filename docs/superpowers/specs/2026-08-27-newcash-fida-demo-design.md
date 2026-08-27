# NewCash FIDA registration demo — design

## Purpose

Create a polished, local-only Persian (RTL) interactive prototype for presenting the NewCash agent-assisted FIDA-code registration journey to the CEO and engineering team. The prototype illustrates product states and hand-offs; it has no real identity, SMS, banking, or payment integrations.

## Experience model

The app is a single integrated agent console. The primary surface is a seven-step wizard, supported by a right-side operational context rail. Two controlled, in-product overlays simulate the external FIDA portal and payment gateway, preserving the sense of leaving the NewCash product without navigating away from the demo.

The representative can move forward and backward through the complete happy path, and can reset the demo. Each stage marks preceding work as complete and updates the context rail.

## Screens and states

1. **Start request** — show a selected NewCash user profile, representative identity, and a request summary. The representative begins a FIDA registration.
2. **Temporary mobile assignment** — show that NewCash has legally allocated a temporary mobile number, its reservation period, and its consent/usage boundary.
3. **FIDA portal overlay** — simulate entering the allocated number in the FIDA portal. On confirmation, return to the wizard with a generated SMS verification code displayed in a time-limited secure-code card.
4. **Identity-completion checkpoint** — show the user profile with completion tasks and a clear instruction that the agent completes these steps together with the user. The representative confirms completion to continue.
5. **Payment instrument assignment** — show the temporary card number allocated for the FIDA payment and its safe-use guidance.
6. **Payment gateway overlay and OTP** — simulate gateway data entry and requesting a dynamic password. Returning to the wizard reveals a time-limited OTP, with a copy interaction and a clear next action.
7. **Tracking-code submission** — capture the successful payment tracking code. Validation enables final submission and displays a success receipt.

## Supporting UI

- **NewCash sidebar:** product logo, agent-console navigation, current item, support indicator.
- **Top bar:** demo tag, representative status, notifications, and current date/time treatment.
- **Wizard:** numbered progress navigation, descriptive step header, next/back actions, and a live activity feed.
- **User profile card:** avatar/initials, name, masked national ID, mobile status, FIDA status, and identity-completion state.
- **Operations rail:** request ID, mobile allocation, card allocation, SMS/OTP delivery states, expiry badges, and a compact audit timeline.
- **External overlays:** visually distinct but branded FIDA and payment-gateway surfaces. They are explicitly labelled as simulations.

## Interaction rules

- No real personal or financial data appears. Demonstration values are synthetic and masked where appropriate.
- Secure values show an expiry countdown-like label but do not need a real timer. Copy actions change their button label to a success acknowledgement.
- The FIDA and gateway overlay primary action closes the overlay and unlocks the matching wizard state.
- The tracking code must have at least six characters before final submission is enabled.
- Reset returns the journey to step 1 and clears completion states, copy acknowledgements, and the tracking code.

## Visual direction

Use an RTL financial-dashboard design: off-white canvas, deep navy navigation, teal primary actions, blue information accents, amber warning/temporary-status accents, soft cards, high legibility Persian typography, and restrained motion. The layout is desktop-first for presentation but collapses gracefully for tablet/mobile widths.

## Technical shape

- Replace the current unrelated cabinet configurator composition in `src/main.jsx` with a self-contained React state-machine prototype.
- Replace `src/styles.css` with the RTL responsive visual system for the demo.
- Keep the existing Vite/React runtime and dependency set. No backend, API calls, external fonts, persistence, or server-side changes are required.
- Verify via `npm run build`; browser walkthrough verifies each step, both overlays, copy acknowledgements, tracking-code validation, completion receipt, and reset.

## Out of scope

Authentication, real number/card allocation, sending/receiving SMS, live payment handling, production security controls, audit persistence, and implementation of FIDA identity checks are intentionally represented only as states in this demonstration.
