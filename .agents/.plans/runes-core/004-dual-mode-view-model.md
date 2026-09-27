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
> **Revision 2026-09-27 (guard, fix round 2)**: round 1 fixed the freeze,
> but a same-machine bench against the spike commit shows rows-10k first
> paint at ~440–475 ms versus ~190–200 ms at e5fbb85, on **both**
> renderers. A microbench attributes it to construction: building 10k rows
> × 8 cells takes 390 ms now vs 103 ms at the spike, because
> `TableComponent` eagerly creates a `$state` signal and a `current` view
> object with two bound closures per instance (≈80k instances). **New
> Step 3d** makes that state lazy and prototype-based. The perf gate is
> now absolute, not relative to 815c91d: rows-10k `firstPaintMs.median`
> on the default renderer must be within 15% of the spike commit's store
> renderer measured back to back on the same machine.
>
> **Revision 2026-09-27 (guard, fix round 1)**: the first execution passed
> every gate but exposed a correctness defect: rows/cells reached through
> `vm.current.pageRows` freeze after a re-derive (`derived_inert`). Cause:
> `TableComponent.current` (plan 002) creates `$derived`s in the
> constructor, and rows are constructed inside the store chain, which now
> first runs under the transient `render_effect` that `fromStore` opens
> for the `vm.current.*` `$derived`; when that effect is torn down, the row
> deriveds go inert. **New Step 3c** replaces those constructor deriveds
> with plain getters over a `fromStore` instance cached per `#hookVersion`
> (no class-level `$derived` anywhere in `TableComponent`), and Step 3's
> `live()` helper becomes a once-per-store `fromStore` instance read by a
> getter (no `$derived.by`). `src/lib/tableComponent.svelte.ts` and
> `src/lib/tableComponent.current.test.ts` are now in scope. Step 2b adds
> the red regression test that reproduces the freeze. The WIP snapshot
> `5252d33` holds the first execution; continue from it.
>
> **Revision 2026-09-27 (guard, second pre-flight)**: the importer list was stale (counted before 002/003 landed); it is now 15 files including three type-only route imports, and `+page.svelte` / `_PerfTableStore.svelte` are in scope for that one line each. Executor correctly stopped on the count mismatch.
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
- Importers of `$lib/createViewModel.js` that must move to the new path
  (15 files at re-baseline 815c91d; verify with `grep -rln "createViewModel.js" src`):
    - library (9): `src/lib/columns.ts`, `src/lib/createTable.ts`,
      `src/lib/headerCells.ts`, `src/lib/index.ts` (`export type * from`),
      `src/lib/plugins/addColumnFilters.ts`, `src/lib/plugins/addGridLayout.ts`,
      `src/lib/tableComponent.svelte.ts`, `src/lib/types/Label.ts`,
      `src/lib/types/TablePlugin.ts`;
    - tests (3): `src/lib/bodyCells.DataBodyCell.render.test.ts`,
      `src/lib/bodyCells.DisplayBodyCell.render.test.ts`,
      `src/lib/bodyCells.HeaderCell.render.test.ts`;
    - routes (3, type-only imports of `TableViewModel`):
      `src/routes/test/perf-bench/_PerfTable.svelte`,
      `src/routes/test/perf-bench/+page.svelte`,
      `src/routes/test/perf-bench/_PerfTableStore.svelte` — for these two the
      import line is the **only** permitted change; `_PerfTableStore.svelte`
      must keep rendering through stores.
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
- The 15 importers listed in Current state (import path only; for `src/routes/test/perf-bench/+page.svelte` and `_PerfTableStore.svelte` nothing but that line)
- `src/lib/tableComponent.svelte.ts` (Step 3c only: the `current` mechanism; `attrs()`, `props()`, `applyHook`, `decorateAttrs` unchanged)
- `src/lib/tableComponent.current.test.ts` (only if an assertion must change because `current.attrs` is no longer a `$derived`; the four cases must keep passing)
- `src/lib/createViewModel.current.test.ts` and `src/lib/VmCurrentHost.test.svelte` (Step 2b adds the select plugin and the regression case)
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

### Step 2b: Red regression test for the freeze

Add `addSelectedRows()` to `VmCurrentHost.test.svelte`'s plugin map and put
`data-selected={String(row.current.props.select.selected)}` on each row.
In `createViewModel.current.test.ts` add: render the host, click the
`name` header (sort), `await tick()`, then
`pluginStates.select.selectedDataIds.set({ '0': true })`, `await tick()`,
and assert one row has `data-selected="true"`. Also assert no
`derived_inert` message was logged (spy on `console.warn`/`console.error`
for the test's duration).

**Verify**: against the WIP snapshot this test FAILS — all rows read
`data-selected="false"` and the console spy records `derived_inert`.
If it passes, the reproduction is wrong: STOP and report.

### Step 3: Rename and add `vm.current`

`git mv` to `createViewModel.svelte.ts`; update the 15 importers. Inside
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

### Step 3c: Remove constructor deriveds from `TableComponent.current`

In `src/lib/tableComponent.svelte.ts`, delete the two `$derived.by` in the
constructor and the `current` object built from them. Replace with private
cached `fromStore` handles and getters, so no reactive primitive is _owned_
by the constructing context:

```ts
#hookVersion = $state(0)
#attrsHandle?: { version: number; handle: { readonly current: Record<string, unknown> } }
#propsHandle?: { version: number; handle: { readonly current: PluginTablePropSet<Plugins>[Key] } }

readonly current = {
    attrs: (): Record<string, unknown> => { /* replaced by getter below */ }
}
```

Implement `current` as an object with `get attrs()` / `get props()` whose
bodies are:

```ts
const version = this.#hookVersion // tracked by the reading effect
if (this.#attrsHandle?.version !== version) {
    this.#attrsHandle = { version, handle: fromStore(this.attrs()) }
}
return this.#attrsHandle.handle.current // subscribes under the reader's effect
```

(and the same for `props`). `fromStore(...)` itself owns nothing: its
subscription is opened by `createSubscriber` under whichever effect reads
`.current`, and closed when that effect goes away. `applyHook` keeps
bumping `#hookVersion`. In `createViewModel.svelte.ts`, change `live()` to
create the `fromStore` handle once per store outside any derived and
return `{ get value() { return handle.current } }`.

**Verify**: `pnpm exec vitest run src/lib/createViewModel.current.test.ts src/lib/tableComponent.current.test.ts src/lib/tableComponent.ssr.test.ts src/lib/createViewModel.current.ssr.test.ts`
→ all pass, including the Step 2b case, with no `derived_inert` output;
`pnpm check` → 0 errors; `grep -n "\$derived" src/lib/tableComponent.svelte.ts src/lib/createViewModel.svelte.ts` → no matches.

### Step 3d: Make per-instance rune state lazy in `TableComponent`

Goal: constructing a row or cell must allocate nothing reactive and no
closures. Only the first read of `component.current` pays for a signal and
a view object. In `src/lib/tableComponent.svelte.ts`:

1. Replace `#hookVersion = $state(0)` with a plain `#hookVersion = 0`, and
   add `#versionSignal?: { v: number }` (undefined until first use).
2. Remove the `current` field and everything the constructor does except
   `this.id = id`.
3. Add a prototype getter:

```ts
#currentView?: { readonly attrs: Record<string, unknown>; readonly props: PluginTablePropSet<Plugins>[Key] }

/** Runes-native view of `attrs()` / `props()`; created on first access. */
get current() {
    return (this.#currentView ??= this.#createCurrentView())
}

#trackVersion(): number {
    if (this.#versionSignal === undefined) {
        const signal = $state({ v: this.#hookVersion }) // local rune declaration is allowed in a method
        this.#versionSignal = signal
    }
    return this.#versionSignal.v
}

#createCurrentView() {
    const component = this
    return {
        get attrs() {
            const version = component.#trackVersion()
            if (component.#attrsHandle?.version !== version) {
                component.#attrsHandle = { version, handle: fromStore(component.attrs()) }
            }
            return component.#attrsHandle.handle.current
        },
        get props() { /* same shape with props */ }
    }
}
```

4. In `applyHook`, after storing the hook: `this.#hookVersion += 1` and, if
   `this.#versionSignal` exists, `this.#versionSignal.v = this.#hookVersion`.

If the compiler rejects `$state` inside a method, fall back to importing
`createSubscriber`-free primitives is NOT allowed; instead declare the
signal with `$state` in a tiny standalone helper function in the same
file (`const makeVersionSignal = (v: number) => { const s = $state({ v }); return s }`)
and call that from `#trackVersion`.

**Verify (red → green)**: put this throwaway test at
`src/lib/ctorProbe.test.ts` (delete it before finishing):

```ts
import { get, readable } from 'svelte/store'
import { createTable } from '$lib/createTable.js'
import { addSortBy } from '$lib/plugins/addSortBy.js'
it('builds 10k x 8 cells', () => {
    const items = Array.from({ length: 10000 }, (_, i) => ({
        a: i,
        b: i,
        c: i,
        d: i,
        e: i,
        f: i,
        g: i,
        h: i
    }))
    const table = createTable(readable(items), { sort: addSortBy() })
    const columns = table.createColumns(
        (['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const).map((k) =>
            table.column({ header: k, accessor: k })
        )
    )
    const vm = table.createViewModel(columns)
    const t = performance.now()
    get(vm.pageRows)
    console.log('BUILD ms', (performance.now() - t).toFixed(1))
})
```

Before Step 3d it prints roughly 350–400 ms on this machine; after, it must
print under 150 ms (the spike commit measured 103 ms). Then
`pnpm exec vitest run src/lib/createViewModel.current.test.ts src/lib/tableComponent.current.test.ts src/lib/tableComponent.ssr.test.ts src/lib/createViewModel.current.ssr.test.ts`
→ all pass with no `derived_inert`.

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
- [ ] `createViewModel.current.test.ts` 5 passing (incl. the Step 2b select-after-sort case); Step 1 counter assertion unchanged
- [ ] `grep -rn "derived_inert" <full vitest output>` → no matches; `grep -n "\$derived" src/lib/tableComponent.svelte.ts src/lib/createViewModel.svelte.ts` → none
- [ ] `src/lib/index.exports.test.ts` snapshot unchanged
- [ ] e2e chromium + mobile-chrome exit 0
- [ ] `rows10k` `firstPaintMs.median` on the default renderer within 15% of the spike commit's (`e5fbb85`) **store** renderer, measured back to back on the same machine (guard's reference: 201 ms); numbers recorded in README
- [ ] the Step 3d probe prints under 150 ms after the change, and the probe file is deleted
- [ ] `git status --porcelain` lists only in-scope files; README row for 004 updated

## STOP conditions

- `$derived.by` inside the `createViewModel` function body is rejected by the compiler — report; the fallback is a small `.svelte.ts` class holding the deriveds.
- The Step 1 counter assertion changes value after Step 3 (the mirror is triggering extra derivations).
- `rows10k` first paint stays more than 15% above the spike commit's store renderer after Step 3d — report the numbers; do not tune thresholds.
- `createTable`'s cached view model returns an object without `current` (cache path missed).
- Any importer outside the 15 listed needs to change (means the excerpt is stale).

## Maintenance notes

- `vm.current` and the stores are two views over one chain; `_debug` still
  counts store derivations only. When the chain itself becomes runes (a
  later batch), the counters must be re-pointed or the perf bench loses its meaning.
- Next batch after this one: plugin contract (`deriveRows` etc. as rune-native), then `createTable(() => data)`, then deprecate `Subscribe` — each a breaking step for v7.
