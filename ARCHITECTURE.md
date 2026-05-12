# TripRate Architecture

This document explains how TripRate works as a product and as a codebase, with extra focus on the formula-generation logic in human-readable terms.

## One-Sentence Summary

TripRate takes a live exchange rate and turns it into a small set of mental math rules, then chooses the rule that best balances:

- accuracy
- simplicity
- memorability

## Product Framing

TripRate is deliberately not an exact converter first.

The product is built around one assumption: when someone is shopping abroad, the best tool is often not the most exact one. It is the one they can use fastest without friction.

So the engine is optimized for questions like:

- "What formula can I remember while walking through a store?"
- "What formula works across normal shopping prices?"
- "When is a slightly less accurate rule worth it because it is much easier?"

That is why the formula engine is separate from the UI.

## High-Level Flow

At runtime, the app does this:

1. The user chooses a local currency and a home currency.
2. The app fetches the exchange rate from `local -> home`.
3. It builds a recommendation object from that quote.
4. That recommendation contains many candidate formulas grouped by difficulty.
5. The UI resolves one formula for the selected mode: `easy` or `moderate`.
6. The app may show alternates, but only when they represent a meaningful tradeoff.
7. The user sees the rule, rehearses it on shopping examples, and can train it in a timed practice session.

Main files:

- `components/triprate-app.tsx`
- `services/rate-service.ts`
- `lib/formulas/build-shortcut.ts`

## App Structure

### UI Layer

The UI is intentionally simple:

- `Setup` screen: choose currencies and difficulty
- `Formula` screen: show the recommended rule, worthwhile alternates, and guided example walkthroughs
- `Practice` screen: run a 60-second flash-card practice using the current formula

The main controller is `components/triprate-app.tsx`. It owns:

- selected currencies
- selected difficulty
- current recommendation
- loading/error state
- screen navigation

### Service Layer

`services/rate-service.ts` hides exchange-rate fetching.

It tries Frankfurter first. If that fails, it uses a built-in table of USD-anchored rates and derives the pair from that table.

In product terms:

- best case: live rate
- fallback case: plausible reference rate so the app stays useful

### Formula Layer

The formula layer is the heart of the app. It is split into small steps:

- `generate-candidates.ts`: create possible mental rules
- `calculate-average-error.ts`: measure how wrong each rule is
- `classify-difficulty.ts`: estimate how mentally awkward the rule is
- `rank-formulas.ts`: score and sort the rules
- `build-shortcut.ts`: apply product rules to pick the best recommendation

## The Core Logic In Human Terms

TripRate generates formulas the way a human might invent them on paper:

1. Start with simple operations people already use mentally.
2. Try combinations of those operations.
3. Check which combinations stay close to the true rate.
4. Prefer the ones that are easier to remember.

The result is not "the perfect approximation." It is "the most usable approximation."

## Step 1: Get The Exchange Rate

Suppose the app needs to convert from local currency to home currency.

Example:

- `1 JPY = 0.0067 USD`

That exact number is too awkward for mental use. The rest of the system tries to approximate it with a short recipe.

## Step 2: Generate Candidate Mental Rules

The engine builds many possible recipes from a fixed menu of mental operations.

### Available Operation Types

Scale operations:

- shift decimal place by powers of 10
  - "remove one zero"
  - "add two zeros"
- multiply by a small number
  - `x2`, `x3`, `x4`, ... `x10`
- divide by a small number
  - `/2`, `/4`, `/6`, `/8`, `/10`

Adjustment operations:

- add or subtract a fixed amount
  - `+1`, `-2`, `+5`, `-10`
- add or subtract a percentage
  - `+10%`, `-20%`, `+30%`, `-50%`

### What The Generator Actually Tries

It does not generate arbitrary math expressions. It searches a constrained space that is still human-sized:

- single scale operations
- single adjustment operations
- two scale operations
- two scale operations plus one final adjustment
- three scale operations
- one scale operation plus one adjustment

Examples of formulas the engine might produce:

- `remove two zeros`
- `/10, then -30%`
- `x2, then /10`
- `remove one zero, then /2`
- `x5, then +10%`

### Why The Search Space Is Constrained

TripRate excludes many combinations on purpose.

For example, it avoids sequences like:

- two identical operation types in a row
- direct inverses like `x2` followed by `/2`
- multiple decimal-shift steps in the same sequence

Those are technically possible, but they are either redundant or bad mental UX.

## Step 3: Test Candidates On Shopping Amounts

A formula is not judged on a single amount.

Instead, the app tests it against a list of common shopping prices such as:

- `1`
- `5`
- `10`
- `20`
- `50`
- `100`
- `200`
- `500`

For very small exchange rates, those amounts are scaled up so the examples stay realistic.

Example:

- if the rate is tiny, using `1`, `5`, `10` may not reflect real shopping behavior
- the app may instead evaluate `1000`, `5000`, `10000`, and so on

This matters because TripRate is optimizing for shopping amounts, not for arbitrary mathematical input.

## Step 4: Measure Error

For each candidate formula and each test amount, the app computes:

- the formula estimate
- the exact conversion
- the absolute difference
- the relative error

Then it averages those errors across all test amounts.

In plain language:

- "How far off is this formula, on average, for the prices people actually care about?"

## Step 5: Judge Mental Difficulty

Accuracy alone is not enough. A rule can be accurate and still be annoying.

TripRate classifies formulas into three internal difficulty buckets:

- `easy`
- `average`
- `difficult`

The classification is based on the operations used and how many steps the user must keep in their head.

### Friendly Operations

These are treated as especially natural:

- decimal shifts
- `x2`, `x4`, `x5`, `x10`
- `/2`, `/4`, `/10`
- `+10%` or `-10%`
- small fixed adds/subtracts

### Moderate But Still Acceptable Operations

These are somewhat harder but still usable:

- `x3`, `x6`, `x8`, `x9`
- `/6`, `/8`
- larger percentage adjustments like `20%`, `30%`, `40%`, `50%`

### Difficult Formulas

A formula is pushed into the difficult bucket if it contains awkward steps or too many steps.

Examples:

- unusual operation combinations
- four or more steps
- operations that feel unnatural to do quickly in your head

## Step 6: Score For Accuracy, Simplicity, And Memorability

After error is measured and difficulty is classified, each candidate gets a score.

The score includes:

- average relative error
- a simplicity penalty
- a memorability penalty

### Simplicity Penalty

This tries to answer:

- "How mechanically annoying is this sequence to perform?"

Rules with more steps or more awkward operations are penalized.

### Memorability Penalty

This tries to answer:

- "How hard is this formula to remember later?"

Rules with less familiar numbers or too much variety get penalized.

For example, a formula involving `7`, `8`, or multiple different operation kinds tends to be less memorable than one involving `/10` and `-20%`.

### Important Product Behavior

A slightly more accurate rule can lose if it is meaningfully harder to remember.

That is intentional. It matches the product goal.

The current selector also distinguishes between:

- total difficulty: the full burden of the whole formula
- per-step difficulty: how awkward each individual step feels on average

TripRate still prefers fewer total steps first, but per-step difficulty is now used as a tie-breaker and in alternate filtering.

## Step 7: Deduplicate Equivalent Rules

Different formulas can sometimes produce the same estimates on the sampled amounts.

When that happens, TripRate keeps only one version so the user does not see duplicate ideas dressed up with different math.

It also removes no-op formulas from the ranked list, because a formula that simply returns the original number is usually not a useful candidate on its own.

## Step 8: Build The Final Recommendation

Once the ranked candidates exist, `build-shortcut.ts` turns them into the user-facing recommendation.

This is where the product rules become most visible.

## Easy Mode

Easy mode tries to find the simplest rule that still feels useful.

Important behavior:

- it allows only low-effort formulas
- it prefers formulas with at most two mental steps
- if several easy formulas are accurate enough, it prefers fewer steps first, then lower total difficulty, then lower per-step difficulty
- if none hit the target, it still chooses the most accurate among the acceptable easy options

### Easy Accuracy Target

Easy mode treats roughly `10%` average relative error as good enough.

That target is deliberately forgiving because the main goal is speed.

## Moderate Mode

Moderate mode allows more effort in exchange for better accuracy.

Important behavior:

- it looks at stronger candidates from the `average` and `difficult` buckets
- it also considers a parity fallback when relevant
- if a candidate meets the tighter error target, it still prefers fewer steps first, then lower total difficulty, then lower per-step difficulty
- otherwise it falls back to the most accurate option available

### Moderate Accuracy Target

Moderate mode targets roughly `5%` average relative error.

This is tighter than easy mode, but the app still refuses to become a full calculator.

## The Special 1:1 Parity Rule

TripRate has a special case for pairs that are close enough to parity.

If treating the currencies as "roughly the same number" stays within the easy target, the app may recommend a `1:1` rule.

Human meaning:

- "Do not overcomplicate this. The numbers are close enough."

This is a very product-shaped decision. It reflects the idea that sometimes the best formula is no math at all.

## Dominating Candidate Promotion

TripRate now has a correction pass after its baseline ordering.

If another candidate beats the baseline on both:

- average miss
- total difficulty

then that stronger candidate is promoted to become the primary formula.

This handles the small subset of cases where a candidate would otherwise lose because of the simple ordering rules even though it is clearly better overall.

## Alternate Shortcut Policy

TripRate no longer shows alternates by default.

An alternate is only kept if it represents a meaningful tradeoff, such as:

- clearly better accuracy without becoming much harder
- clearly easier overall or per step without becoming much less accurate
- or a genuine speed-versus-precision choice a traveler might plausibly prefer

Alternates that are simply worse than the primary on both accuracy and total difficulty are suppressed.

## Example Walkthrough

Imagine the real rate is approximately:

- `1 local = 0.68 home`

The engine might generate candidates like:

- `/2`
- `/10, then x7`
- `/10, then -30%`
- `remove one zero, then x7`
- `x2, then /3` is not generated because that style is outside the chosen operation set

Then it evaluates those rules against shopping amounts.

Possible product outcome:

- `/2` may be very easy but too inaccurate
- `/10, then x7` may be accurate but a bit more awkward
- `/10, then -30%` may land in the sweet spot: accurate enough and easier to remember

TripRate would then recommend `/10, then -30%`.

That recommendation is less about mathematical purity and more about field usability.

## Shortcut Example Walkthrough Logic

The Shortcut screen is now also the main "learn this rule" surface.

For each sample shopping amount, the user can expand a walkthrough that:

1. starts from the local-currency example amount
2. shows each intermediate result after every formula operation
3. ends on the final home-currency estimate
4. keeps the exact result visible alongside the formula result

This keeps procedural learning next to the formula itself without turning the Formula tab into a quiz UI.

## Practice Screen Logic

The Practice tab is now a `60 seconds practice` mode.

On the practice screen, the app:

1. shows the current formula rail at the top
2. generates one shopping amount at a time from the recommendation's test-amount set
3. asks the user for a home-currency estimate before time runs out
4. grades the answer as `right` when it rounds to the same displayed formula result
5. grades the answer as `close enough` when it misses the formula result but stays within `10%` of the exact conversion
6. tracks solved answers, close-enough answers, and the current streak during practice
7. keeps the latest result visible while the next price appears, so the user can review the previous round
8. adds streak-driven visual feedback to the practice card as momentum builds

This reinforces the product idea that TripRate is a mental-math trainer, not just a prettier calculator.

## Formula Screen Presentation

The Formula tab presents formulas as a graphical left-to-right rail rather than plain text.

- primary formula: emphasized blue rail
- alternate formula: same structure, neutral grey rail
- `0-2` steps: standard pill sizing
- `3+` steps: denser rail so longer moderate formulas still fit without horizontal scrolling
- the same rail component is reused in both the Formula and Practice screens
- alternates can be promoted into the primary slot by user selection, and the previous primary moves into the alternate list

That UI choice matches the product goal: the user should read the formula as a sequence they can run mentally, not as a paragraph to decode.

## Persistence And Session Behavior

TripRate stores the last selected currency pair in `localStorage`.

On reload:

1. it restores the pair
2. fetches a fresh or fallback rate
3. rebuilds the formula recommendation
4. jumps the user directly to the Formula tab

That keeps repeat usage fast, which fits the product.

When the selected pair or resolved formula changes, the Formula and Practice views remount so stale walkthrough inputs or practice state cannot survive across currency changes.

## Why The Logic Is Split Across Files

The formula system is broken into focused modules so product tuning stays manageable:

- changing operation types belongs in `generate-candidates.ts`
- changing mental-complexity rules belongs in `classify-difficulty.ts`
- changing scoring tradeoffs belongs in `rank-formulas.ts`
- changing product-facing selection behavior belongs in `build-shortcut.ts`

That separation is useful because those are different decisions:

- what formulas are possible
- what formulas are awkward
- what formulas score well
- what formulas should actually be shown

## Known Constraints

- The app supports a fixed list of currencies rather than arbitrary ISO codes.
- The fallback rate table is hand-maintained and can drift from reality.
- Ranking quality depends on the chosen shopping test amounts.
- Test coverage exists for core formula-selection and persistence behavior, but not yet for full UI behavior.

## If You Need To Modify The Shortcut Engine

Use this rough guide:

- Add or remove operation types: `lib/formulas/generate-candidates.ts`
- Change what counts as easy vs moderate: `lib/formulas/classify-difficulty.ts`
- Change the scoring weights: `lib/formulas/rank-formulas.ts`
- Change user-facing selection policy: `lib/formulas/build-shortcut.ts`
- Change the example shopping amounts: `lib/constants.ts`

## Recommended Next Engineering Work

- Add unit tests for more representative rates and expected recommended formulas.
- Add snapshot-like fixtures for edge cases such as near-parity pairs and very small rates.
- Add UI-level tests for the formula rail, alternate swapping, and practice grading behavior.
- Consider exposing debug mode to inspect the top ranked candidates during development.
