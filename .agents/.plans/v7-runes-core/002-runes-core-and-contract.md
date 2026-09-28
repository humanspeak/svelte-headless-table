# Plan 002: Replace the store core with runes and ship the v7 plugin contract (core + 11 plugins)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/v7-runes-core/README.md`) — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **Read first**: `.agents/.plans/v7-runes-core/001-v7-design-spike.report.md`.
> Its "Decisions" section overrides the defaults stated in this plan where
> they differ (component memoisation, ownership rule, box shape).
>
> Revision 2026-09-28 (guard, after plan 001 PASS at `6a992eb`): (a) the
> ownership rule is binding — never build a view model or plugin instance
> inside a transient `$effect` / `$effect.root` that is destroyed before the
> view model is dropped (deriveds go `derived_inert`); the `withEffectRoot`
> test helper must therefore only _observe_ an already-built view model,
> never construct one. (b) A hook applied after `current` was first read is
> visible to the next plain read but does not re-render the DOM by itself:
> Step 6 no longer says "keep the v6 test" — hooks are applied only inside
> the view model's derivations, `applyHook` becomes `@internal`, and the
> migrated test asserts the observed semantics as the spike's test 7 does.
> (c) Sort _interaction_ paint was 1.29–1.33× slower memo-free in the spike;
> Step 11 gains a bench check and permits a lazily created `$derived` for
> `current.props` if the regression survives the real implementation.
> (d) `Planned at` re-stamped to `6a992eb`; `src/lib/` is unchanged since
> `61c36ee`.
>
> **Drift check (run first)**: `git diff --stat 6a992eb..HEAD -- src/lib/`
> Files under `src/routes/test/v7-spike/` and `src/routes/test/perf-bench/`
> are expected to have changed (plan 001). If anything else under `src/lib/`
> changed, compare the "Current state" excerpts against the live code before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH (rewrites the core; the branch is intentionally partial until plan 003 lands)
- **Depends on**: 001-v7-design-spike.md (its report)
- **Category**: migration (major, v7)
- **Planned at**: commit `6a992eb`, 2026-09-28

## Why this matters

v6 is a Svelte 5 library whose internals are Svelte 3 stores: every row,
cell, header and plugin state is a `derived` / `writable`, and the runes
surface added in 6.4 (`cell.current.*`, `vm.current.*`) is a `fromStore`
adapter over that. Consumers already migrated their templates to `current.*`
(the docs, README and all 33 demos use it). v7 makes `current.*` the _only_
surface, deletes the store layer, and gives plugins a getter-based contract so
plugin authors write ordinary rune code. The maintainer decided on
2026-09-28 to ship this as a clean break (major) rather than an adapter.

This plan does the core and the eleven plugins whose state is simple. The
four plugins with imperative DOM state (group-by, selected rows, resized
columns, virtual scroll) are parked and finished in plan 003; until then the
routes and Playwright suites that use them are parked too. The library unit
suite is the gate for this plan.

## Current state

### Public surface being replaced

`src/lib/index.ts` exports (verbatim):

```ts
export * from '$lib/render/index.js'
export { default as Subscribe } from '$lib/subscribe/Subscribe.svelte'
export { createTable } from '$lib/createTable.js'
export * from '$lib/bodyCells.js'
export * from '$lib/bodyRows.js'
export * from '$lib/columns.js'
export { Table } from '$lib/createTable.js'
export type * from '$lib/createViewModel.svelte.js'
export {
    DataHeaderCell,
    FlatDisplayHeaderCell,
    FlatHeaderCell,
    GroupDisplayHeaderCell,
    GroupHeaderCell,
    HeaderCell
} from '$lib/headerCells.js'
export { HeaderRow } from '$lib/headerRows.js'
export type * from '$lib/types/Label.js'
```

`src/lib/plugins/index.ts` re-exports the 15 `add*` plugin files and
`../types/TablePlugin`.

### The core

- `src/lib/createTable.ts` (221 lines) — `class Table { data: ReadOrWritable<Item[]>; plugins }`, `createColumns`, `column`, `display`, `group`, `createViewModel(columns, options)` with a cached view model keyed by `reuseKey`. `createTable(data, plugins)` at the bottom.
- `src/lib/createViewModel.svelte.ts` (621 lines) — types `TableAttributes`, `TableHeadAttributes`, `TableBodyAttributes`, `ViewModelDebug`, `ViewModelCurrent` (line 120), `TableViewModel` (line 144), `ReadOrWritable` (170), `PluginInitTableState` (179), `TableState` (196), `CreateViewModelOptions` (211), and `createViewModel` (241). The chain, lines 400–560:

    ```ts
    let visibleColumns = flatColumns
    deriveFlatColumnsFns.forEach((fn) => {
        visibleColumns = fn(visibleColumns)
    })
    const injectedColumns = derived(visibleColumns, (v) => {
        _visibleColumns.set(v)
        return v
    })
    const columnedRows = derived([originalRows, injectedColumns], ([o, c]) =>
        getColumnedBodyRows(
            o,
            c.map((x) => x.id)
        )
    )
    let rows = columnedRows
    deriveRowsFns.forEach((fn) => {
        rows = fn(rows)
    })
    const injectedRows = derived(rows, (rowsValue) => {
        rowsValue.forEach((row) => {
            row.injectState(tableState)
            row.cells.forEach(injectCellState)
            for (const [pluginName, trHook] of trHookEntries) row.applyHook(pluginName, trHook(row))
            /* td hooks likewise */
        })
        _rows.set(rowsValue)
        return rowsValue
    })
    let pageRows = injectedRows
    derivePageRowsFns.forEach((fn) => {
        pageRows = fn(pageRows)
    })
    const injectedPageRows = derived(pageRows, (v) => {
        _pageRows.set(v)
        return v
    })
    const headerRows = derived(injectedColumns, (cols) => {
        /* getHeaderRows + injectState + thead hooks */
    })
    ```

    `tableState` (given to plugins and to labels via `injectState`) holds
    **stand-in writables** (`_rows`, `_pageRows`, `_visibleColumns`,
    `_headerRows`, `_tableAttrs`, ...) that the chain `.set()`s from inside its
    own derived callbacks (lines 286–297, 412–520). `_debug.derivationCalls` /
    `derivationTimings` are incremented inside each derived (keep these).

- `src/lib/tableComponent.svelte.ts` (205 lines) — abstract `TableComponent<Item, Plugins, Key>`: `id`, `attrsForName` / `propsForName` records of stores, `applyHook(pluginName, { props?, attrs? })`, `attrs(): Readable`, `props(): Readable`, `injectState(state)`, abstract `clone()`, `decorateAttrs`, and the `current` getter over `fromStore` handles (lines 31–125). `derivedKeys` from `utils/store.ts` merges per-plugin prop stores (line 166).
- `src/lib/bodyRows.ts`, `src/lib/bodyCells.ts`, `src/lib/headerRows.ts`, `src/lib/headerCells.ts` — subclasses. They carry no stores of their own; they call `this.label(this, this.state)` in `render()` (`bodyCells.ts:178-185`, `headerCells.ts:71-76`) where `state` is the `TableState` injected by the view model.
- `src/lib/utils/store.ts` (367 lines) — `ReadOrWritable`, `isReadable`, `isWritable`, `WritableKeys`, `ReadableKeys`, `ReadOrWritableKeys`, `DerivedKeys`, `derivedKeys`, `Undefined`, `UndefinedAs`, `ToggleOptions`, `ArraySetStore`/`arraySetStore`, `RecordSetStore`/`recordSetStore`, `withoutKey`, `withoutKeys`, `keyedProp`.
- `src/lib/subscribe/Subscribe.svelte` — `<Subscribe attrs={cell.attrs()} let:attrs>`; deleted in v7.
- `src/lib/render/Render.svelte` + `createRender.ts` — `RenderConfig` accepts `Readable<string | number>`, `ComponentRenderConfig.props` accepts `Readable<props>`, `SnippetRenderConfig.args` accepts `Readable<Args>`; `Render.svelte` normalises with `isReadable` / `readable()`. `eventHandlers` / `.on()` are `@deprecated` (lines 54, 62).
- `src/lib/types/TablePlugin.ts` (278 lines) — the contract. The parts that change:

    ```ts
    export type TablePluginInit<Item, ColumnOptions> = { pluginName: string; tableState: PluginInitTableState<Item>; columnOptions: Record<string, ColumnOptions> }
    export type TablePluginInstance<...> = {
        pluginState: PluginState
        transformFlatColumnsFn?: Readable<TransformFlatColumnsFn<Item>>   // unused by every plugin
        deriveFlatColumns?: DeriveFlatColumnsFn<Item>
        deriveRows?: DeriveRowsFn<Item>
        derivePageRows?: DeriveRowsFn<Item>
        deriveTableAttrs?: DeriveFn<TableAttributes<Item>>
        deriveTableHeadAttrs?: DeriveFn<TableHeadAttributes<Item>>
        deriveTableBodyAttrs?: DeriveFn<TableBodyAttributes<Item>>
        columnOptions?: ColumnOptions                                       // unused by every plugin
        hooks?: TableHooks<Item, TablePropSet, TableAttributeSet>
    }
    export type DeriveFlatColumnsFn<Item> = <Col extends FlatColumn<Item>>(_flatColumns: Readable<Col[]>) => Readable<Col[]>
    export type DeriveRowsFn<Item> = <Row extends BodyRow<Item>>(_rows: Readable<Row[]>) => Readable<Row[]>
    export type DeriveFn<T> = (_obj: Readable<T>) => Readable<T>
    export type ElementHook<Props, Attributes> = { props?: Readable<Props>; attrs?: Readable<Attributes> }
    ```

    Everything else in that file (`Components`, `AttributesForKey`,
    `ComponentKeys`, `NewTablePropSet`, `NewTableAttributeSet`, `TableHooks`,
    `PluginStates`, `PluginTablePropSet`, `PluginColumnConfigs`, `AnyPlugins`)
    keeps its name and shape.

### How the 15 plugins use the contract (inventory, 2026-09-28)

| Plugin                      | deriveRows | derivePageRows | deriveFlatColumns | table attrs | hooks                    | pluginState stores                                                                            | Hard parts                                                                                        |
| --------------------------- | ---------- | -------------- | ----------------- | ----------- | ------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| addColumnFilters            | ✓          |                |                   |             | th props                 | `filterValues` writable, `preFilteredRows`                                                    | `keyedProp` per column; writes inside derived; hands a per-column writable to user `render()`     |
| addColumnOrder              |            |                | ✓                 |             |                          | `columnIdOrder` writable                                                                      | none                                                                                              |
| addDataExport               |            |                |                   |             |                          | `exportedData` derived                                                                        | reads `tableState.rows` + `visibleColumns`; `get()` on display-column data stores                 |
| addExpandedRows             | ✓          |                |                   |             |                          | `expandedIds` recordSetStore; `getRowState`, `invalidate`                                     | LRU of per-row store objects; manual subscribe to clear                                           |
| addFlatten                  | ✓          |                |                   |             | td props                 | `depth` writable                                                                              | none                                                                                              |
| addGridLayout               |            |                |                   | ✓ (3)       | tr, th, tbody.tr attrs   | `{}`                                                                                          | reads `tableState.visibleColumns`                                                                 |
| addHiddenColumns            |            |                | ✓                 |             |                          | `hiddenColumnIds` writable                                                                    | none                                                                                              |
| addPagination               |            | ✓              |                   |             |                          | `pageSize` (clamped custom store), `pageIndex`, `pageCount`, `hasPreviousPage`, `hasNextPage` | `pageCount` derived clamps `pageIndex` from inside its callback; `serverItemCount` may be a store |
| addSortBy                   | ✓          |                |                   |             | th + td props            | `sortKeys` (writable + `toggleId`/`clearId`), `preSortedRows`                                 | writes inside derived; td props shared per column via MemoryCache                                 |
| addSubRows                  | ✓          |                |                   |             |                          | `{}`                                                                                          | mutates `row.subRows`                                                                             |
| addTableFilter              | ✓          |                |                   |             | td props                 | `filterValue` writable, `preFilteredRows`                                                     | hidden `tableCellMatches` recordSetStore written inside derived                                   |
| **addGroupBy** (003)        | ✓          |                |                   |             | th + td props            | `groupByIds` arraySetStore                                                                    | three hidden maps written inside derived, read by td hooks                                        |
| **addSelectedRows** (003)   |            |                |                   |             | tbody.tr props           | `selectedDataIds` recordSetStore, 4 facade stores, `getRowState`                              | `get(tableState.rows/pageRows)` inside setters                                                    |
| **addResizedColumns** (003) |            |                |                   |             | th props+attrs, td attrs | `columnWidths` keyedProp                                                                      | actions as props, window listeners, DOM measurement                                               |
| **addVirtualScroll** (003)  |            | ✓              |                   |             | tbody.tr props           | 20+ stores, 3 actions                                                                         | state in the factory closure, HeightManager, ResizeObserver, `dedupedRange` with side effects     |

`transformFlatColumnsFn` and the instance's `columnOptions` member are used
by no plugin: delete them from the contract.

### Conventions

- 4-space indent, no semicolons, single quotes; `trunk fmt` formats.
  Suppressions are `// trunk-ignore(eslint/<rule>)`, never `eslint-disable`.
- Runes only in `.svelte` / `.svelte.ts` files. The two existing
  `.svelte.ts` library files are the exemplars for module layout.
- Library sources are type-checked with `tsconfig.lib.json`
  (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); ESLint uses the
  same file for `src/lib`. Optional public options that a caller may pass as
  `undefined` are typed `foo?: T | undefined`.
- Tests: vitest + jsdom, `@testing-library/svelte`; host components named
  `*Host.test.svelte` beside the test. Exemplars: `src/lib/tableComponent.current.test.ts`,
  `src/lib/plugins/addSortBy.test.ts`, `src/lib/plugins/interactions.test.ts`.
- Coverage thresholds in `vite.config.ts` (85 % statements etc.) apply to
  `src/**/*.ts`; parked files are excluded (Step 1) so they do not count.

## Commands you will need

| Purpose        | Command                                         | Expected on success                                                  |
| -------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| Install        | `npx -y pnpm@11.24.0 install --frozen-lockfile` | exit 0                                                               |
| Typecheck      | `npx -y pnpm@11.24.0 check`                     | two `COMPLETED ... 0 ERRORS` lines                                   |
| Unit tests     | `npx -y pnpm@11.24.0 exec vitest run src/lib`   | all pass                                                             |
| Full unit gate | `npx -y pnpm@11.24.0 test`                      | all pass, coverage thresholds met                                    |
| Lint / format  | `trunk check --no-progress` / `trunk fmt`       | `✔ No issues`                                                        |
| Package        | `npx -y pnpm@11.24.0 package`                   | publint `All good!`; `grep -l '\$state(' dist/*.svelte.js` non-empty |

`pnpm` is invoked as `npx -y pnpm@11.24.0`; put `/tmp/pnpm-shim/pnpm` (a
one-line wrapper around that) on PATH before committing so the husky hook
finds it (see plan 001, "Commands").

## Scope

**In scope**:

- `src/lib/reactivity.svelte.ts` (create) — `Box`, `ReadonlyBox`, `Getter`, `box`, `derivedBox`, `keyedBox`, `RecordSet`, `ArraySet`
- `src/lib/types/TablePlugin.ts` — new contract
- `src/lib/createTable.ts`, `src/lib/createViewModel.svelte.ts`, `src/lib/tableComponent.svelte.ts`
- `src/lib/bodyRows.ts`, `src/lib/bodyCells.ts`, `src/lib/headerRows.ts`, `src/lib/headerCells.ts` (only where they touch `TableState` / `applyHook` / `attrs()` / `props()`)
- `src/lib/render/createRender.ts`, `src/lib/render/Render.svelte`, `src/lib/render/index.ts`
- `src/lib/index.ts`, `src/lib/plugins/index.ts`
- `src/lib/utils/store.ts` (delete), `src/lib/subscribe/` (delete), `src/lib/fromStore.test.ts` (delete)
- The 11 plugins listed as non-bold in the inventory: rename each `addX.ts` → `addX.svelte.ts` (`git mv`) and rewrite; their `addX.test.ts` files
- Parking only (Step 1): `tsconfig.lib.json`, `tsconfig.json`, `vite.config.ts` (test include/exclude), `playwright.config.ts` (`testIgnore`), `src/routes/**`
- Core tests: every `src/lib/*.test.ts` and `*.test.svelte` that references stores, `Subscribe`, `attrs()`, `props()`, `fromStore`

**Out of scope** (do NOT touch):

- `src/lib/plugins/addGroupBy.ts`, `addSelectedRows.ts`, `addResizedColumns.ts`, `addVirtualScroll.ts`, `addVirtualScroll.types.ts`, `src/lib/utils/HeightManager.ts`, `src/lib/utils/scrollAlign.ts` and their tests — plan 003. Park them; do not edit them.
- `src/routes/**` beyond the parking exclusion — plan 004.
- `docs/**`, `README.md` — plan 005.
- `package.json` version / `exports` — plan 006.

## Git workflow

- Branch: `feat/v7-runes-core` (created by plan 001).
- One commit per step below; conventional commits, scope `core` or the plugin name, e.g. `feat(core)!: getter-based plugin contract and runes view model`. The `!` marks the breaking change. End messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Do NOT push or open a PR.

## Steps

### Step 1: Park the four complex plugins and the routes

The branch cannot compile the four complex plugins against the new contract
until plan 003. Park them explicitly so every gate in this plan is honest:

1. `git mv src/lib/plugins/addGroupBy.ts src/lib/plugins/_parked/addGroupBy.ts` and likewise for `addSelectedRows.ts`, `addResizedColumns.ts`, `addVirtualScroll.ts`, `addVirtualScroll.types.ts`, plus their `*.test.ts` files and `src/lib/plugins/interactions.test.ts` (it uses group-by and selected rows). Leave `HeightManager.ts` / `scrollAlign.ts` in place (pure utils, still compile).
2. Remove the four `export * from './addX'` lines from `src/lib/plugins/index.ts`.
3. Add `"src/lib/plugins/_parked/**"` to `exclude` in `tsconfig.lib.json` and to `exclude` in the `test` block of `vite.config.ts`; add `'src/lib/plugins/_parked/**'` to `coverage.exclude`.
4. Routes: add `"src/routes/**"` to a new `exclude` array in `tsconfig.json` (temporarily; plan 004 removes it) and set `testIgnore: ['**/*']` in `playwright.config.ts` with a `// PARKED by plan 002; restored by plan 004` comment. The dev server may fail to render `/kitchen-sink` until plan 004; that is expected.
5. Add `.agents/.plans/v7-runes-core/PARKED.md` listing every parked path and which plan restores it.

**Verify**: `npx -y pnpm@11.24.0 check` still passes (nothing else changed yet); `git status` shows only renames and the config edits.

### Step 2: Reactive primitives (`src/lib/reactivity.svelte.ts`)

Create the module from plan 001's `reactivity.svelte.ts`, amended per the
report, and add the two set types that replace `recordSetStore` /
`arraySetStore`:

```ts
export class RecordSet<K extends string = string> implements Box<Record<K, boolean>> {
    #record = $state<Record<string, boolean>>({})
    constructor(initial: Record<K, boolean> = {} as Record<K, boolean>) {
        this.#record = withFalseRemoved(initial)
    }
    get current(): Record<K, boolean> {
        return this.#record as Record<K, boolean>
    }
    set current(next: Record<K, boolean>) {
        this.#record = withFalseRemoved(next)
    }
    has(key: K): boolean {
        return this.#record[key] === true
    }
    add(key: K): void
    addAll(keys: K[]): void
    remove(key: K): void
    removeAll(keys: K[]): void
    toggle(key: K): void
    clear(): void
}
export class ArraySet<T> implements Box<T[]> {
    /* current, has, add, remove, toggle({ clearOthers }), clear */
}
```

Keep the v6 semantics exactly (`recordSetStore` drops `false` entries;
`arraySetStore.toggle` accepts `{ clearOthers }`); port the existing
`utils/store.test.ts` cases for both to `src/lib/reactivity.test.ts`.
`withoutKey` / `withoutKeys` move here as plain helpers.

Export `Box`, `ReadonlyBox`, `Getter`, `box`, `derivedBox`, `keyedBox`,
`RecordSet`, `ArraySet` from `src/lib/index.ts` (consumers and third-party
plugins need them).

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/reactivity` → all pass.

### Step 3: The v7 plugin contract (`src/lib/types/TablePlugin.ts`)

Replace the store-typed members:

```ts
import type { Getter } from '../reactivity.svelte.js'

export type TablePluginInit<Item, ColumnOptions> = {
    pluginName: string
    tableState: PluginInitTableState<Item>
    columnOptions: Record<string, ColumnOptions>
}
export type TablePluginInstance<
    Item,
    PluginState,
    ColumnOptions,
    TablePropSet = AnyTablePropSet,
    TableAttributeSet = AnyTableAttributeSet
> = {
    pluginState: PluginState
    deriveFlatColumns?: DeriveFlatColumnsFn<Item>
    deriveRows?: DeriveRowsFn<Item>
    derivePageRows?: DeriveRowsFn<Item>
    deriveTableAttrs?: DeriveFn<TableAttributes<Item>>
    deriveTableHeadAttrs?: DeriveFn<TableHeadAttributes<Item>>
    deriveTableBodyAttrs?: DeriveFn<TableBodyAttributes<Item>>
    hooks?: TableHooks<Item, TablePropSet, TableAttributeSet>
}
export type DeriveFlatColumnsFn<Item> = <Col extends FlatColumn<Item>>(
    _flatColumns: Getter<Col[]>
) => Getter<Col[]>
export type DeriveRowsFn<Item> = <Row extends BodyRow<Item>>(_rows: Getter<Row[]>) => Getter<Row[]>
export type DeriveFn<T> = (_value: Getter<T>) => Getter<T>
export type ElementHook<Props, Attributes> = { props?: Getter<Props>; attrs?: Getter<Attributes> }
```

Delete `TransformFlatColumnsFn`, `AnyPluginInstances` if unused after the
rewrite, and the `columnOptions` instance member. Update the JSDoc: a
`Getter` is read inside a `$derived` or a template so its dependencies are
tracked; plugins must never write `$state` while a getter is being evaluated.

**Verify**: `npx -y pnpm@11.24.0 check` → errors only in files this plan
rewrites next (list them in the commit message); no errors in
`src/lib/types/`.

### Step 4: `createTable` data input and the view-model types

In `src/lib/createTable.ts`:

- `Table.data: Getter<Item[]>`. `createTable` accepts
  `data: Item[] | Getter<Item[]>` and normalises: array → `() => data`;
  function → as-is. **No store input.** If a caller passes an object with a
  `subscribe` method, throw
  `new Error('createTable: pass an array or a getter, e.g. createTable(() => items); Svelte stores are not accepted in v7 — see the migration guide')`
  so a v6 consumer gets a clear message instead of an empty table. The
  maintainer's decision (2026-09-28): the library imports nothing from
  `svelte/store`, not even `fromStore`.
- `reuseKey` / `rowDataId` caching stays.

In `src/lib/createViewModel.svelte.ts`, replace the types:

```ts
export interface ViewModelCurrent<Item, Plugins> {
    readonly tableAttrs: TableAttributes<Item>
    readonly tableHeadAttrs: TableHeadAttributes<Item>
    readonly tableBodyAttrs: TableBodyAttributes<Item>
    readonly visibleColumns: FlatColumn<Item, Plugins>[]
    readonly headerRows: HeaderRow<Item, Plugins>[]
    readonly originalRows: BodyRow<Item, Plugins>[]
    readonly rows: BodyRow<Item, Plugins>[]
    readonly pageRows: BodyRow<Item, Plugins>[]
}
export interface TableViewModel<Item, Plugins> {
    readonly current: ViewModelCurrent<Item, Plugins>
    readonly flatColumns: FlatColumn<Item, Plugins>[]
    readonly pluginStates: PluginStates<Plugins>
    readonly _debug: ViewModelDebug
}
export interface PluginInitTableState<Item, Plugins = AnyPlugins> {
    data: Getter<Item[]>
    columns: Column<Item, Plugins>[]
    flatColumns: FlatColumn<Item, Plugins>[]
    tableAttrs: Getter<TableAttributes<Item>>
    tableHeadAttrs: Getter<TableHeadAttributes<Item>>
    tableBodyAttrs: Getter<TableBodyAttributes<Item>>
    visibleColumns: Getter<FlatColumn<Item, Plugins>[]>
    headerRows: Getter<HeaderRow<Item, Plugins>[]>
    originalRows: Getter<BodyRow<Item, Plugins>[]>
    rows: Getter<BodyRow<Item, Plugins>[]>
    pageRows: Getter<BodyRow<Item, Plugins>[]>
}
export interface TableState<Item, Plugins> extends PluginInitTableState<Item, Plugins> {
    pluginStates: PluginStates<Plugins>
}
```

`TableState` is what labels receive (`render((cell, state) => ...)`); its
getters replace the v6 stores. Remove `ReadOrWritable` from this file and
from `utils/store.ts` (it is gone with the store layer).

**Verify**: `npx -y pnpm@11.24.0 check` → remaining errors are only in
`createViewModel.svelte.ts` body, `tableComponent.svelte.ts`, plugins, render, tests.

### Step 5: `createViewModel` on `$derived`

Rewrite the body of `createViewModel` following the spike's shape:

```ts
const dataGetter = table.data
const flatColumns = getFlatColumns(columns)
const originalRows = $derived(getBodyRows(dataGetter(), flatColumns, { rowDataId }))

// tableState getters resolve lazily, so plugins can read values the chain
// produces later (there are no stand-in writables any more).
const tableState: TableState<Item, Plugins> = {
    data: dataGetter,
    columns,
    flatColumns,
    tableAttrs: () => finalizedTableAttrs /* ...one arrow per derived below */,
    rows: () => injectedRows,
    pageRows: () => injectedPageRows,
    headerRows: () => headerRows,
    pluginStates
}
```

- Instantiate plugins exactly as today (`columnOptions` per plugin from
  `flatColumns[i].plugins?.[pluginName]`).
- Fold the derive functions over getters:
  `let visibleColumns: Getter<FlatColumn<Item, Plugins>[]> = () => flatColumns; for (const fn of deriveFlatColumnsFns) visibleColumns = fn(visibleColumns)`.
- `const columnedRows = $derived(getColumnedBodyRows(originalRows, visibleColumns().map((c) => c.id)))`.
- `const injectedRows = $derived.by(() => { const value = rows(); /* injectState + applyHook loops as today, incrementing _debug counters */ return value })`.
  `applyHook` mutates the row/cell objects that this very computation
  produced; that is allowed. Nothing in this block may assign to a `$state`.
- `pageRows` fold, `injectedPageRows`, `headerRows` likewise.
- Table attrs: `let tableAttrs: Getter<TableAttributes<Item>> = () => ({ role: 'table' })`, fold `deriveTableAttrs`, then `const finalizedTableAttrs = $derived(finalizeAttributes(tableAttrs()))`; head and body likewise.
- `current` is an object of getters returning the deriveds (`get rows() { return injectedRows }`).
- Keep `_debug` with the same counter names; `derivedStoreCount` becomes `derivedCount` with the same values (plan 004 updates the bench page).

Delete the `live()` / `fromStore` block.

**Verify**: `npx -y pnpm@11.24.0 check` → no errors in `createViewModel.svelte.ts`.

### Step 6: `TableComponent` without stores

Rewrite `src/lib/tableComponent.svelte.ts` per the spike decision:

- `#hooks: Record<string, ElementHook<unknown, Record<string, unknown>>>` filled by `applyHook(pluginName, hook)`.
- `get current()` lazily creates `{ get attrs(), get props() }`. Default (memo-free): `attrs` merges `hook.attrs?.()` of every hook via `mergeAttributes`, then `this.decorateAttrs(...)` then `finalizeAttributes`; `props` returns `Object.fromEntries(entries.map(([name, hook]) => [name, hook.props?.()]))`. If the report chose the lazy-`$derived` variant, implement that instead and say so in the commit message.
- Delete `attrs()`, `props()`, `attrsForName`, `propsForName`, `#hookVersion`, `#version`, `#attrsHandle`, `#propsHandle`, the `derivedKeys` import and the `fromStore` import. Hooks are applied only inside the view model's derivations (`injectedRows`, `headerRows`), so `current.*` always reads the complete hook set for the derivation that produced the row; mark `applyHook` `@internal`. Rewrite `tableComponent.current.test.ts`'s "hook applied after current was first read" case to assert the spike's observed semantics (`src/routes/test/v7-spike/spike.test.ts:120-140`): a plain read after `applyHook` sees the new attrs; the DOM reflects it after the next re-render of that cell.
- `injectState(state: TableState<Item, Plugins>)` unchanged in shape.
- `clone()` implementations in the subclasses copy `#hooks` the way they copied `attrsForName` today (check `bodyRows.ts` / `bodyCells.ts` / `headerCells.ts` `clone` methods and the `cloneCellsInto` helper).

**Verify**: `npx -y pnpm@11.24.0 check` → no errors in the four component
files; `npx -y pnpm@11.24.0 exec vitest run src/lib/tableComponent` after
Step 9 rewrites those tests.

### Step 7: Render without stores

- `createRender.ts`: `RenderConfig = ComponentRenderConfig | SnippetRenderConfig | string | number | Getter<string | number>`; `ComponentRenderConfig.props?: Partial<Props> | Getter<Partial<Props>>`; `SnippetRenderConfig.args?: Args | Getter<Args>`. Delete the deprecated `eventHandlers` field and `.on()` method (they were announced for removal in the next major).
- `Render.svelte`: replace the `isReadable` / `readable()` normalisation with `typeof x === 'function' ? x() : x` inside `$derived`s. Keep the recursive `<Render>` for children.
- `render/index.ts` unchanged.
- Update `src/lib/render/*.test.ts` and `*.test.svelte` fixtures that used stores for props/args to getters.

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib/render` → all pass.

### Step 8: Delete the store layer and `Subscribe`

- `git rm -r src/lib/subscribe src/lib/utils/store.ts src/lib/utils/store.test.ts src/lib/fromStore.test.ts src/lib/FromStoreHost.test.svelte` (confirm each exists first; also `SubscribeHost.test.svelte` and the Subscribe test).
- Remove the `Subscribe` export from `src/lib/index.ts`; add the `reactivity` exports (Step 2).
- `grep -rn "svelte/store" src/lib --include=*.ts --include=*.svelte` must return **nothing** after Step 10.

**Verify**: the grep result above.

### Step 9: Migrate the core tests

Rewrite, keeping every assertion's intent:

- `src/lib/createViewModel.current.test.ts`, `createViewModel.current.ssr.test.ts`, `createViewModel.performance.test.ts`, `ssr.test.ts`, `tableComponent.applyHook.test.ts`, `tableComponent.current.test.ts`, `tableComponent.ssr.test.ts`, `createTable.test.ts`, `createTable.createColumns.test.ts`, `index.exports.test.ts`, `currentProps.types.test.ts`, and the `*Host.test.svelte` hosts (`CurrentHost`, `VmCurrentHost`).
- Data: `createTable(() => items, plugins)` or a plain array. Where a test mutated a `writable` data store, hold the items in a `box` / `$state` inside the host component and mutate that.
- Reads: `vm.current.rows` instead of `get(vm.rows)`; `cell.current.props.sort.order` instead of `get(cell.props()).sort.order`; plugin state via `.current`.
- Reactivity assertions outside components: wrap in `$effect.root` inside a `.svelte.ts` test helper `src/lib/test/effectRoot.svelte.ts` exporting `withEffectRoot(fn)` → runs `fn` inside `$effect.root`, `flushSync()`s, returns the cleanup. Plain reads need no root (report, test 5).
- `index.exports.test.ts`: update the expected export list (no `Subscribe`; plus `box`, `derivedBox`, `keyedBox`, `RecordSet`, `ArraySet` and their types).

**Verify**: `npx -y pnpm@11.24.0 exec vitest run src/lib --exclude 'src/lib/plugins/**'` → all pass.

### Step 10: Migrate the eleven simple plugins

For each plugin: `git mv src/lib/plugins/addX.ts src/lib/plugins/addX.svelte.ts`,
update `src/lib/plugins/index.ts` (`./addX.svelte`), rewrite, and migrate
`addX.test.ts`. Do them in this order so each commit is small and green:

1. **addHiddenColumns**, **addColumnOrder** — `hiddenColumnIds` / `columnIdOrder` become `box<string[]>`; `deriveFlatColumns` returns `() => derived` over `flatColumns()` and the box.
2. **addSubRows** — `deriveRows` returns a `$derived.by` that maps rows with `withSubRows`; `pluginState: {}`.
3. **addFlatten** — `depth` box; td hook `props: () => ({ flatten: (d) => { depth.current = d }, unflatten: () => { depth.current = 0 } })` (a constant object; allocate it once per cell outside the getter).
4. **addSortBy** — `sortKeys` becomes a `SortKeys` class in the same file: `current: SortKey[]` (box) + `toggleId(id, { multiSort, toggleOrder })` + `clearId(id)`; keep the export name `createSortKeysStore` as `createSortKeys` and drop the old name. `preSortedRows` is a `ReadonlyBox` over the captured upstream getter (spike pattern 2). `deriveRows` returns `() => sorted`. Hooks: `props: () => ({ order: ..., toggle, clear, disabled })` where `toggle` / `clear` are allocated once per cell. Drop the `MemoryCache` for td props (a getter per cell is cheaper than the cache lookup was).
5. **addPagination** — `pageSize` box with clamp-at-set (min 1), `pageIndex` with clamp-at-read against `pageCount` (spike pattern 3), `pageCount` / `hasPreviousPage` / `hasNextPage` as `derivedBox`; `serverItemCount` accepts `number | Getter<number> | Readable<number>` normalised like `createTable` data (a getter). `derivePageRows` captures the upstream getter for `prePaginatedRows` and returns `() => paged`.
6. **addTableFilter** — `filterValue` box; `deriveRows` returns a `$derived.by` that computes `{ rows, matches: Record<rowColId, true> }` in one pass; the td hook reads `matches` from that derived (no hidden state written during derivation). `preFilteredRows` per pattern 2.
7. **addColumnFilters** — `filterValues` box; per-column `keyedBox(filterValues, id)` replaces `keyedProp`; the user-facing `render({ filterValue, values, preFilteredRows, preFilteredValues, ...tableState })` receives `filterValue: Box<unknown>` and `values` / `preFilteredValues` as `ReadonlyBox<unknown[]>`; `initialFilterValue` is applied once at hook creation (not inside a getter). Keep `matchMode` semantics and the three filter fns.
8. **addExpandedRows** — `expandedIds: RecordSet<string>`; `getRowState(row)` returns `{ isExpanded: keyedBox-like Box<boolean>, canExpand: boolean, isAllSubRowsExpanded: ReadonlyBox<boolean> }`; the objects are stateless views so the LRU cache and `invalidate()` can go (keep `invalidate` as a no-op with a `@deprecated` note? No — remove it; plan 005 documents the removal).
9. **addDataExport** — `exportedData: ReadonlyBox<DataExport>` = `derivedBox(() => ...)` reading `tableState.rows()` and `tableState.visibleColumns()`; display-column `data()` values that are getters are called, plain values used as-is (no `get()`).
10. **addGridLayout** — `deriveTableAttrs: (attrs) => () => ({ ...attrs(), style: gridTemplateColumns(tableState.visibleColumns()) })` etc.; hooks return constant attrs objects via getters.

Each test file: replace `get(vm.rows)` with `vm.current.rows`, `store.set(x)`
with `.current = x`, `get(pluginState.x)` with `pluginState.x.current`.
Where a test asserted reactivity through `subscribe`, use `withEffectRoot`.
Keep the assertions; do not delete tests to make the suite pass.

**Verify** after each plugin: `npx -y pnpm@11.24.0 exec vitest run src/lib/plugins/addX` → all pass. After all eleven: `npx -y pnpm@11.24.0 check` → 0 errors.

### Step 11: Full gate and package

```sh
trunk fmt && trunk check --no-progress
npx -y pnpm@11.24.0 check
npx -y pnpm@11.24.0 test
npx -y pnpm@11.24.0 package && grep -l '\$state(' dist/*.svelte.js dist/plugins/*.svelte.js | head -3
grep -rn "svelte/store" src/lib --include=*.ts --include=*.svelte
```

Expected: lint clean; 0 type errors; unit suite green with coverage
thresholds met (parked files excluded); dist contains `.svelte.js` modules
with runes (`svelte-package` preserves rune syntax for the consumer's
compiler); the store grep returns nothing.

Then a bench sanity check (routes are parked, so use the spike renderer's
bench harness only if it still compiles; otherwise skip and say so): if you
can run `PERF_BENCH_ITERATIONS=10 PERF_BENCH_COLD_ONLY=1 npx -y pnpm@11.24.0 perf:bench`
against `/test/perf-bench`, record `rows-10k` and `sort-cycle-1k`
first-paint and interaction-paint medians in your report. If sort
interaction paint is more than 1.10× the plan 001 "current" numbers
(61.05 ms interaction), you may cache `current.props` in a lazily created
`$derived` inside the getter and re-measure; say which variant shipped.

## Test plan

- Red-first tests are not applicable in the classic sense (this is a
  contract replacement, not a behaviour fix). The **existing suites are the
  characterization tests**: every assertion in the migrated test files must
  survive with only its reading/writing idiom changed. A test may be deleted
  only if it tested the store layer itself (`fromStore.test.ts`,
  `Subscribe` tests, `utils/store.test.ts` cases that moved to
  `reactivity.test.ts`).
- New tests: `src/lib/reactivity.test.ts` (box/derivedBox/keyedBox
  semantics, RecordSet/ArraySet ported cases); a `createTable` test for the
  two data input forms plus the store rejection; a `TableState` label test proving
  `render((cell, state) => state.pageRows().length)` re-renders when the
  page changes.
- Verification: `npx -y pnpm@11.24.0 test` → all pass, thresholds met.

## Done criteria

- [ ] `npx -y pnpm@11.24.0 check` exits 0 (both tsconfigs)
- [ ] `trunk check --no-progress` → `✔ No issues`
- [ ] `npx -y pnpm@11.24.0 test` exits 0 with coverage thresholds met
- [ ] `npx -y pnpm@11.24.0 package` exits 0 and `dist/plugins/addSortBy.svelte.js` exists
- [ ] `grep -rn "svelte/store" src/lib --include=*.ts --include=*.svelte` returns nothing
- [ ] `grep -rn "Subscribe\|attrsForName\|derivedKeys\|keyedProp\|recordSetStore" src/lib` returns nothing outside `src/lib/plugins/_parked/`
- [ ] `src/lib/plugins/_parked/` contains exactly the four plugins, their types file, their tests and `interactions.test.ts`; `PARKED.md` lists them
- [ ] `.agents/.plans/v7-runes-core/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The plan 001 report does not exist or its Decisions section is empty.
- Any "Current state" excerpt no longer matches the live file.
- A migrated plugin test cannot be made to pass without changing the
  behaviour it asserts (e.g. sort order, page slicing, filter matches).
  Report the test name and the semantic difference.
- `state_unsafe_mutation` or `effect_orphan` is thrown by any library code
  path under `vitest` after you have removed all `$state` writes from
  derivation (Step 5/10): the ownership rule from the report needs revisiting.
- `svelte-package` strips or mangles `$state` in `dist/*.svelte.js` (the
  grep in Step 11 is empty) — consumers would then receive uncompiled runes
  syntax with no compiler pass; the packaging strategy must change before
  continuing.
- You need to edit a parked file.

## Maintenance notes

- Plan 003 unparks the four complex plugins; plan 004 unparks the routes,
  Playwright and the perf bench; plan 005 rewrites the docs; plan 006 handles
  the version and release. Until 004 lands, `pnpm dev` routes are expected
  to be broken and `PARKED.md` is the source of truth.
- Reviewers should check every `$derived.by` body in the library for
  assignments to `$state` (none allowed) and every hook `props` getter for
  per-read allocation of functions (allocate handlers once per cell, return
  them from the getter).
- The library has no `svelte/store` import at all. `createTable` throws on a
  store-shaped `data` argument; keep that guard until v8 so 6.x users hit a
  clear message rather than a silent empty table.
