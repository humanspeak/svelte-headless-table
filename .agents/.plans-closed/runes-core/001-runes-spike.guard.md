# Guard log — 001 runes-spike

## Checkpoint 1 — 2026-09-27 04:24 — ON TRACK

e5fbb85 · final close-out after one Opus executor run (branch `feat/runes-core`, base 36bbe99)

- Reproduced by guard at e5fbb85: `vitest run src/routes/test/runes-spike` → 10/10 (3 assertions × 2 mechanisms + 4 unowned-context probes); `pnpm check` 0 errors; `git diff --stat 36bbe99 HEAD -- src/lib` → empty (hard boundary held).
- SSR reproduced independently against the dev server: `/test/runes-kitchen-sink` (mechanism A) → 13 columnheader / 22 row / 160 cell, identical to `/kitchen-sink`; `?mechanism=subscriber` → HTTP 500. Matches the report.
- Perf reproduced with a 10-iteration cold A/B (executor used 30): firstPaint median ratios runes/store — rows1k 0.78, rows10k 0.94, sortCycle1k 0.92, kitchenSink1k 0.78; `domCells` 400/400 everywhere. Executor's: 0.75 / 0.96 / 0.84 / 0.84. Same direction, no scenario slower at the median.
- Report read in full: Decision 3 cites verbatim test output; Decision 1 recommends the `current` namespace with a concrete template; risks section records the two toolchain findings (TS2729 on field-initializer `$derived`, ESLint cannot parse `.svelte.ts` under the current config).
- Deviations vetted: constructor-assigned `$derived` (forced by TS2729, semantics unchanged); structural `StoreBackedComponent` parameter (svelte-check rejected the generic form; keeps `render()` on rows); `wrapRows` shape; file-level `trunk-ignore-all(eslint)` on the `.svelte.ts` prototype because the eslint config lacks a `.svelte.ts` parser mapping — disclosed, and now Step 0 of plan 002 rather than a permanent suppression.
- Not reproduced: the "stale hook stores on a long-lived wrapper" concern is inferred, not tested; carried into plan 002 as the `#hookVersion` requirement and its fourth test case.
- Action: PLAN AMENDED for 002 and 004 (see below); README rows updated.

## Checkpoint 2 — 2026-09-27 04:24 — PLAN AMENDED

- Plans 002 and 004 assumed mechanism B (subscriber mirror). The spike disproved it (empty seed outside effects, SSR 500). Both plans re-written to mechanism A with constructor-assigned `$derived` over `fromStore`, `#hookVersion` invalidation from `applyHook`, an SSR test, and (002 only) a Step 0 adding `.svelte.ts` to the ESLint TS-parser globs with `eslint.config.mjs` in scope. Planned-at re-stamped to e5fbb85. Rationale: the plan was wrong about reality, not the work; the README had pre-declared this amendment step.
