---
name: migrate-v6-to-v7
description:
    Upgrade @humanspeak/svelte-headless-table 6.x to 7. Use when code has Subscribe, let:attrs,
    $headerRows / $pageRows / $tableAttrs, cell.attrs() / cell.props(), readable()/writable() table
    data, or $pageIndex-style plugin stores. Inventory with greps, convert, then type-check.
metadata:
    type: lifecycle
    library: '@humanspeak/svelte-headless-table'
    library_version: '7.0.1'
requires:
    - core
sources:
    - humanspeak/svelte-headless-table:docs/src/routes/docs/guides/migrating-to-v7/+page.svx
    - humanspeak/svelte-headless-table:docs/src/routes/docs/guides/moving-to-current/+page.svx
---

# Migrate svelte-headless-table 6.x → 7

v7 removes the Svelte store API. Everything is read through `current`, data is an array or a getter, and plugin state is `Box` / `ReadonlyBox` / `RecordSet` / `ArraySet`. Peer: `svelte ^5.30`.

## 1. Inventory

Run from the project root and keep the list; every hit must be converted.

```sh
grep -rnE "<Subscribe|let:attrs|let:props|\.attrs\(\)|\.props\(\)" src
grep -rnE "\\\$(headerRows|rows|pageRows|tableAttrs|tableHeadAttrs|tableBodyAttrs|visibleColumns|originalRows)\b" src
grep -rnE "createTable\((readable|writable)\(|createTable\(\w+Store" src
grep -rnE "pluginStates\.|\.set\(|\.update\(|\\\$(pageIndex|pageSize|sortKeys|filterValue|filterValues|hiddenColumnIds|selectedDataIds|expandedIds|groupByIds|columnIdOrder|columnWidths)\b" src
grep -rnE "createRender\([^)]*\)\.on\(|eventHandlers|createSortKeysStore|createPageStore|\.invalidate\(\)|applyHook|injectState|initialFilterValue" src
```

## 2. Convert

| 6.x                                                                           | 7.x                                                                                                 |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `createTable(readable(items))`                                                | `createTable(items)`                                                                                |
| `const data = writable(items); createTable(data)`                             | `let data = $state.raw(items); createTable(() => data)`                                             |
| `const { headerRows, pageRows, tableAttrs } = table.createViewModel(columns)` | `const vm = table.createViewModel(columns)`                                                         |
| `{#each $pageRows as row}` / `{...$tableAttrs}`                               | `{#each vm.current.pageRows as row}` / `{...vm.current.tableAttrs}`                                 |
| `<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>`   | delete the wrapper; use `cell.current.attrs` / `cell.current.props`                                 |
| `$pageIndex`, `pageIndex.set(2)`, `$pageIndex++`                              | `pageIndex.current`, `pageIndex.current = 2`, `pageIndex.current += 1`                              |
| `hiddenColumnIds.update((ids) => [...ids, 'email'])`                          | `hiddenColumnIds.current = [...hiddenColumnIds.current, 'email']`                                   |
| `$selectedDataIds` (set helpers unchanged)                                    | `selectedDataIds.current`                                                                           |
| `bind:checked={$isSelected}` in an indicator                                  | `checked={isSelected.current}` + `onchange={(e) => (isSelected.current = e.currentTarget.checked)}` |
| `export let isSelected: Writable<boolean>`                                    | `const { isSelected }: { isSelected: Box<boolean> } = $props()`                                     |
| `$canExpand`                                                                  | `canExpand` (plain boolean)                                                                         |
| `createRender(C, store).on('click', fn)`                                      | `createRender(C, () => ({ ...props, onclick: fn }))`                                                |
| `header: (_, { rows }) => derived(rows, (r) => \`${r.length}\`)`              | `header: (_, { rows }) => () => \`${rows().length}\``                                               |
| `createSortKeysStore(keys)` / `createPageStore(cfg)`                          | `createSortKeys(keys)` / `createPageState(cfg)` with `cfg.items` a getter                           |
| `getRowState(row).invalidate()`                                               | delete it                                                                                           |
| `addPagination({ serverItemCount: store })`                                   | `serverItemCount: () => total` (same for `addVirtualScroll` `totalRows` / `dataOffset`)             |

Example of a converted header cell:

<!-- legacy-snippet -->

```svelte
<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
    <th {...attrs} onclick={props.sort.toggle}><Render of={cell.render()} /></th>
</Subscribe>
```

```svelte
<th {...cell.current.attrs} onclick={cell.current.props.sort.toggle}>
    <Render of={cell.render()} />
</th>
```

## 3. Behaviour changes to review, not just syntax

- **`initialFilterValue` is applied when the view model is built** (6.x applied it lazily when header props were first read). `initialFilterValue: ''` on a `matchFilter` column now filters out every row. Use `undefined` or remove the option.
- `pageIndex.current` is clamped to the last page on read (6.x wrote the clamped value back), and `pageSize` clamps writes below 1.
- Files that create `$state` outside components must be renamed `.svelte.ts`.
- Custom plugins: `deriveRows` takes and returns getters, hooks return `{ props?: () => ..., attrs?: () => ... }`, `transformFlatColumnsFn` is replaced by `deriveFlatColumns`. See the `plugins` skill.

## 4. Verify

1. Re-run every grep in step 1; only intentional hits (for example your own unrelated stores) may remain.
2. Run the project's type check (`svelte-check`) and tests.
3. Report what changed and list anything not converted with file and line.

Full guide: `https://table.svelte.page/docs/guides/migrating-to-v7.md`.
