---
title: createColumns
description: Define your table structure and interactions
sidebar_title: createColumns
---

<script>
  import { useHljs } from '$lib/utils/useHljs';
  useHljs('ts');
</script>

# {$frontmatter?.title}

`Table#createColumns` creates and validates a set of columns for the table. It is called on the table instance, and returns an array of `Column`s.

```ts
const table = createTable(data);
const column = table.createColumns(...);
```

## Usage

:::admonition type="warning"

**Breaking change**

**v0.13** - `header: (tableState) => RenderConfig`.

**v0.14** - `header: (headerCell, tableState) => RenderConfig`.

:::

---

### `Table#createColumns: (columns) => Column[]`

`columns` is an array of columns created by `Table#column`, `Table#group`, or `Table#display`.

```ts
const columns = table.createColumns([...])
```

---

### `Table#column: (columnDef) => DataColumn`

`columnDef` is the definition of the data column. `DataColumn`s describe actual data to present in the table.

#### `columnDef.accessor: string | ((item) => unknown)`

Defines the property to present on the data column.

If `accessor` is a string, the property **must exist as a direct property on each data item**. If a nested or computed property is needed, pass a function accessor.

:::example

<!-- prettier-ignore -->
```ts copy {7,11,17}
const columns = table.createColumns([
  table.column({
    header: (_, { rows }) =>
      derived(rows, (r) =>
        `First Name (${r.length} people)`),
    accessor: 'firstName',
  }),
  table.column({
    header: 'Last Name',
    accessor: 'lastName',
  }),
  table.column({
    header: createRender(Italic, {
      text: 'Age',
    }),
    accessor: (item) => item.info.age,
    id: 'age',
  }),
]);
```

:::

#### `columnDef.id?: string`

:::admonition type="warning"

The `id` will be parsed with [`svelte-keyed`](https://github.com/humanspeak/svelte-keyed), so make sure to format it without dot notation (`object.prop`) or array notation (`object[0]`).

:::

Defines the id of the data column. **Duplicate ids are not allowed** on a single table.

_Defaults to the value of `accessor` if a string accessor is passed. If a function accessor is passed, defaults to the value of `header` instead_.

#### `columnDef.header: RenderConfig | ((headerCell, state) => RenderConfig)`

Defines the component to use for the header cell of the data column.

`header` is either a [`RenderConfig`](../--render.md#renderconfig), or a function that receives [`HeaderCell`](../header-cell.md) and [`TableState`](../table-state.md), and returns a [`RenderConfig`](../--render.md#renderconfig).

:::example

<!-- prettier-ignore -->
```svelte copy {16-22,26,30-32}
<!-- SortHeaderCell.svelte -->
<script lang="ts">
  export let label: string;
  export let order: string | undefined;
  $: indicator = order === 'asc' ? '🔼' : order === 'desc' ? '🔽' : '';
  export let toggle: (ev: Event) => void;
</script>

<div on:click={toggle}>{label} {indicator}</div>

<!-- App.svelte -->
<script lang="ts">
  const columns = table.createColumns([
    table.column({
      header: (cell, { rows }) => createRender(
        SortHeaderCell,
        derived([cell.props(), rows], ([{sort}, _rows]) => ({
          label: `First Name (${_rows.length} people)`,
          ...sort,
        }),
      )),
      accessor: 'firstName',
    }),
    table.column({
      header: 'Last Name',
      accessor: 'lastName',
    }),
    table.column({
      header: createRender(Italic, {
        text: 'Age',
      }),
      accessor: (item) => item.info.age,
      id: 'age',
    }),
  ]);
  </script>
```

<script>
  import HeaderExample from './HeaderExample.svelte';
</script>
<HeaderExample />

:::

#### `columnDef.cell?: (dataCell, state) => RenderConfig`

Defines the component to use for the body cells of the data column.

`cell` is a function that receives [`DataBodyCell`](../body-cell.md#databodycell) and [`TableState`](../table-state.md), and returns a [`RenderConfig`](../--render.md#renderconfig).

_Defaults to returning `dataCell.value`_.

:::example

```ts copy {6-9,19}
const columns = table.createColumns([
    table.column({
        header: 'First Name',
        accessor: 'firstName',
        cell: ({ value }) =>
            createRender(Bold, {
                text: value
            })
    }),
    table.column({
        header: 'Last Name',
        accessor: 'lastName'
    }),
    table.column({
        header: 'Age',
        accessor: (item) => item.info.age,
        id: 'age',
        cell: ({ value }) => `${value} yo`
    })
])
```

<script>
  import CellExample from './CellExample.svelte';
</script>
<CellExample />

:::

#### `columnDef.plugins?: ColumnOptions`

Defines the plugin column options of the data column.

:::admonition type="tip"
See also [Plugin Column Options](../plugins/overview.md#configuring-columns).
:::

---

### `Table#group: (groupDef) => GroupColumn`

`groupDef` is the definition of the group column. `GroupColumn`s group other columns together (including other nested `GroupColumn`s) to create multiple levels of header rows.

#### `groupDef.columns: Column[]`

Defines the columns grouped by the group column.

:::example

```ts copy {5-14,18-24}
const columns = table.createColumns([
    table.group({
        header: 'Name',
        columns: [
            table.column({
                header: 'First Name',
                accessor: 'firstName'
            }),
            table.column({
                header: 'Last Name',
                accessor: 'lastName'
            })
        ]
    }),
    table.group({
        header: 'Info',
        columns: [
            table.column({
                header: 'Age',
                accessor: (item) => item.info.age,
                id: 'age'
            })
        ]
    })
])
```

<script>
  import GroupColumnExample from './GroupColumnExample.svelte';
</script>
<GroupColumnExample />

:::

#### `groupDef.header: RenderConfig | ((headerCell, state) => RenderConfig)`

Defines the component to use for the header cell of the group column.

`header` is either a [`RenderConfig`](../--render.md#renderconfig), or a function that receives [`HeaderCell`](../header-cell.md) and [`TableState`](../table-state.md), and returns a [`RenderConfig`](../--render.md#renderconfig).

:::example

<!-- prettier-ignore -->
```ts copy {5-7,20-22}
const table = createTable(data);
const columns = table.createColumns([
  table.group({
    header: (_, { rows }) =>
      derived(rows, (r) =>
        `Name (${r.length} people)`),
    columns: [
      table.column({
        header: 'First Name',
        accessor: 'firstName',
      }),
      table.column({
        header: 'Last Name',
        accessor: 'lastName',
      }),
    ],
  }),
  table.group({
    header: createRender(Italic, {
      text: 'Info',
    }),
    columns: [
      table.column({
        header: createRender(Italic, {
          text: 'Age',
        }),
        accessor: (item) => item.info.age,
        id: 'age',
      }),
    ],
  }),
]);
```

<script>
  import GroupHeaderExample from './GroupHeaderExample.svelte';
</script>
<GroupHeaderExample />

:::

---

### `Table#display: (displayDef) => DisplayColumn`

`displayDef` is the definition of the display column. `DisplayColumn`s allow for non data-related information to be displayed.

Useful for row selection and row expanding UI.

#### `displayDef.id?: string`

Defines the id of the display column. **Duplicate ids are not allowed** on a single table.

_Defaults to the value of `header`_.

:::example

```ts copy {4}
const columns = table.createColumns([
    table.display({
        id: 'selected'
    }),
    table.column({
        header: 'First Name',
        accessor: 'firstName'
    }),
    table.column({
        header: 'Last Name',
        accessor: 'lastName'
    })
])
```

:::

#### `displayDef.header: RenderConfig | ((headerCell, state) => RenderConfig)`

Defines the component to use for the header cell of the display column.

`header` is either a [`RenderConfig`](../--render.md#renderconfig), or a function that receives [`HeaderCell`](../header-cell.md) and [`TableState`](../table-state.md), and returns a [`RenderConfig`](../--render.md#renderconfig).

:::example

<!-- prettier-ignore -->
```ts copy {5-7}
const columns = table.createColumns([
  table.display({
    id: 'selected',
    header: (_, { pluginStates }) =>
      derived(pluginStates.select.selectedIds, (_selectedIds) =>
        `${_selectedIds.length} selected`),
  }),
  table.column({
    header: 'First Name',
    accessor: 'firstName',
  }),
  table.column({
    header: 'Last Name',
    accessor: 'lastName',
  }),
]);
```

:::

#### `displayDef.cell: (displayCell, state) => RenderConfig`

Defines the component to use for the body cells of the display column.

`cell` is a function that receives [`DisplayBodyCell`](../body-cell.md#displaybodycell) and [`TableState`](../table-state.md), and returns a [`RenderConfig`](../--render.md#renderconfig).

#### `displayDef.data: (displayCell, state) => Readable<unknown> | unknown`

An optional method to define the underlying data of the display column cell.

This is only useful when used with the [`addDataExport`](../../plugins/add-data-export.md) plugin.

Usually, display columns do not contain any data and are exported as `null` values. However, it may be useful to export the plugin states of each row as part of the data export.

To do so, you can use `data` to specify how the column should be exported.

`data` is a function that receives [`DisplayBodyCell`](../body-cell.md#displaybodycell) and a nullable [`TableState`](../table-state.md), and returns the data for that cell.

:::example

```ts
table.display({
  id: 'selected',
  ...
  data: ({ row }, state) => {
    return state?.pluginStates.select.getRowState(row).isSelected;
  },
}),
```

:::
