---
name: core
description:
    Build a table with @humanspeak/svelte-headless-table v7 in Svelte 5. createTable, columns,
    the runes-native view model (vm.current, row.current, cell.current), Render and createRender.
    Use for any new table, custom cell rendering, or when existing code does not compile.
metadata:
    type: core
    library: '@humanspeak/svelte-headless-table'
    library_version: '7.0.1'
sources:
    - humanspeak/svelte-headless-table:docs/src/routes/docs/getting-started/quick-start/+page.svx
    - humanspeak/svelte-headless-table:docs/src/routes/docs/api
    - humanspeak/svelte-headless-table:src/lib/index.ts
---

# svelte-headless-table core (v7)

A headless table: the library builds rows, columns, attributes and plugin state; you write every `<table>`, `<tr>` and class yourself. v7 is runes-native. There are **no stores**: everything you render is a plain reactive value read through `current`.

## Minimal table

```svelte
<script lang="ts">
    import { Render, createTable } from '@humanspeak/svelte-headless-table'

    type Person = { name: string; age: number }
    let people: Person[] = $state.raw([
        { name: 'Ada Lovelace', age: 36 },
        { name: 'Grace Hopper', age: 85 }
    ])

    const table = createTable(() => people)
    const columns = table.createColumns([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    const vm = table.createViewModel(columns)
</script>

<table {...vm.current.tableAttrs}>
    <thead {...vm.current.tableHeadAttrs}>
        {#each vm.current.headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th {...cell.current.attrs}><Render of={cell.render()} /></th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody {...vm.current.tableBodyAttrs}>
        {#each vm.current.pageRows as row (row.id)}
            <tr {...row.current.attrs}>
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}><Render of={cell.render()} /></td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
```

Iterate `vm.current.pageRows`, not `rows`, so pagination and virtual scroll work when added later (without those plugins they are the same list).

## Essential constraints

- **Data is an array or a getter.** `createTable(items)` for static data; `createTable(() => items)` over `$state` / `$state.raw` for data that changes. A Svelte store throws. Wrap a store you do not control with `fromStore` from `svelte/store` and pass `() => rows.current`.
- **Replace, don't mutate.** Assign a new array (`people = [...people, next]`); `$state.raw` is enough and cheaper.
- **Read through `current`.** `vm.current.*`, `headerRow.current.attrs`, `row.current.attrs`, `cell.current.attrs` / `cell.current.props`. There is no `Subscribe`, no `attrs()` / `props()`, no `$rows`.
- **Imports:** core from `@humanspeak/svelte-headless-table`, plugins from `@humanspeak/svelte-headless-table/plugins`. Not the unscoped `svelte-headless-table` package (Svelte 4, unmaintained).
- **Rune files.** Code outside a component that creates `$state` must live in `.svelte.ts` / `.svelte.js`.
- Peer dependency is `svelte ^5.30`.

## Columns

```ts
const columns = table.createColumns([
    // accessor key, or a function plus an explicit id
    table.column({ header: 'Name', accessor: 'name' }),
    table.column({ id: 'initials', header: 'Initials', accessor: (p) => p.name[0] }),
    // header groups
    table.group({
        header: 'Details',
        columns: [table.column({ header: 'Age', accessor: 'age' })]
    }),
    // non-data columns: checkboxes, action menus
    table.display({ id: 'actions', header: '', cell: ({ row }) => createRender(Actions, { row }) })
])
```

`cell` on `table.column` customises how a data value renders: `cell: ({ value }) => value.toFixed(2)`. Plugin options per column go under `plugins: { <pluginName>: {...} }` (see the `plugins` skill).

## Rendering custom content

```ts
import { createRender, createSnippetRender } from '@humanspeak/svelte-headless-table'

// a component, with static props or a props getter for reactive ones
table.column({
    header: 'Status',
    accessor: 'status',
    cell: ({ value }) => createRender(StatusPill, { value })
})
table.column({
    header: 'Votes',
    accessor: 'votes',
    cell: ({ row }) => createRender(Vote, () => ({ count, onclick: () => count++ }))
})

// a snippet declared in the component
table.column({
    header: 'Name',
    accessor: 'name',
    cell: ({ value }) => createSnippetRender(nameCell, value)
})
```

Event handlers are ordinary `on<event>` props. Dynamic header labels return a getter: `header: (_, { rows }) => () => \`Name (${rows().length})\``.

## Server data and reuse

- Pass `rowDataId: (item) => item.id` in `table.createViewModel(columns, { rowDataId })` so `selectedDataIds` / `expandedIds` are keyed by your ids, not array indexes, and survive data refreshes.
- If columns are rebuilt on every reactive pass, pass the same `reuseKey` to `table.createViewModel` while they are unchanged; otherwise each rebuild resets plugin state (page index, sort order).

## Read for the current task

| Task                                                                        | Read                                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Sorting, filtering, pagination, selection, grouping, resize, virtual scroll | the `plugins` skill                                                                                 |
| Upgrading 6.x code (stores, `Subscribe`, `$pageRows`)                       | the `migrate-v6-to-v7` skill                                                                        |
| Code imports from `svelte-headless-table` (no scope)                        | the `migrate-from-svelte-headless-table` skill                                                      |
| Exact option and state types                                                | `node_modules/@humanspeak/svelte-headless-table/dist/index.d.ts` and `dist/plugins/index.d.ts`      |
| Any docs page as Markdown                                                   | `https://table.svelte.page/docs/<section>/<slug>.md`, index at `https://table.svelte.page/llms.txt` |
| Styling with shadcn-svelte                                                  | `https://table.svelte.page/docs/guides/shadcn-svelte.md`                                            |
