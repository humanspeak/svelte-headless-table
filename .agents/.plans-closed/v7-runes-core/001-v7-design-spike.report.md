# Plan 001 report: v7 design spike

Executed on `feat/v7-runes-core` at `779c6a1` (in-scope source unchanged since
`1d80d78`; the drift check printed nothing), Svelte **5.57.1**. Spike code:
`src/routes/test/v7-spike/` (`reactivity.svelte.ts`, `spikeComponent.svelte.ts`,
`spikeViewModel.svelte.ts`, `spike.test.ts`, `SpikeHost.test.svelte`,
`+page.svelte`). Bench renderer: `src/routes/test/perf-bench/_PerfTableSpike.svelte`,
selected with `/test/perf-bench?renderer=spike`.

## 1. Verbatim results

### Step 4 unit tests

Command: `npx -y pnpm@11.24.0 exec vitest run src/routes/test/v7-spike`
(timings stripped)

```text
 RUN  v4.1.11 /home/jason-kummerl/GitHub/svelte-headless-table
stderr | src/routes/test/v7-spike/spike.test.ts > view model created inside a transient $effect.root is not inert after the root is destroyed
[svelte] derived_inert
Reading a derived belonging to a now-destroyed effect may result in stale values
https://svelte.dev/e/derived_inert
[svelte] derived_inert
Reading a derived belonging to a now-destroyed effect may result in stale values
https://svelte.dev/e/derived_inert
 ✓ src/routes/test/v7-spike/spike.test.ts > renders on first paint
 ✓ src/routes/test/v7-spike/spike.test.ts > sort toggles re-render through current.props
 ✓ src/routes/test/v7-spike/spike.test.ts > pagination clamps pageIndex when pageSize grows
 ✓ src/routes/test/v7-spike/spike.test.ts > preSortedRows reflects the upstream getter without writes
 ✓ src/routes/test/v7-spike/spike.test.ts > view model created OUTSIDE any component still works for plain reads
 ✓ src/routes/test/v7-spike/spike.test.ts > view model created inside a transient $effect.root is not inert after the root is destroyed
 ✓ src/routes/test/v7-spike/spike.test.ts > hook applied after current was first read is visible
 Test Files  1 passed (1)
      Tests  6 passed | 1 expected fail (7)
```

- Test 6 is `test.fails`, as the plan allows. It is a real failure: see §3.
- Test 5 (vm built and read outside any component) passed. It logged no
  `effect_orphan`, `derived_references_self` or `state_unsafe_mutation`, so
  that STOP condition did not fire.
- Test 7 does not match the plan's wording exactly. See §4 for what it asserts
  and why.

Full suite: `npx -y pnpm@11.24.0 exec vitest run` →
`Test Files  59 passed (59)` / `Tests  614 passed | 1 expected fail (615)`
(608 existing + 7 spike).

### SSR probe

With `npx -y pnpm@11.24.0 dev --port 8417` running:

- `curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8417/test/v7-spike` → `HTTP 200`
- `curl -s http://localhost:8417/test/v7-spike | grep -c '<td'` → `1`. The
  whole table is on one line, so `grep -c` counts lines, not cells.
- `curl -s http://localhost:8417/test/v7-spike | grep -o '<td' | wc -l` → `6`
  (3 rows x 2 cells).

The server HTML contains `pageRows: 3` and `first cell: Ada`. The initial
`name asc` sort was applied on the server, and every cell has
`<td role="cell">`.

## 2. Bench (n=30 cold iterations per renderer, dev server, back to back)

The commands were the plan's, using the default URL and then
`?renderer=spike`. All four runs exited 0 and logged no page errors.
Final files: `/tmp/current.json` and `/tmp/spike.json`. `perf:bench` stdout
mixes progress logs with the JSON, so the JSON was taken from after the
`=== JSON ===` marker. Raw logs: `/tmp/current.raw.txt` and `/tmp/spike.raw.txt`.

**Run 2 (final: `/tmp/current.json` vs `/tmp/spike.json`, spike using the v6 comparator):**

| scenario    | metric             | current median | current p95 | spike median | spike p95 | spike/current |
| ----------- | ------------------ | -------------- | ----------- | ------------ | --------- | ------------- |
| rows1k      | firstPaintMs       | 64.2           | 77.7        | 45.35        | 48.4      | 0.71          |
| rows10k     | firstPaintMs       | 203.75         | 227.7       | 98.35        | 123.5     | **0.48**      |
| rows10k     | renderOnlyMs       | 203.2          | 227.4       | 97.9         | 123       | 0.48          |
| columns50   | firstPaintMs       | 76.8           | 86.4        | 59.05        | 70.8      | 0.77          |
| sortCycle1k | firstPaintMs       | 42.15          | 48.1        | 32.9         | 37.3      | 0.78          |
| sortCycle1k | interactionPaintMs | 61.05          | 68.6        | 78.65        | 96.7      | **1.29**      |

**Run 1 (`/tmp/current.run1.json` vs `/tmp/spike.run1.json`; the spike sorted strings with `localeCompare`):**

| scenario    | metric             | current median | current p95 | spike median | spike p95 | spike/current |
| ----------- | ------------------ | -------------- | ----------- | ------------ | --------- | ------------- |
| rows1k      | firstPaintMs       | 60.05          | 77.1        | 42.5         | 50.6      | 0.71          |
| rows10k     | firstPaintMs       | 198.75         | 217.9       | 85.1         | 121       | 0.43          |
| columns50   | firstPaintMs       | 78.5           | 86.4        | 61.4         | 69.5      | 0.78          |
| sortCycle1k | firstPaintMs       | 42.15          | 45.6        | 33.95        | 38.9      | 0.81          |
| sortCycle1k | interactionPaintMs | 60.5           | 69.3        | 80.35        | 91.2      | 1.33          |

`domCells` medians are the same for the two renderers in every scenario, in
both runs: rows1k 400, rows10k 400, columns50 1250, columnReorder1k 500,
groupBy1k 24, sortCycle1k 400, subrowsTree1k 350, kitchenSink1k 400.

How to read these numbers:

- **`pageCycle` does not exist.** Neither `scripts/perf-bench.mjs` nor the
  page has a page-cycle preset. The bench script is out of scope, so no preset
  was added. Pagination is exercised on cold mount in every spike scenario
  (page size 50 or 25), but nothing measures a page change.
- **Where the spike renders.** It only models sort, pagination and a
  pass-through table filter. It renders rows1k, rows10k, columns50 and
  sortCycle1k. Every other preset falls back to the default renderer, so that
  `domCells` stays the same. I checked this in a browser: the
  `table[data-renderer="spike"]` marker is present on rows-10k and
  sort-cycle-1k and absent on group-by-1k. In the sort cycle, both renderers
  end with the same row order.
- **Noise level.** The fallback scenarios run identical code under both URLs,
  yet medians moved by up to +34% (columnReorder1k 38.6 → 51.8, kitchenSink1k
  51.6 → 66.85 in run 2). Differences under roughly 35% in a single scenario
  are not meaningful here. The rows10k gap (0.43–0.48, both runs) is well
  outside that.
- **The spike does less work than v6.** It has no `Readable` per hook, no
  `derivationCalls` instrumentation (`timeTotalMs` = 0), and its filter
  stand-in returns early on an empty value. The rows10k number bounds the
  mechanism cost. It does not promise the same win from plan 002's full
  implementation.
- The lazy-`$derived` variant was **not** built. The memo-free rows10k median
  is 52% faster, not more than 10% slower, so the plan's trigger for that
  variant did not fire.

## 3. Decisions

- **Component memoisation: memo-free.** The rows10k first-paint median was
  98.35 ms memo-free vs 203.75 ms for the current renderer (0.48x, run 2;
  0.43x in run 1), so no lazy `$derived` or cache is needed on rows and cells.
- **Ownership rule for `createViewModel` and plugin factories.** Create them
  in a component `<script>`, at module or test top level, or in a load
  function, but never inside a transient `$effect` or `$effect.root` that is
  destroyed before the view model is dropped. Test 5 shows that unowned
  deriveds recompute correctly on plain reads. Test 6 (`test.fails`) shows
  that deriveds owned by a destroyed root keep their last value (Svelte warns
  `derived_inert`). Plan 002 should document this rule. If it must support
  that case, the options are for `createTable` to build its deriveds
  unowned, or to run inside a long-lived `$effect.root` that it owns. The
  spike did not try either.
- **The three plugin patterns are confirmed.**
    - Getter chain (`deriveRows: (rows) => () => sorted`): tests 2 and 5.
    - Captured-upstream "pre-X" boxes (`preSortedRows`, `prePaginatedRows`):
      test 4.
    - Clamp-at-read `pageIndex`, which stores the raw value and clamps in the
      getter: test 3.

    None of them wrote state during derivation, and no
    `state_unsafe_mutation` was logged. One amendment: a `derivedBox` over a
    captured-upstream getter only tracks correctly once the view model has
    called the derive function. See §4.

- **`Box` / `ReadonlyBox` / `keyedBox` shape: confirmed as written.** Every
  plugin state in the spike (`sortKeys`, `pageSize`, `pageIndex`,
  `pageCount`, the "pre-X" boxes) fits `Box` or `ReadonlyBox`, and
  `sortKeys.toggleId` sits on a `Box` without trouble. `keyedBox` compiles
  and type-checks, but no spike test exercises it: the spike has no
  per-column record state.

## 4. Surprises

- **A late `applyHook` does not re-render by itself.**
  `src/routes/test/v7-spike/spikeComponent.svelte.ts:43,50`.
    - Why: the hooks record is plain, because `applyHook` runs inside the
      `injectedRows` `$derived.by`
      (`src/routes/test/v7-spike/spikeViewModel.svelte.ts:272-278`), where
      writing `$state` would throw `state_unsafe_mutation`.
    - What still works: the next plain read of `current.attrs` sees the new
      hook, since there is no stale cache (the property the v6 test guards).
    - What doesn't: a rendered cell shows the hook only when its template
      effect next re-runs.
    - A literal port of the v6 DOM test (`applyHook`, `tick()`, expect the
      attribute) failed with `data-late` = `null`.
    - `spike.test.ts:120` therefore asserts three things instead: plain read
      visible, DOM not updated after `tick()`, and DOM updated after the next
      sort toggle.
    - Implication for plan 002: make `applyHook` internal to derivation. If
      it stays public, document that it does not notify renders.
- **Sort interaction is slower in the spike** (sortCycle1k
  `interactionPaintMs` 1.29x in run 2, 1.33x in run 1), even though cold
  paint is faster.
    - Run 1 used `localeCompare`. Switching to v6's `<`/`>` comparator
      (`spikeViewModel.svelte.ts` `compareValues`) did not remove the gap.
    - Not investigated. The likely cause (unverified) is that each sort
      re-applies fresh hook objects and closures to every row and cell
      (`spikeViewModel.svelte.ts:278`). v6 shares one td props store per
      column (`src/lib/plugins/addSortBy.ts` `tdPropsCache`).
    - The mirror from the scenario's `sortKeys` store into the spike box
      (`_PerfTableSpike.svelte`) adds one hop, which may also contribute.
    - Plan 002 should re-bench sortCycle1k: apply hooks once per row and cell
      identity, not on every re-derivation.
- **A captured-upstream getter is a plain `let`, not a signal.**
  `spikeViewModel.svelte.ts:184,190,207`. `pageCount` is a `derivedBox` that
  reads `prePaginatedRows.current`. If it were first read before
  `derivePageRows` captured the upstream, it would evaluate with no
  dependencies. Plan 002 should build the chain before exposing
  `pluginStates`, as the spike does. This is inferred from the code, not
  tested.
- **`$effect.root` cannot be written in a plain `*.test.ts` file**, because
  runes are only valid in `.svelte`/`.svelte.ts`. Test 6 goes through a small
  `inTransientRoot` helper (`spikeViewModel.svelte.ts:341`). Plan 002's
  ownership tests will need the same helper or a `.svelte.ts` host.
- **Object spread evaluates getters.** The first draft spread
  `{ component, get current() {...} }` into each cell. Spreading copies the
  value at spread time, which built the view object eagerly for every one of
  the 80k cells. Rows and cells now get `current` through
  `Object.defineProperty` (`spikeViewModel.svelte.ts:68`). Plan 002 should
  use classes or explicit getters, never spreads.
