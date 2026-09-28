# Plan 004: Un-park the routes, perf bench and Playwright; prove v7 is not slower than v6

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-runes-core/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> Revision 2026-09-28 (guard): the bench has no `pageCycle` preset; the
> headline scenarios are `rows-10k`, `sort-cycle-1k` and `kitchen-sink-1k`
> (the preset names the bench emits, with a `-done` suffix in the JSON).
>
> Revision 2026-09-28 (guard, after plan 003 PASS at `a52550d`): the v7
> library is complete under `src/lib`. Facts to use: `createTable(data, plugins)`
> throws on a store argument (pass an array or `() => items`); `vm._debug.derivedCount`
> replaced `derivedStoreCount`; virtual-scroll config accepts `hasMore: boolean | Box<boolean>`
> and `totalRows` / `dataOffset: number | Getter<number> | ReadonlyBox<number>`
> (a store throws); `box`, `RecordSet`, `ArraySet` are exported from the root;
> `pluginStates.sort.sortKeys` is a `SortKeys` box with `toggleId` / `clearId`,
> `pluginStates.page.pageIndex` / `pageSize` are boxes, `pageCount` /
> `hasNextPage` / `hasPreviousPage` are read-only boxes; per-row
> `getRowState(row).isSelected` / `isExpanded` are `Box<boolean>`. `PARKED.md`
> lists the remaining parked entries to remove in Step 1: the `src/routes/**`
> exclude in `tsconfig.json`, the `testIgnore` in `playwright.config.ts`, the
> `src/routes/**` ignore in `eslint.config.mjs`, and the `src/routes/**`
> coverage exclude in `vite.config.ts` if present. `Planned at` re-stamped to
> `a52550d`; the route files are unchanged since `61c36ee` except plan 001's
> spike additions under `src/routes/test/`.
>
> **Drift check (run first)**: `git diff --stat 61c36ee..HEAD -- src/routes/ tests/ playwright.config.ts scripts/`
> Only `src/routes/test/v7-spike/**` and `src/routes/test/perf-bench/**`
> should differ (plan 001). Anything else changed → compare the "Current
> state" excerpts before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 003-complex-plugins.md
- **Category**: migration (major, v7) + perf
- **Planned at**: commit `a52550d`, 2026-09-28

## Why this matters

Plans 002–003 delivered the library with the dev routes, the perf bench and
the Playwright suites parked. This plan brings them back on the v7 API,
deletes the v6 store control renderer and the plan 001 spike, and produces
the performance evidence the release needs: v7 must be at least as fast as
v6.5 on the rows-10k, sort-cycle-1k and kitchen-sink-1k presets, measured back to
back on the same machine. Without that number the "runes are faster"
claim in the release notes would be a guess.

## Current state

- `.agents/.plans/v7-runes-core/PARKED.md` (from plan 002/003) lists:
  `src/routes/**` (excluded via `"exclude": ["src/routes/**"]` in
  `tsconfig.json`), Playwright (`testIgnore: ['**/*']` in
  `playwright.config.ts`).
- Routes (all use the v6 store API for data and plugin state):
    - `src/routes/kitchen-sink/+page.svelte` — every plugin; `createTable(data, ...)` with a `writable` from `_createSamples.ts`; ~18 `$store` / `pluginStates.` reads; a debug panel reading `vm._debug.derivationCalls` and `derivedStoreCount` (the Playwright test `tests/performance.test.ts:135` "debug panel shows correct plugin count" asserts on it). URL params `?seed&rows&subrows` drive the samples.
    - `src/routes/virtual-scroll/+page.svelte` (`hasMore = writable(true)`, line 86; `createTable(data, ...)` line 94; two `<Subscribe attrs=... let:attrs>` blocks at lines 291–338 with `cell.current.props.sort` already used inside) and `src/routes/virtual-scroll-sparse/+page.svelte` (`datasetRows = writable(DATASET_SIZE)`, `dataOffset = writable(0)`, lines 53–54; `<Subscribe>` at 219–257). Both pass stores into `addVirtualScroll({ hasMore, totalRows, dataOffset })`.
    - `src/routes/test/perf-bench/+page.svelte` — presets build `writable(buildFlatRows(n))` (lines 378, 468, 560, 651, 762, 851) and read `vm._debug.derivationCalls` / `derivationTimings` / `getTotalCalls()` / `getTotalMs()` / `resetCounters()` (lines 329–341, 405, 495, ...). `?renderer=store` (line 51) swaps in `_PerfTableStore.svelte` (the `<Subscribe>` control); `_PerfTable.svelte` is the `current.*` renderer; `_PerfTableSpike.svelte` and `?renderer=spike` were added by plan 001.
    - `src/routes/+page.svelte` — index of the dev routes; `src/routes/_*.svelte` helper filters/indicators used by kitchen-sink; `_createSamples.ts` builds sample rows.
    - `src/routes/test/v7-spike/**` — the plan 001 spike (delete).
- Playwright: `tests/initial.test.ts`, `tests/performance.test.ts` (kitchen-sink at 100/1000/5000 rows, sub-rows, debug panel), `tests/virtual-scroll.test.ts` (fast scrollbar drag retains position). `playwright.config.ts` builds with `npm run build && npm run preview` on port `PLAYWRIGHT_PORT` (default 4173); locally `PLAYWRIGHT_PORT=4180` avoids another project on 4173. Chromium + Firefox pass on v6.5 (36 passed, 2 skipped).
- Bench: `scripts/perf-bench.mjs` (`pnpm perf:bench`; env `PERF_BENCH_URL`, `PERF_BENCH_ITERATIONS`, `PERF_BENCH_COLD_ONLY`), `scripts/perf-baseline.json` (v6-era baseline). Dev server for the bench: `npx -y pnpm@11.24.0 dev --port 8417`.
- v7 API (plans 002–003): `createTable(data: Item[] | (() => Item[]), plugins)` (a store argument throws); `vm.current.{tableAttrs,tableHeadAttrs,tableBodyAttrs,visibleColumns,headerRows,originalRows,rows,pageRows}`; `row.current.attrs/props`, `cell.current.attrs/props`; plugin state via `.current` (`pluginStates.page.pageIndex.current = 2`), `RecordSet` / `ArraySet` methods; `vm._debug.derivedCount` (renamed from `derivedStoreCount`, same keys); no `Subscribe`, no `fromStore` needed.

## Commands you will need

| Purpose       | Command                                                                                                                                                                                                                       | Expected on success                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Typecheck     | `npx -y pnpm@11.24.0 check`                                                                                                                                                                                                   | two `COMPLETED ... 0 ERRORS` lines      |
| Unit tests    | `npx -y pnpm@11.24.0 test`                                                                                                                                                                                                    | all pass, thresholds met                |
| Lint / format | `trunk check --no-progress` / `trunk fmt`                                                                                                                                                                                     | `✔ No issues`                           |
| Dev server    | `npx -y pnpm@11.24.0 dev --port 8417`                                                                                                                                                                                         | routes render                           |
| e2e           | `PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line`                                                                                                                               | `36 passed`, `2 skipped` (same as v6.5) |
| Bench         | `PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 npx -y pnpm@11.24.0 perf:bench > /tmp/v7.json`                                                                                                                               | JSON aggregates                         |
| v6 baseline   | `git worktree add /tmp/shd-v6 origin/main && (cd /tmp/shd-v6 && npx -y pnpm@11.24.0 install --frozen-lockfile && npx -y pnpm@11.24.0 dev --port 8418)` then bench with `PERF_BENCH_URL=http://localhost:8418/test/perf-bench` | `/tmp/v6.json`                          |

`pnpm` runs as `npx -y pnpm@11.24.0`; shim on PATH before committing.

## Scope

**In scope**:

- `src/routes/**` (all files listed above), `tsconfig.json` (remove the route exclude), `playwright.config.ts` (remove `testIgnore`), `eslint.config.mjs` (remove the `src/routes/**` ignore), `vite.config.ts` (remove any route coverage exclude added by parking), `tests/**` only where an assertion names a renamed debug field
- `src/routes/test/perf-bench/_PerfTableStore.svelte` (delete), `_PerfTableSpike.svelte` (delete), `src/routes/test/v7-spike/**` (delete)
- `scripts/perf-baseline.json` (replace with the v7 run) and a new `scripts/perf-v6-vs-v7.md` (the comparison table)
- `.agents/.plans/v7-runes-core/PARKED.md` (delete when empty)

**Out of scope** (do NOT touch):

- `src/lib/**` — if a route cannot be written against the v7 API without a library change, STOP and report; the API gap is a plan 002/003 defect.
- `docs/**`, `README.md`, `package.json` version.

## Git workflow

- Branch: `feat/v7-runes-core`; commits per route group, e.g. `refactor(routes)!: kitchen-sink on the v7 API`, `perf: v6 vs v7 bench comparison`. End messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR.

## Steps

### Step 1: Un-park

Remove `"src/routes/**"` from `exclude` in `tsconfig.json` and the
`testIgnore` line from `playwright.config.ts`. Run `npx -y pnpm@11.24.0 check`
and record the error count for the routes (expected: many; they are the work
list for Steps 2–4).

**Verify**: the check output lists errors only under `src/routes/`.

### Step 2: kitchen-sink

- Data: hold the sample rows in `let items = $state(buildSamples(...))` and
  pass `createTable(() => items, plugins)`; the "regenerate" controls assign
  `items = ...`.
- Plugin state: `$sortKeys` → `pluginStates.sort.sortKeys.current`;
  `$pageIndex` / `pageIndex.set(n)` → `.current` reads/writes;
  `selectedDataIds` → `RecordSet` (`.current`, `.has`);
  `groupByIds` → `ArraySet`; `filterValues` / `filterValue` → `.current`;
  `hiddenColumnIds`, `columnIdOrder`, `depth`, `columnWidths` → `.current`;
  `expandedIds` → `RecordSet`. Per-row `getRowState(row).isSelected` is a
  `Box<boolean>`: `bind:checked` is not possible on a getter/setter pair
  from a `{#each}` — use `checked={state.isSelected.current}` + `onchange={(e) => (state.isSelected.current = e.currentTarget.checked)}`
  (same pattern for expanded rows). The helper components
  `_SelectIndicator.svelte`, `_ExpandIndicator.svelte`, `_TextFilter.svelte`,
  `_NumberRangeFilter.svelte`, `_SelectFilter.svelte` take boxes instead of stores.
- Debug panel: `derivedStoreCount` → `derivedCount`; keep the plugin count
  text the Playwright test reads (`tests/performance.test.ts:135` — open it
  and keep the exact label).
- Header: `data-order`, sort/group toggles already read `current.props`.

**Verify**: `npx -y pnpm@11.24.0 check` → no errors under `src/routes/kitchen-sink/` or `src/routes/_*.svelte`; with the dev server, `curl -s 'http://localhost:8417/kitchen-sink?seed=12345&rows=4&subrows=false' | grep -c '<td'` > 0.

### Step 3: virtual-scroll routes

- `hasMore = box(true)` (import `box` from `$lib/index.js`), `datasetRows = box(DATASET_SIZE)`, `dataOffset = box(0)`; pass them to `addVirtualScroll({ hasMore, totalRows: datasetRows, dataOffset })` (plan 003 accepts boxes).
- Replace the four `<Subscribe attrs={...} let:attrs>` blocks with
  `{...headerRow.current.attrs}` / `{...cell.current.attrs}` / `{...row.current.attrs}`;
  the props reads are already on `current`.
- `$topSpacerHeight` etc. → `pluginStates.virtual.topSpacerHeight.current`;
  `use:virtualScroll`, `use:measureRowAction={row.id}` unchanged.
- The inline "code sample" strings shown on the page (e.g. line 369 of
  `virtual-scroll/+page.svelte`) must show the v7 idiom.

**Verify**: `npx -y pnpm@11.24.0 check` → 0 errors; `curl -s http://localhost:8417/virtual-scroll | grep -c '<td'` > 0 and the same for `/virtual-scroll-sparse`.

### Step 4: perf bench

- Each preset: `let items = $state(buildFlatRows(n))` is not needed — the
  presets build data once per run; pass the array directly:
  `createTable(buildFlatRows(10_000), plugins)`. Presets that mutate data
  during the run (check `dataMutate`-style presets) keep a `$state` array.
- `_debug.derivationCalls` / `derivationTimings` / `getTotalCalls` /
  `getTotalMs` / `resetCounters` are unchanged; `derivedStoreCount` → `derivedCount`.
- Delete `_PerfTableStore.svelte`, `_PerfTableSpike.svelte`, the
  `?renderer=` switch (line 49–51) and its comment; `_PerfTable.svelte` is
  the only renderer. Delete `src/routes/test/v7-spike/` entirely.
- Update the header comment of `+page.svelte` (lines 10–30) that documents
  the `_debug` surface.

**Verify**: `npx -y pnpm@11.24.0 check` → 0 errors; `npx -y pnpm@11.24.0 test` → all pass (the spike tests are gone; note the new total); `ls src/routes/test/v7-spike` → no such directory.

### Step 5: Playwright

Run Chromium + Firefox against the built preview on port 4180. Fix route
markup only (never the tests' expectations) until the counts match v6.5:
36 passed, 2 skipped. If a test asserts a v6-only detail (e.g. text from
`derivedStoreCount`), update that assertion and say so in the commit.

**Verify**: `PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line 2>&1 | tail -3` → `36 passed`, `2 skipped`, `0 failed`.

### Step 6: Bench v6 vs v7

1. Start the v7 dev server on 8417 from the branch.
2. Create a v6 worktree from `origin/main` and start its dev server on 8418 (see Commands).
3. Run the bench three times each, alternating (v7, v6, v7, v6, v7, v6), 30 cold iterations per run: `/tmp/v7-{1,2,3}.json`, `/tmp/v6-{1,2,3}.json`.
4. Write `scripts/perf-v6-vs-v7.md`: per scenario (`rows-10k`, `sort-cycle-1k`, `kitchen-sink-1k`, and every other preset the bench emits) the median-of-medians and p95 for v6 and v7, the ratio, Svelte version (`node -p "require('svelte/package.json').version"`), machine note, date. Replace `scripts/perf-baseline.json` with `/tmp/v7-2.json` (the middle run).
5. Remove the worktree: `git worktree remove /tmp/shd-v6`.

**Verify**: the markdown table exists; for `rows-10k`, `sort-cycle-1k` and `kitchen-sink-1k` the v7 median-of-medians is ≤ 1.05 × v6. If a scenario is slower than that, do not tune blindly: record the `_debug.derivationTimings` breakdown for both versions in the report and STOP (see conditions).

### Step 7: Full gate

```sh
trunk fmt && trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
npx -y pnpm@11.24.0 package
PLAYWRIGHT_PORT=4180 npx playwright test --project=chromium --project=firefox --reporter=line | tail -3
rm .agents/.plans/v7-runes-core/PARKED.md   # nothing is parked any more
```

## Test plan

- No red-first test: this plan migrates demo routes and tooling; the
  Playwright suites are the characterization tests and must pass with the
  same counts as v6.5.
- New: none in `src/lib`. The bench comparison document is the deliverable
  that plan 006 cites in the release notes.

## Done criteria

- [ ] `tsconfig.json` has no `src/routes` exclude; `playwright.config.ts` has no `testIgnore`
- [ ] `npx -y pnpm@11.24.0 check` exits 0 with routes included
- [ ] `npx -y pnpm@11.24.0 test` exits 0, thresholds met
- [ ] Playwright Chromium + Firefox: 36 passed, 2 skipped, 0 failed
- [ ] `grep -rn "Subscribe\|svelte/store" src/routes` returns nothing
- [ ] `src/routes/test/v7-spike` and `_PerfTableStore.svelte` / `_PerfTableSpike.svelte` are gone
- [ ] `scripts/perf-v6-vs-v7.md` exists; v7 ≤ 1.05 × v6 on rows-10k, sort-cycle-1k, kitchen-sink-1k
- [ ] `PARKED.md` deleted; README status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A route needs an API the library does not expose (e.g. a plugin state
  member that plan 002/003 dropped). Report the member and the file.
- A Playwright test fails on behaviour (not markup), e.g. sort order or
  virtual-scroll position retention.
- v7 is more than 5 % slower than v6 on any of the three headline
  scenarios after three alternating runs. Include both `derivationTimings`
  breakdowns in the report.
- The v6 worktree fails to install or start (`node_modules` or port clash);
  do not benchmark v7 alone and call it a comparison.

## Maintenance notes

- `scripts/perf-v6-vs-v7.md` is a one-off artefact for the v7 release; the
  ongoing baseline is `scripts/perf-baseline.json`.
- The kitchen-sink page is the only place that exercises all 15 plugins in
  one template; keep it on the idiomatic v7 shapes because the Playwright
  suites and the docs "kitchen sink" demo are modelled on it.
