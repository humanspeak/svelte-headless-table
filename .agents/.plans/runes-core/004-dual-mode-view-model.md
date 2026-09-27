# Plan 004: Expose the view model's rows, columns and table attrs as runes (`vm.current.*`) beside the stores

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/runes-core/README.md` — unless a reviewer dispatched you
> and told you they maintain the index.
>
> **Read first**: `.agents/.plans/runes-core/001-runes-spike.report.md` and `src/lib/tableComponent.svelte.ts` (plan 002's `current` implementation is the exemplar).
>
> **Revision 2026-09-27 (guard, pre-flight)**: 002 and 003 landed (c557fe5, 815c91d). The kitchen sink and `_PerfTable.svelte` already read `row.current.*` / `cell.current.*`; only their table-level `$tableAttrs` / `$pageRows` / `$headerRows` / `$tableBodyAttrs` reads remain for Step 4. `_PerfTableStore.svelte` (the `?renderer=store` control) must keep using stores — do not touch it. `svelte/require-store-reactive-access` fires on raw reads of store-typed identifiers in `.svelte.ts`; a `$derived.by(() => fromStore(store).current)` reads the store correctly, so suppress with `// trunk-ignore(eslint/svelte/require-store-reactive-access)` only where the rule misfires, as `tableComponent.svelte.ts` does.
>
> **Revision 2026-09-27 (guard, after the spike)**: the spike chose
> mechanism A (`$derived` over `fromStore(store).current`) over the
> subscriber mirror, because the mirror returns an empty seed outside
> effects and crashes SSR. Step 3 of this plan now uses mechanism A: each
> `vm.current.*` getter returns a `$derived.by(() => fromStore(store).current)`
> created inside `createViewModel` (a `.svelte.ts` function body may use
> runes). No `createSubscriber`, no `$state` mirrors, no `get(...)` seeding.
> Add an SSR test (`// @vitest-environment node`, `render` from
> `svelte/server` on the host) alongside the reactivity test.
>
> **Drift check (run first)**:
> `git diff --stat 815c91d..HEAD -- src/lib/createViewModel.ts src/lib/createTable.ts src/lib/index.ts src/lib/types src/lib/createViewModel.performance.test.ts`
> On a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED–HIGH (the file is the heart of the library; the `_debug` counters feed the perf bench and must keep their meaning)
- **Depends on**: 002-dual-mode-table-component.md, 003-fixtures-on-current.md (both DONE)
- **Category**: migration
- **Planned at**: commit `815c91d`, 2026-09-27 (re-baselined after 003)

## Why this matters

After plans 002–003 a template can read a row's attrs without stores, but it
still needs `$pageRows`, `$headerRows`, `$tableAttrs` and `$tableBodyAttrs`
from the view model, and those are stores. This plan adds `vm.current`
(`pageRows`, `rows`, `headerRows`, `visibleColumns`, `tableAttrs`,
`tableHeadAttrs`, `tableBodyAttrs`) as reactive getters over the existing
derivation chain, so a whole table can be rendered with zero store syntax:

```svelte
<table {...vm.current.tableAttrs}>
    <tbody {...vm.current.tableBodyAttrs}>
        {#each vm.current.pageRows as row (row.id)}
            <tr {...row.current.attrs}>
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}><Render of={cell.render()} /></td>
```

The store chain itself is not rewritten here: the plugin contract
(`deriveRows` etc. taking and returning `Readable`s) is unchanged, so every
plugin keeps working. The file moves to `.svelte.ts` so it can hold rune
state, and the `_debug` derivation counters keep counting the same store
derivations the perf bench already reports.

## Current state

- `src/lib/createViewModel.ts` (≈560 lines). The public interface:

```ts
// src/lib/createViewModel.ts:122-134
export interface TableViewModel<Item, Plugins extends AnyPlugins = AnyPlugins> {
    flatColumns: FlatColumn<Item, Plugins>[]
    tableAttrs: Readable<TableAttributes<Item, Plugins>>
    tableHeadAttrs: Readable<TableHeadAttributes<Item, Plugins>>
    tableBodyAttrs: Readable<TableBodyAttributes<Item, Plugins>>
    visibleColumns: Readable<FlatColumn<Item, Plugins>[]>
    headerRows: Readable<HeaderRow<Item, Plugins>[]>
    originalRows: Readable<BodyRow<Item, Plugins>[]>
    rows: Readable<DataBodyRow<Item, Plugins>[]>
    pageRows: Readable<DataBodyRow<Item, Plugins>[]>
    pluginStates: PluginStates<Plugins>
    /** Debug information for performance analysis (always available) */
    _debug: ViewModelDebug
}
```

- The chain is built from `derived(...)` calls whose bodies bump
  `derivationCalls.*` and `derivationTimings.*` (`createViewModel.ts:222-250`
  declare them; e.g. `injectedRows` at 457–477 and `headerRows` at 500–521).
  The function returns the finalised stores at 548–560.
- `_debug` is consumed by `src/routes/test/perf-bench/+page.svelte`
  (`snapshotDerivations(vm)`), `scripts/perf-bench.mjs` (`deriv*` / `time*`
  fields) and `src/lib/createViewModel.performance.test.ts`.
- Importers of `$lib/createViewModel.js` (non-test) that must move to the
  new path: `src/lib/columns.ts`, `src/lib/createTable.ts`,
  `src/lib/headerCells.ts`, `src/lib/index.ts` (`export type * from`),
  `src/lib/plugins/addColumnFilters.ts`, `src/lib/plugins/addGridLayout.ts`,
  `src/lib/tableComponent.svelte.ts`, `src/lib/types/Label.ts`,
  `src/lib/types/TablePlugin.ts`; plus 5 test files (`grep -rln "createViewModel.js" src`
  → 14 files total at plan time).
- `src/lib/createTable.ts:172-193` caches the view model per `reuseKey`/`rowDataId`;
  `vm.current` must be created inside `createViewModel` so the cache returns
  the same object.
- Exemplar for the mechanism: the `current` namespace added to
  `src/lib/tableComponent.svelte.ts` by plan 002 (mechanism A).

## Commands you will need

Same as plan 002; plus `pnpm perf:bench` (see plan 001) for the before/after.

## Scope

**In scope**:

- `src/lib/createViewModel.ts` → `git mv` to `src/lib/createViewModel.svelte.ts`, then edited
- The 14 importers (import path only)
- `src/lib/createViewModel.current.test.ts` and `src/lib/VmCurrentHost.test.svelte` (create)
- `src/routes/test/perf-bench/_PerfTable.svelte` and `src/routes/kitchen-sink/+page.svelte` (switch the table-level `$store` reads to `vm.current.*`)
- `src/lib/index.exports.test.ts` — the root snapshot must NOT change (no new root export); if it does, STOP

**Out of scope**:

- Any plugin file or `src/lib/types/TablePlugin.ts` beyond the import path — the plugin contract is not changing in this batch.
- `createTable`'s data input (`ReadOrWritable<Item[]>`) — accepting a getter is a later, breaking change.
- Rewriting the derivation chain in runes — that would change what `_debug` measures and is a separate decision after this lands.
- `docs/**`, `README.md`.

## Steps

### Step 1: Characterisation — pin the `_debug` counters

Read `src/lib/createViewModel.performance.test.ts` and add one assertion
that, for a table with `addSortBy` + `addPagination`, after `get(vm.pageRows)`
the exact `derivationCalls` object equals the values you observe now (record
them; they are the baseline this plan must not change).

**Verify**: the new assertion passes against current code.

### Step 2: Red test for `vm.current`

Create `src/lib/VmCurrentHost.test.svelte` rendering the whole table through
`vm.current.*` (snippet in "Why this matters") with `addSortBy()` and
`addPagination({ initialPageSize: 2 })` over 5 rows, exposing
`export const pluginStates = vm.pluginStates`. Create
`src/lib/createViewModel.current.test.ts` asserting: initial 2 rows; after
`pluginStates.page.pageIndex.set(1)` + `tick()` the rows change; after a
header click the order flips; `vm.current.tableAttrs.role === 'table'`.

**Verify**: `pnpm check` fails with `Property 'current' does not exist on type 'TableViewModel…'`.

### Step 3: Rename and add `vm.current`

`git mv` to `createViewModel.svelte.ts`; update the 14 importers. Inside
`createViewModel`, after the stores are built, create the mirror:

```ts
import { fromStore } from 'svelte/store'

const live = <T>(store: Readable<T>) => {
    const value = $derived.by(() => fromStore(store).current)
    return {
        get value() {
            return value
        }
    }
}
const pageRowsLive = live(injectedPageRows)
// … one per exposed store
```

and expose getters on the returned object:
`current: { get pageRows() { return pageRowsLive.value }, … }`. Add
`current` to `TableViewModel` with a `ViewModelCurrent<Item, Plugins>` type
(plain values, not `Readable`s). `fromStore` reads `get(store)` outside effects and under SSR, and subscribes
for the lifetime of the reading effect otherwise. Do not add `current` to `PluginInitTableState` or `TableState`.

**Verify**: `pnpm check` → 0 errors; `createViewModel.current.test.ts` → 4 pass;
the Step 1 counter assertion still passes (reading `vm.current.pageRows`
must not add derivation calls beyond what `$pageRows` would).

### Step 4: Fixtures

Switch the table-level reads in `_PerfTable.svelte` and the kitchen sink from
`$tableAttrs` / `$pageRows` / `$headerRows` / `$tableBodyAttrs` to `vm.current.*`
(the kitchen sink destructures stores at the top; keep `pluginStates` and
the debug panel's store reads as they are).

**Verify**: e2e chromium + mobile-chrome → all pass; `/test/perf-bench` `rows-1k` → `domCells=400`.

### Step 5: Measure and gate

Capture `PERF_BENCH_ITERATIONS=30 PERF_BENCH_COLD_ONLY=1 pnpm perf:bench > /tmp/after.json`
and compare `rows10k` / `sortCycle1k` `firstPaintMs.median` with a run from
the commit before this plan (`git stash` is not allowed; use `git worktree add /tmp/before 815c91d` and run the bench there (it needs `pnpm install --frozen-lockfile` and its own dev server on another port, e.g. `pnpm dev --port 8418`, with `PERF_BENCH_URL=http://localhost:8418/test/perf-bench`)). Then `trunk fmt`, `trunk check`, `pnpm check`, `pnpm test`, `pnpm package`.

**Verify**: all exit 0; `dist/createViewModel.svelte.js` exists; record both medians in the README row.

## Test plan

- Red-first: Step 2 typecheck failure; green after Step 3.
- New: `createViewModel.current.test.ts` (4 cases) + host; 1 counter assertion in the performance test.
- Pattern: `src/lib/fromStore.test.ts`; plan 002's `tableComponent.current.test.ts`.

## Done criteria

- [ ] `pnpm check` exits 0; `pnpm test` exits 0 with thresholds
- [ ] `test -f src/lib/createViewModel.svelte.ts && ! test -f src/lib/createViewModel.ts`; `grep -rn "createViewModel.js'" src/` → none
- [ ] `createViewModel.current.test.ts` 4 passing; Step 1 counter assertion unchanged
- [ ] `src/lib/index.exports.test.ts` snapshot unchanged
- [ ] e2e chromium + mobile-chrome exit 0
- [ ] `rows10k` `firstPaintMs.median` within 10% of the pre-plan run (numbers recorded in README)
- [ ] `git status --porcelain` lists only in-scope files; README row for 004 updated

## STOP conditions

- `$derived.by` inside the `createViewModel` function body is rejected by the compiler — report; the fallback is a small `.svelte.ts` class holding the deriveds.
- The Step 1 counter assertion changes value after Step 3 (the mirror is triggering extra derivations).
- `rows10k` median regresses by more than 10%.
- `createTable`'s cached view model returns an object without `current` (cache path missed).
- Any importer outside the 14 listed needs to change (means the excerpt is stale).

## Maintenance notes

- `vm.current` and the stores are two views over one chain; `_debug` still
  counts store derivations only. When the chain itself becomes runes (a
  later batch), the counters must be re-pointed or the perf bench loses its meaning.
- Next batch after this one: plugin contract (`deriveRows` etc. as rune-native), then `createTable(() => data)`, then deprecate `Subscribe` — each a breaking step for v7.
