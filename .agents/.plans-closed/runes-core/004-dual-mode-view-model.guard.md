# Guard log — 004 dual-mode-view-model

## Checkpoint 1 — 2026-09-27 05:17 — DRIFTING → PLAN AMENDED (fix round 1)

5252d33 (WIP snapshot, not accepted) · executor completed Steps 1–5 with every listed gate green, then correctly refused to hand it over: rows and cells reached through `vm.current.pageRows` can freeze after a re-derive.

- Reproduced by guard with a throwaway host (sort + select plugins, deleted afterwards): via `$pageRows`, `selectedDataIds.set({'0': true})` after a sort → flags `[false, true, false]`; via `vm.current.pageRows` → `[false, false, false]` plus three `[svelte] derived_inert` warnings. Same shape as the executor's probe.
- Diagnosis (guard, from Svelte's ownership rules + the warning text): `TableComponent` (plan 002) creates its `current` `$derived`s in the constructor; rows/cells are constructed inside the store derivation chain; when that chain first runs under the `render_effect` that `fromStore` opens for the `vm.current.pageRows` `$derived`, the row deriveds are owned by that effect and go inert when it is torn down on the next re-derivation. Through `$pageRows` the subscription is owned by the component's long-lived effect, so nothing is torn down. The spike missed it because its wrappers were created at component init, not inside a derivation.
- Classification: **plan defect** (002's mechanism is unsafe for objects created inside store derivations), surfaced by 004 — not executor drift. Executor conduct: exemplary; it stopped with evidence rather than weakening tests.
- Executor's listed results reproduced by guard at 5252d33: `pnpm check` 0 errors; `pnpm test` 56 files / 596 tests; exports snapshot unchanged; the eight `$`-prefixed local renames in `createViewModel.svelte.ts` are mechanical.
- Action: 004 amended — scope gains `src/lib/tableComponent.svelte.ts`; new Step 3c replaces the constructor `$derived`s with getters over a `fromStore` instance cached per `#hookVersion` (no class-level deriveds); `vm.current` getters likewise read a `fromStore` instance created once per store; a red regression test (select after sort through `vm.current.pageRows`) is required first. Fix-dispatched to the same executor (round 1 of 3). 002's guard log gets an addendum.

## Checkpoint 2 — 2026-09-27 05:36 — DRIFTING → PLAN AMENDED (fix round 2)

bfa0d6d · fix round 1 verified correct (guard's independent probe: select → sort → select → sort stays live, no `derived_inert`; full suite 597/597 with 0 `derived_inert` lines; e2e 36/2; package + exports clean). **But** a same-machine, back-to-back bench exposed a construction-cost regression that 004's before/after gate could not see because its baseline (815c91d) already contained plan 002:

| rows-10k firstPaint median | spike commit e5fbb85 | now (bfa0d6d) |
| -------------------------- | -------------------- | ------------- |
| store control renderer     | 201 ms               | 439 ms        |
| current.* / runes renderer | 188 ms               | 475 ms        |

- Attribution (guard microbench, throwaway vitest probe run on both trees, deleted): building 10k rows × 8 cells on first subscribe = **103 ms at e5fbb85 vs 390 ms now**; `createViewModel` itself unchanged (~1 ms). Both renderers regress equally → the cost is in `TableComponent`'s constructor (plan 002): a `$state` signal and a two-getter `current` object with bound closures created eagerly per instance, ×80k.
- Classification: plan defect (002's mechanism again; 004's own gate was blind to it). Executor conduct in round 1: clean.
- Action: 004 amended with Step 3d — lazy per-instance rune state (plain counter; signal and `current` view created on first `current` read; prototype getter), a construction microbench as the red/green check, and a batch-level perf gate: rows-10k first paint within 15% of the spike commit's store renderer on the same machine. Fix-dispatched (round 2 of 3).

## Checkpoint 3 — 2026-09-27 05:40 — PLAN AMENDED (fix round 3)

(no snapshot) · round 2 result: Step 3d's lazy `$state` restores construction cost (probe 399 → 128 ms) but breaks the late-`applyHook` test. Executor's diagnosis, verified against `node_modules/svelte/src/internal/client/reactivity/sources.js` and `runtime.js`: a signal created inside a running reaction is recorded in that reaction's `current_sources`, and `get()` intentionally does not register a dependency on a source created by the same reaction — so the first template reader of `current` can never track a version signal it caused to be created. Plan defect (Step 3d's mechanism), not drift; the executor stopped rather than improvising.

- Amendment: the lazy version signal becomes a `writable` read through `fromStore` (created on first `current` read; `applyHook` calls `set` when it exists). `fromStore`'s source is created by `createSubscriber` outside the reader's dependency-capture path, so the first reader tracks it. Executor prototyped this: probe ~127 ms, 11/11 tests, no `derived_inert`. Cost: one more subscription per instance actually read through `current`, same class of cost as the attrs/props handles.
- Fix-dispatched (round 3 of 3).

## Checkpoint 4 — 2026-09-27 05:57 — ON TRACK

e72b549 · final close-out after fix round 3 (base 5e5f174 → snapshots 5252d33 WIP, bfa0d6d round 1, e72b549 round 3)

- Reproduced by guard at e72b549 with throwaway probes (deleted): select → sort → select → sort through `vm.current` stays live with no `derived_inert`; 10k×8 construction 134.7 ms (was 390 ms at 5252d33, 103 ms at the spike commit).
- Gates reproduced: `pnpm check` 0 errors; `pnpm test` 56 files / 597 tests with thresholds, `derived_inert` 0 lines; no `$state`/`$derived` in either `.svelte.ts`; `trunk check` no issues; `pnpm package` All good with `dist/createViewModel.svelte.js`; e2e chromium + mobile-chrome 36 passed / 2 skipped; exports snapshot unchanged.
- Absolute perf gate, back to back on one machine, 10 cold iterations, firstPaintMs median: SPIKE store rows10k 198.65 vs NOW current.* 185.15 (0.93×) and NOW store 199.6 (1.00×) → within 15%, regression gone. rows1k 83.65 / 62.35 / 81.75; sortCycle1k 51.05 / 43.6 / 52.35; kitchenSink1k 64.55 / 45.95 / 68.2.
- Diff read: `TableComponent` constructor sets only `id`; `current` is a prototype getter over a lazily created view; version signal is a lazily created `writable` read through `fromStore`; `applyHook` bumps the counter and `set`s the store if present. `createViewModel.svelte.ts` `live()` is a once-per-store `fromStore` handle. One `trunk-ignore(no-this-alias)` for the `component = this` capture, justified.
- Action: PASS; README row → DONE; batch retired.
