# TripRate

TripRate is a mobile-first shopping helper for travelers. Instead of showing a precise exchange calculator as the main feature, it generates one mental formula you can remember for the trip, such as:

- `remove one zero`
- `divide by 2`
- `add 10%`

The product goal is not financial precision. It is fast, good-enough price estimation while shopping.

## Product Principles

TripRate is intentionally opinionated:

- Speed over precision
- Simplicity over feature breadth
- Memorability over mathematical elegance
- Exact conversion as a backup, not the primary UI

That philosophy drives both the interface and the formula engine.

## What The App Does

1. The user picks the currency they see in local stores and the home currency they think in.
2. TripRate fetches the current exchange rate for that direction.
3. It generates many possible mental-conversion formulas.
4. It scores those formulas for accuracy, simplicity, and memorability.
5. It recommends one formula and only shows alternates when they represent a real tradeoff.
6. The user can rehearse that formula on sample shopping amounts and practice it in a timed 60-second session.

Example:

- If the shopper is seeing prices in JPY and thinking in USD, TripRate might prefer a rule like `remove two zeros, then subtract 30%`.
- The app then shows how that formula behaves on typical shopping amounts like `1000`, `5000`, or `10000`, and can expand each one into a visual step-by-step breakdown.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

The app uses the App Router and is currently a client-heavy single-page experience inside the main route.

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run lint
npm run test:core
npx next build --webpack
```

Notes:

- `npm run lint` passes.
- `npm run test:core` covers persistence safety and core formula-selection rules.
- In this environment, the default Turbopack build path hit a sandbox-related error while processing CSS. The webpack build path completed successfully.

## Current Formula UI

The Formula tab presents formulas as a graphical left-to-right rail:

- source currency
- one or more formula step pills
- destination currency

Current behavior:

- `0-2` steps use the standard rail
- longer moderate formulas use a denser rail so the full sequence still fits without horizontal scrolling
- alternates reuse the same rail layout, but with neutral grey styling instead of the primary blue emphasis
- examples can expand inline into a visual walkthrough showing each intermediate result in the formula chain
- the Practice tab is a `60 seconds practice` mode that trains fast mental estimation against the current formula

## Project Layout

```text
app/
  layout.tsx        App shell metadata and viewport settings
  page.tsx          Root page entry
  globals.css       Global visual theme

components/
  triprate-app.tsx  Main app state and screen orchestration
  setup-screen.tsx  Currency and difficulty selection
  shortcut-screen.tsx Formula tab walkthroughs, examples, and alternates
  practice-screen.tsx Timed mental-math practice
  shortcut-rail.tsx  Shared graphical formula rail
  currency-select.tsx
  difficulty-selector.tsx
  screen-tabs.tsx
  section-card.tsx

lib/
  constants.ts      Defaults, storage key, evaluation amounts
  currencies.ts     Supported currency list
  formatting.ts     Currency/percent display helpers
  storage.ts        localStorage persistence
  types.ts          Shared TypeScript types
  formulas/
    apply-formula.ts
    build-shortcut.ts
    calculate-average-error.ts
    classify-difficulty.ts
    describe-formula.ts
    generate-candidates.ts
    rank-formulas.ts

services/
  rate-service.ts   Live exchange-rate fetch + fallback rates
```

## Core Idea In Plain English

TripRate does not try to discover the mathematically best approximation in the abstract. It tries to discover the best shopping formula a human can actually remember and use under time pressure.

That means the engine asks questions like:

- Can this rule be explained in one or two short steps?
- Does it work reasonably well for common shopping prices?
- Is it easier to remember than a slightly more accurate alternative?
- Would most people rather do this in their head than open a calculator?

That behavior is described in more detail in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Exchange Rate Source

Live rates are requested from the Frankfurter API.

If the request fails, TripRate falls back to a static reference table anchored on USD. That fallback keeps the app usable offline or during API failures, but it is only an estimate and may be stale.

## Supported Currencies

The app ships with a fixed curated currency list in `lib/currencies.ts`. It currently supports 50 common travel and shopping currencies.

## State And Persistence

- The last selected currency pair is stored in `localStorage`.
- On reload, the app restores that pair and tries to immediately regenerate a formula for it.
- The active screen is local UI state only.
- The Formula and Practice screens remount when the selected formula changes so walkthrough and practice state cannot leak across currency pairs.

## Limitations

- This is a shopping estimation tool, not a finance or remittance tool.
- The automated tests currently focus on core formula-selection and persistence behavior rather than full UI coverage.
- The README explains the product and repo layout, but the formula-selection rules are better understood through `ARCHITECTURE.md`.

## Next Useful Improvements

- Add fixtures for representative currency pairs and expected formula outcomes.
- Expand coverage from core selection logic into UI-level tests.
- Add lightweight telemetry for which formulas users keep or swap away from.
- Add an explicit offline indicator when fallback rates are being used.
