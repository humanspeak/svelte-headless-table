# v7: runes-native core and plugin contract

`@humanspeak/svelte-headless-table` 7.0 rebuilds the table on Svelte 5 runes. The view model is a chain of `$derived` values, the library imports nothing from `svelte/store`, and `current.*` (`vm.current`, `row.current`, `cell.current`), introduced in 6.4, is now the only way to read the table. Plugin state is plain reactive objects with a `current` property, and plugins are written against getters instead of stores. The package no longer has any runtime dependencies (`@humanspeak/memory-cache` was dropped).

**This is a breaking release.** Start with the migration guide: <https://table.svelte.page/docs/guides/migrating-to-v7>.

## Faster than 6.5

Median of three 30-iteration cold runs per version, alternating v7 / v6 on the same machine (Chromium, Svelte 5.57.1). Method, machine and every metric are in [`scripts/perf-v6-vs-v7.md`](https://github.com/humanspeak/svelte-headless-table/blob/main/scripts/perf-v6-vs-v7.md).

| Scenario                                      |     6.5.4 |       7.0 | v7 / v6 |
| --------------------------------------------- | --------: | --------: | ------: |
| `rows-10k`: 10,000 rows, first paint          | 372.75 ms | 215.80 ms |   0.58× |
| `sort-cycle-1k`: three sort changes on 1,000  | 123.50 ms |  86.85 ms |   0.70× |
| `kitchen-sink-1k`: seven plugins, first paint |  61.55 ms |  55.50 ms |   0.90× |

The cold mount of `sort-cycle-1k` measured 1.10× v6 (41.15 ms vs 37.50 ms); its per-run medians overlap v6's, so it was treated as noise.

## Breaking changes

| Area                      | 6.x                                                                                                             | 7.x                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Data input                | `createTable(readable(items))`, `createTable(writable(items))`                                                  | `createTable(items)` or `createTable(() => items)`; a store throws                                            |
| View-model stores         | `vm.rows`, `vm.pageRows`, `vm.headerRows`, `vm.tableAttrs`, ... (`Readable`)                                    | removed; read `vm.current.rows`, `vm.current.pageRows`, ...                                                   |
| `Subscribe`               | `<Subscribe attrs={cell.attrs()} let:attrs>`                                                                    | removed; read `cell.current.attrs`                                                                            |
| `attrs()` / `props()`     | `row.attrs()`, `cell.props()` return stores                                                                     | removed; `row.current.attrs`, `cell.current.props`                                                            |
| Plugin state reads/writes | `$pageIndex`, `pageIndex.set(2)`, `pageIndex.update(...)`                                                       | `pageIndex.current`, `pageIndex.current = 2`                                                                  |
| Set-like plugin state     | `selectedDataIds` / `expandedIds` / `groupByIds` stores with helper methods                                     | `RecordSet` / `ArraySet`: `.current` plus `add`, `remove`, `toggle`, `clear`, ...                             |
| Per-row state             | `getRowState(row).isSelected` is a `Writable<boolean>`                                                          | a `Box<boolean>`; `canExpand` is a plain `boolean`                                                            |
| `createRender` events     | `createRender(C, props).on('click', fn)`, `eventHandlers`                                                       | removed; pass `onclick: fn` as a prop                                                                         |
| Dynamic render values     | `Readable` accepted as a `RenderConfig`, as `createRender` props and as snippet args                            | pass a getter (`() => value`)                                                                                 |
| Label state               | `header: (_, { rows }) => derived(rows, ...)`                                                                   | `header: (_, { rows }) => () => ...rows()...`                                                                 |
| Renamed helpers           | `createSortKeysStore`, `createPageStore`                                                                        | `createSortKeys`, `createPageState` (`config.items` is a getter)                                              |
| Store-typed plugin config | `addPagination({ serverItemCount: readable(n) })`, `addVirtualScroll({ totalRows: store })`                     | a number or a getter (`addVirtualScroll` also takes a `Box` / `ReadonlyBox`); a store throws                  |
| Column filters            | `initialFilterValue` applied lazily, when a header's props were first read                                      | applied when the view model is built (see below)                                                              |
| Plugin-author contract    | `deriveRows: (rows: Readable<Row[]>) => Readable<Row[]>`, hooks return `{ props?: Readable, attrs?: Readable }` | `deriveRows: (rows: () => Row[]) => () => Row[]`, hooks return `{ props?: () => Props, attrs?: () => Attrs }` |
| Debug counters            | `vm._debug.derivedStoreCount`                                                                                   | `vm._debug.derivedCount`                                                                                      |

### Behaviour change: eager `initialFilterValue`

6.x applied a column's `initialFilterValue` lazily, the first time that header's props were read. v7 applies it when the view model is built. An initial value on a column whose header props you never rendered used to have no effect, and now it filters. In particular, `initialFilterValue: ''` on a `matchFilter` column now filters every row out. Use `undefined` (or leave the option out) for "no filter". The guide's checklist includes a grep for this: `grep -rn "initialFilterValue: ''" src`.

## Removed

- `Subscribe` (the component and its export)
- The store API: every `Readable` / `Writable` on the view model, rows, cells and plugin state; `createTable` rejects stores
- `createRender(...).on(event, handler)` and `eventHandlers`
- `getRowState(row).invalidate()` on `addExpandedRows` and `addSelectedRows` (per-row views never go stale)
- `createSortKeysStore` (use `createSortKeys`) and `createPageStore` (use `createPageState`)
- `transformFlatColumnsFn` on the plugin contract (use `deriveFlatColumns`)
- `applyHook()`, `injectState()` and `state` on rows, cells and header components (view-model plumbing; labels and display-column `data` functions receive the table state as their second argument)
- `Readable` values as render configs, `createRender` props and snippet args (use getters)

New root exports: `box`, `derivedBox`, `keyedBox`, `RecordSet`, `ArraySet`, and the `Box`, `ReadonlyBox`, `Getter` types.

## Migration

Step-by-step guide with before/after code for every item above, plus a grep checklist: <https://table.svelte.page/docs/guides/migrating-to-v7>.

If your templates still use `<Subscribe>` or `$headerRows`, do the 6.4 step first: <https://table.svelte.page/docs/guides/moving-to-current>. It works on 6.x, so you can ship it before upgrading.

## For plugin authors

The derive functions take a getter for the upstream value and return a getter. Hooks return `props` / `attrs` getters, and `tableState` members are getters. Plugins that use runes live in `.svelte.ts` files. Three rules keep a plugin correct:

1. **No state writes during derivation.** A `deriveRows` getter, a `$derived` and a hook's `props` / `attrs` getter must only read. Writing a `$state` or a box there throws `state_unsafe_mutation`. Clamp on read instead, and apply initial values when the plugin is created.
2. **Allocate handlers once per cell.** Create callbacks in the hook factory and return the same function from the `props` getter.
3. **Expose pre-transform rows by capturing the upstream getter.** Keep the `rows` getter `deriveRows` received and read it from a `ReadonlyBox`, rather than copying it into state.

Full contract and a worked plugin: <https://table.svelte.page/docs/plugins/overview>.
