---
name: plugins
description:
    Add sorting, filtering, pagination, row selection, expansion, grouping, column order/hide/resize,
    data export, grid layout or virtual scroll to a @humanspeak/svelte-headless-table v7 table.
    Covers plugin registration and order, per-column options, current.props and Box-based plugin state.
metadata:
    type: core
    library: '@humanspeak/svelte-headless-table'
    library_version: '7.0.1'
requires:
    - core
sources:
    - humanspeak/svelte-headless-table:docs/src/routes/docs/plugins
    - humanspeak/svelte-headless-table:src/lib/plugins
---

# svelte-headless-table plugins (v7)

## The three places a plugin shows up

```ts
import { createTable } from '@humanspeak/svelte-headless-table'
import { addPagination, addSortBy } from '@humanspeak/svelte-headless-table/plugins'

// 1. register under a name of your choice
const table = createTable(() => people, {
    sort: addSortBy({ disableMultiSort: true }),
    page: addPagination({ initialPageSize: 20 })
})

// 2. per-column options under the same name
const columns = table.createColumns([
    table.column({ header: 'Name', accessor: 'name', plugins: { sort: { invert: true } } }),
    table.column({ header: 'Notes', accessor: 'notes', plugins: { sort: { disable: true } } })
])

// 3. state on vm.pluginStates.<name>, props on cell.current.props.<name>
const vm = table.createViewModel(columns)
const { pageIndex, pageCount, hasNextPage, hasPreviousPage } = vm.pluginStates.page
```

```svelte
<th {...cell.current.attrs} onclick={cell.current.props.sort.toggle}>
    <Render of={cell.render()} />
    {#if cell.current.props.sort.order === 'asc'}▲{:else if cell.current.props.sort.order === 'desc'}▼{/if}
</th>

<button onclick={() => (pageIndex.current -= 1)} disabled={!hasPreviousPage.current}>Prev</button>
{pageIndex.current + 1} / {pageCount.current}
<button onclick={() => (pageIndex.current += 1)} disabled={!hasNextPage.current}>Next</button>
```

## Plugin state rules

- `Box<T>`: read and write `current` (`pageIndex.current = 2`, `bind:value={pageSize.current}`).
- `ReadonlyBox<T>`: read `current` only (`hasNextPage.current`).
- `RecordSet` / `ArraySet`: `current` plus `add`, `remove`, `toggle`, `clear`, `has`.
- Replace values, never mutate: `hiddenColumnIds.current = [...hiddenColumnIds.current, 'email']`.
- There is no `$pageIndex`, `.set()` or `.update()`; those were the v6 store API.

## Order matters

Plugins run first to last in object-key order; each sees the rows the previous one produced. This order works for every combination:

```ts
const table = createTable(() => data, {
    subRows: addSubRows({ children: 'children' }),
    filter: addColumnFilters(),
    tableFilter: addTableFilter(),
    group: addGroupBy(),
    sort: addSortBy(),
    expand: addExpandedRows(),
    select: addSelectedRows(),
    orderColumns: addColumnOrder(),
    hideColumns: addHiddenColumns(),
    page: addPagination(),
    resize: addResizedColumns()
})
```

Filter before sort (fewer rows to sort); paginate after everything that changes the row set.

## Plugin reference

| Plugin                                                                                                            | Column option (`plugins.<name>`)                     | State (`vm.pluginStates.<name>`)                                                                                                                                                                        | Props (`current.props.<name>`)                                                        |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `addSortBy({ initialSortKeys, disableMultiSort, toggleOrder, serverSide })`                                       | `disable`, `getSortValue`, `compareFn`, `invert`     | `sortKeys` (`SortKeys`, a box of `{ id, order }[]`), `preSortedRows`                                                                                                                                    | th: `order`, `toggle(event)`, `clear()`, `disabled`; td: `order`                      |
| `addColumnFilters({ serverSide })`                                                                                | `fn` (required), `initialFilterValue`, `render`      | `filterValues` (Box of `{ [columnId]: value }`), `preFilteredRows`                                                                                                                                      | th: `render` (filter UI)                                                              |
| `addTableFilter({ fn, initialFilterValue, includeHiddenColumns, serverSide })`                                    | `exclude`, `getFilterValue`                          | `filterValue` (`Box<string>`), `preFilteredRows`                                                                                                                                                        | td: `matches`                                                                         |
| `addPagination({ initialPageSize, initialPageIndex, serverSide, serverItemCount })`                               | —                                                    | `pageIndex`, `pageSize` (Box); `pageCount`, `hasNextPage`, `hasPreviousPage` (ReadonlyBox)                                                                                                              | —                                                                                     |
| `addSubRows({ children })`                                                                                        | —                                                    | —                                                                                                                                                                                                       | —                                                                                     |
| `addExpandedRows({ initialExpandedIds })`                                                                         | —                                                    | `expandedIds` (RecordSet), `getRowState(row)` → `isExpanded`, `canExpand`, `isAllSubRowsExpanded`                                                                                                       | —                                                                                     |
| `addSelectedRows({ initialSelectedDataIds, linkDataSubRows })`                                                    | —                                                    | `selectedDataIds` (RecordSet), `allRowsSelected`, `someRowsSelected`, `allPageRowsSelected`, `somePageRowsSelected`, `getRowState(row)` → `isSelected`, `isSomeSubRowsSelected`, `isAllSubRowsSelected` | tr: `selected`, `someSubRowsSelected`, `allSubRowsSelected`                           |
| `addGroupBy({ initialGroupByIds, disableMultiGroup })`                                                            | `disable`, `getGroupOn`, `getAggregateValue`, `cell` | `groupByIds` (ArraySet)                                                                                                                                                                                 | th: `grouped`, `toggle`, `clear`, `disabled`; td: `grouped`, `aggregated`, `repeated` |
| `addColumnOrder({ initialColumnIdOrder, hideUnspecifiedColumns })`                                                | —                                                    | `columnIdOrder` (`Box<string[]>`)                                                                                                                                                                       | —                                                                                     |
| `addHiddenColumns({ initialHiddenColumnIds })`                                                                    | —                                                    | `hiddenColumnIds` (`Box<string[]>`)                                                                                                                                                                     | —                                                                                     |
| `addResizedColumns({ onResizeEnd })`                                                                              | `initialWidth`, `minWidth`, `maxWidth`, `disable`    | `columnWidths` (Box of `{ [columnId]: px }`)                                                                                                                                                            | th: an action (`<th use:cell.current.props.resize>`), `drag`, `reset`, `disabled`     |
| `addFlatten({ initialDepth })`                                                                                    | —                                                    | `depth` (`Box<number>`)                                                                                                                                                                                 | td: `flatten(depth)`, `unflatten()`                                                   |
| `addDataExport({ format: 'object' \| 'json' \| 'csv', childrenKey })`                                             | `exclude`                                            | `exportedData` (ReadonlyBox)                                                                                                                                                                            | —                                                                                     |
| `addGridLayout()`                                                                                                 | —                                                    | —                                                                                                                                                                                                       | — (sets CSS grid attrs on table/thead/tbody)                                          |
| `addVirtualScroll({ estimatedRowHeight, bufferSize, onLoadMore, hasMore, totalRows, dataOffset, onRangeChange })` | —                                                    | `virtualScroll` (action), `topSpacerHeight`, `bottomSpacerHeight`, `measureRowAction`, `scrollToIndex`, `visibleRange`, `isLoading`, ...                                                                | tr: virtual row props                                                                 |

Built-in column filter functions are exported from `/plugins`: `matchFilter`, `textPrefixFilter`, `numberRangeFilter`.

## Recipes

**Row selection checkbox.** A display column renders an indicator from the row's boxes:

```ts
table.display({
    id: 'selected',
    header: '',
    cell: ({ row }, { pluginStates }) => {
        const { isSelected, isSomeSubRowsSelected } = pluginStates.select.getRowState(row)
        return createRender(SelectIndicator, { isSelected, isSomeSubRowsSelected })
    }
})
```

```svelte
<!-- SelectIndicator.svelte -->
<script lang="ts">
    import type { Box, ReadonlyBox } from '@humanspeak/svelte-headless-table'
    const {
        isSelected,
        isSomeSubRowsSelected
    }: { isSelected: Box<boolean>; isSomeSubRowsSelected: ReadonlyBox<boolean> } = $props()
</script>

<input
    type="checkbox"
    checked={isSelected.current}
    indeterminate={isSomeSubRowsSelected.current}
    onchange={(e) => (isSelected.current = e.currentTarget.checked)}
/>
```

Use `checked` + `onchange`, not `bind:checked`, because the value lives on the box. `addExpandedRows` works the same way with `isExpanded`.

**Column filter UI.** `render` receives `filterValue` (Box) and `values` / `preFilteredValues` (ReadonlyBox):

```ts
import { matchFilter } from '@humanspeak/svelte-headless-table/plugins'

table.column({
    header: 'Status',
    accessor: 'status',
    plugins: {
        filter: {
            fn: matchFilter,
            render: ({ filterValue, preFilteredValues }) =>
                createRender(SelectFilter, { filterValue, preFilteredValues })
        }
    }
})
```

```svelte
{#if cell.current.props.filter?.render}
    <Render of={cell.current.props.filter.render} />
{/if}
```

For "no filter" leave `initialFilterValue` out; `''` on a `matchFilter` column hides every row.

**Server-side pagination.** Let the server count rows and read the page state when fetching:

```ts
let total = $state(0)
const table = createTable(() => rows, {
    page: addPagination({ serverSide: true, serverItemCount: () => total })
})
```

**Virtual scroll.** Put `use:virtualScroll` on a fixed-height scroll container, render spacer rows from `topSpacerHeight.current` / `bottomSpacerHeight.current` with `colspan={vm.current.visibleColumns.length}`, and add `use:measureRowAction={row.id}` to each `<tr>`. It windows `vm.current.pageRows`, so iterate that; it is normally used instead of `addPagination`, not with it. Full example: `https://table.svelte.page/docs/plugins/add-virtual-scroll.md`.

## Writing your own plugin

A plugin is `({ pluginName, tableState, columnOptions, upstream }) => ({ pluginState, deriveRows?, hooks? ... })` in a `.svelte.ts` file. Never write state while a derivation or hook getter runs, create handlers once per hook call, and read pre-transform rows from `upstream`. Complete worked example: `https://table.svelte.page/docs/guides/migrating-to-v7.md#writing-a-v7-plugin`.

Each plugin's full page: `https://table.svelte.page/docs/plugins/<add-sort-by|add-column-filters|...>.md`.
