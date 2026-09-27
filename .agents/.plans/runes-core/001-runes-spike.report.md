# Plan 001 report: runes-backed `TableComponent` spike

Executed on `feat/runes-core` at `36bbe99`, Svelte 5.56.10. Prototype:
`src/routes/test/runes-spike/runesComponent.svelte.ts`. Tests:
`src/routes/test/runes-spike/runesComponent.test.ts` with host
`RunesHost.test.svelte`. Renderers: `src/routes/test/perf-bench/_PerfTableRunes.svelte`
(`/test/perf-bench?renderer=runes`) and `src/routes/test/runes-kitchen-sink/+page.svelte`
(`?mechanism=subscriber` selects mechanism B).

## 1. Decision 1 — consumer shape

**Recommendation: (b) a namespace, `cell.current.attrs` / `cell.current.props`,
that coexists with the existing `attrs()` / `props()` store methods for the
dual-mode major.**

Reasoning:

- The prototype's wrapper (an object with plain `attrs` / `props` values) was a
  drop-in for `<Subscribe>` in all three renderers: the reactivity host, the
  perf table and a full kitchen-sink copy (sort, group, filter render, resize
  actions `use:w.props.resize.drag`, select). No template needed `fromStore`.
- Option (a), getters named `attrs` / `props`, collides with today's methods:
  every `cell.attrs()` call and every plugin/docs example breaks in one step.
  Option (b) lets the store API stay in place while consumers migrate, and
  `current` matches Svelte's own `fromStore(...).current` / `MediaQuery.current`
  vocabulary.
- The prototype showed one thing (b) must handle that a naive getter would
  get wrong: `createViewModel` re-applies hooks (`applyHook`) to the same row
  instances each time `injectedRows` re-derives, and `attrs()` builds its
  `derived` from the hook stores present _at call time_
  (`src/lib/tableComponent.ts:53-61`). The spike side-stepped this by
  rebuilding wrappers whenever `$headerRows` / `$pageRows` re-emit. A real
  `current` namespace must be invalidated by `applyHook` (e.g. a version
  signal the `$derived` reads). This is inferred from the code, not tested
  in isolation.

Consumer template under (b):

```svelte
{#each $pageRows as row (row.id)}
    <tr {...row.current.attrs} class:selected={row.current.props.select.selected}>
        {#each row.cells as cell (cell.id)}
            <td {...cell.current.attrs} class:sorted={cell.current.props.sort.order}>
                {#if !cell.current.props.group.repeated}
                    <Render of={cell.render()} />
                {/if}
            </td>
        {/each}
    </tr>
{/each}
```

## 2. Decision 3 — where reactive state lives

Command: `npx -y pnpm@11.24.0 exec vitest run src/routes/test/runes-spike/runesComponent.test.ts`

Verbatim result (timings stripped):

```text
 ✓ runesComponent.test.ts > mechanism fromStore > renders attrs and props on first paint
 ✓ runesComponent.test.ts > mechanism fromStore > updates props when a plugin toggles state
 ✓ runesComponent.test.ts > mechanism fromStore > updates attrs when plugin state changes outside the template
 ✓ runesComponent.test.ts > mechanism subscriber > renders attrs and props on first paint
 ✓ runesComponent.test.ts > mechanism subscriber > updates props when a plugin toggles state
 ✓ runesComponent.test.ts > mechanism subscriber > updates attrs when plugin state changes outside the template
 ✓ runesComponent.test.ts > outside any component > fromStore: plain reads outside any effect return current values
 ✓ runesComponent.test.ts > outside any component > fromStore: an $effect.root tracks updates
 ✓ runesComponent.test.ts > outside any component > subscriber: plain reads outside any effect return the EMPTY seed, not the store value
 ✓ runesComponent.test.ts > outside any component > subscriber: an $effect.root tracks updates but runs once on the empty seed first
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

The first six are the plan's three assertions x two mechanisms. The last four
are supplemental probes with wrappers built and read with no component at all
(the genuinely "unowned" case). They pin observed behaviour, including B's
hazard, so none use `test.fails`.

Findings:

- **Mechanism A (`$derived(fromStore(store).current)` in a class) tracks.** In
  a component, all three assertions pass. With no component, an
  `$effect.root` logs `['none', 'asc']`, and plain reads outside any effect
  still return the current value, because `fromStore` falls back to
  `get(store)` when not tracking. Unowned `$derived` + `fromStore` is safe in
  5.56.10: `effect_tracking()` is `active_reaction !== null && !untracking`,
  so a `$derived` evaluated from a template effect counts as tracking. The
  plan asked whether wrapping reads in `$effect` changes a failure. Nothing
  failed, and the `$effect.root` probe gives the same result.
- **Mechanism B (`$state.raw` mirror + `createSubscriber`) tracks inside
  effects only.** It has two defects the tests and SSR exposed:
    1. Outside an effect, reads return the `{}` seed, not the store value
       (`w.attrs` equals `{}`, `w.props` equals `{}`, even after a sort
       change). Event handlers, plain functions and tests that read `current`
       outside an effect would see empty data.
    2. **SSR crashes.** On the server `createSubscriber` is a no-op
       (`node_modules/svelte/src/reactivity/index-server.js`), so props stay
       `{}`. `GET /test/runes-kitchen-sink?mechanism=subscriber` returned
       **500** with
       `TypeError: Cannot read properties of undefined (reading 'order')` at
       `src/routes/test/runes-kitchen-sink/+page.svelte:436`. The same page
       with mechanism A server-rendered 13 `columnheader`, 22 `row` and 160
       `cell` roles, identical to the store `/kitchen-sink`.
    3. Inside an effect it runs once on the empty seed before the
       subscription's first emission (`['none', 'none', 'asc']`), so every
       wrapped cell renders twice on mount.
- **Conclusion:** the dual-mode core should hold **`$derived` over `fromStore`
  (mechanism A)**, not `$state` mirrors. A `$state` mirror is only viable if
  it is seeded with `get(store)` and SSR is handled separately, and at that
  point it is a hand-rolled `fromStore`.

## 3. Performance

Same machine, dev server (`vite dev`), back to back, 30 cold iterations each:
`PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1` against `/test/perf-bench`
(store, `_PerfTable.svelte` with `<Subscribe>`) and
`/test/perf-bench?renderer=runes` (mechanism A, `_PerfTableRunes.svelte`).
Both runs exited 0, n=30 per metric, `domCells` median 400 for every listed
scenario in both, and no browser or page errors were logged.

| scenario      | metric                       | store  | runes  | runes/store |
| ------------- | ---------------------------- | ------ | ------ | ----------- |
| rows1k        | firstPaintMs.median          | 85.75  | 64.2   | 0.75        |
| rows1k        | firstPaintMs.p95             | 94.6   | 68.4   | 0.72        |
| rows1k        | renderOnlyMs.median          | 84.85  | 63.3   | 0.75        |
| rows1k        | scenarioLongestTaskMs.median | 0      | 0      | n/a         |
| rows10k       | firstPaintMs.median          | 195.15 | 187.05 | 0.96        |
| rows10k       | firstPaintMs.p95             | 212    | 220.9  | 1.04        |
| rows10k       | renderOnlyMs.median          | 194.8  | 186.8  | 0.96        |
| rows10k       | scenarioLongestTaskMs.median | 0      | 0      | n/a         |
| sortCycle1k   | firstPaintMs.median          | 52.9   | 44.65  | 0.84        |
| sortCycle1k   | firstPaintMs.p95             | 58     | 47.6   | 0.82        |
| sortCycle1k   | renderOnlyMs.median          | 52.75  | 44.5   | 0.84        |
| sortCycle1k   | scenarioLongestTaskMs.median | 0      | 0      | n/a         |
| kitchenSink1k | firstPaintMs.median          | 69.5   | 58.7   | 0.84        |
| kitchenSink1k | firstPaintMs.p95             | 76.4   | 66.1   | 0.87        |
| kitchenSink1k | renderOnlyMs.median          | 69.05  | 58.15  | 0.84        |
| kitchenSink1k | scenarioLongestTaskMs.median | 0      | 0      | n/a         |

Extra context from the same files: sortCycle1k `interactionPaintMs` median
80.8 (store) vs 60.15 (runes), p95 95.6 vs 70. Derivation `timeTotalMs`
median: rows10k 71.75 vs 60.4, sortCycle1k 12.2 vs 5.8.

- **No scenario is more than 10% slower at the median.** The runes renderer
  is 4–25% faster at the median everywhere. The only ratio above 1 is rows10k
  p95 (+4%), which is within noise at n=30.
- **Longest task: no conclusion.** `scenarioLongestTaskMs` is 0 at median,
  p95 and max in both runs (as is `scenarioLoafScriptMaxMs`), so the metric
  captured nothing in this headless setup.
- Caveat: the gain combines "runes instead of stores" with "no `<Subscribe>`
  component per row and cell". The spike does not separate the two.
- Absolute numbers are higher than the 2026-05-24 baseline (for example
  rows1k 85.75 vs 55.5) because a different machine and load were used. Only
  the ratios matter.

## 4. Risks found

- **TypeScript rejects the plan's field-initializer form.** svelte-check
  failed on `readonly attrs = $derived(fromStore(this.#attrsStore).current)`
  with "Property '#attrsStore' is used before its initialization" (TS2729).
  TypeScript does not know `$derived` is lazy. The fix is to declare the field
  and assign `this.attrs = $derived(...)` in the constructor, which Svelte
  5.56 accepts. The toolchain does **not** reject runes in `.svelte.ts`
  classes, so this is not the plan's STOP condition. Plan 002 should use the
  constructor-assignment form.
- **Typing.** Concrete `HeaderRow<Item, P>` / `DataBodyRow<Item, P>` arrays
  were not assignable to `TableComponent<unknown, AnyPlugins, ComponentKeys>`
  (svelte-check error), and typing cells that way loses `render()`. The
  prototype uses a structural `StoreBackedComponent` interface instead.
- **ESLint cannot parse `.svelte.ts` in this repo.** `trunk check` reported
  `runesComponent.svelte.ts:9:13 Parsing error: Unexpected token {` (on
  `import type`). `eslint-plugin-svelte`'s recommended config handles
  `*.svelte.ts`, but `eslint.config.mjs` sets `parserOptions.parser: ts.parser`
  only for `files: ['**/*.svelte']`, so TypeScript syntax in `.svelte.ts`
  fails to parse. The spike suppresses this with a file-level
  `// trunk-ignore-all(eslint)`, because the config is out of scope. **Plan
  002 must add `**/*.svelte.ts` to that override** before moving library
  files to `.svelte.ts`. Otherwise every such `src/lib` file goes unlinted.
- **svelte-check warnings.** None came from the prototype. `_PerfTableRunes.svelte`
  repeats the existing `_PerfTable.svelte` `state_referenced_locally` warning
  on `const { ... } = vm`. Final `pnpm check`: 0 errors, 4 warnings, all of
  that kind or the pre-existing kitchen-sink a11y ones.
- **SSR.** Mechanism A SSR-renders correctly. Mechanism B returns 500 (see
  §2).
- **Hook re-application / staleness.** Wrappers capture `component.attrs()` at
  construction, which is a `derived` over the hook stores present at that
  moment. `injectedRows` calls `applyHook` again on the same instances when
  it re-runs. Long-lived wrappers would then read stale hook stores. The
  spike avoids this by rebuilding wrappers on every re-emission. The cost is
  O(rows × cells) wrapper and `derived` allocations per emission, but it is
  still faster than `<Subscribe>` per the table. Not tested in isolation.
- **Allocation in A.** `fromStore(...)` is recreated each time the `$derived`
  re-evaluates, plus a fresh `createSubscriber`. The perf data does not show
  this as a problem, but a core implementation should cache the store adapter
  per hook version.
- **Tooling.** `pnpm perf:bench > file` does not produce pure JSON: stdout
  mixes pnpm's banner and per-iteration progress logs with the final JSON,
  which comes after a `=== JSON ===` line. The JSON was extracted from after
  that marker. Raw logs are at `/tmp/store.raw.txt` and `/tmp/runes.raw.txt`.

## 5. Recommendation for plan 002

- **Mechanism:** A, meaning a `$derived` over `fromStore` of the merged hook
  store, owned by the component class in a `.svelte.ts` file, with the
  `$derived` assigned in the constructor. Do not use `$state` mirrors.
- **Naming:** `component.current.attrs` / `component.current.props`, kept
  alongside `attrs()` / `props()` for the dual-mode major.
- **Split:** keep "TableComponent → cells/rows → createViewModel" as it is,
  with two changes:
    1. `applyHook` must invalidate `current`, for example by bumping a
       `$state` version that the `$derived` reads so it rebuilds the merged
       store, so `current` never serves stale hook stores after `injectedRows`
       re-runs.
    2. The subclass `role` / `colspan` decoration (`headerCells.ts:93-101`,
       `bodyCells.ts:52-59`, `bodyRows.ts:63-70`, `headerRows.ts:69-76`)
       should become a plain function applied to the merged attrs. Then both
       the store and runes paths share it, without another `derived` layer
       per cell.
- Plan 002 should delete `src/routes/test/runes-spike/`,
  `src/routes/test/runes-kitchen-sink/` and `_PerfTableRunes.svelte` (or
  repoint the latter to the real API) once the core has its own tests.
  Before merging, add an SSR test using `render` from `svelte/server`, since
  SSR was the deciding failure here.
