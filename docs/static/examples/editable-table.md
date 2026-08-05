<!-- Source: https://table.svelte.page/examples/editable-table -->

# Editable Table

> Inline-editable table cells driven by a custom cell renderer that reads and writes the underlying Svelte store.

**Source:** [https://table.svelte.page/examples/editable-table](https://table.svelte.page/examples/editable-table)

**Markdown mirror:** [https://table.svelte.page/examples/editable-table.md](https://table.svelte.page/examples/editable-table.md)

---

This mirror preserves the prose, implementation notes, and runnable Svelte source behind the live example page.

## FIG-001: inline edit.

Cells render through a custom `EditableCell` component that swaps a `<span>` for an `<input>` on click. Press Enter (or the ✓ button) to commit the new value into the writable data store; Escape (or ✗) reverts.

**Metadata:** tag: `EDIT` | pattern: `editable cells`

### Notes

- The cell renderer is an ordinary Svelte component handed to createRender — it owns its own focus state and writes back via a callback prop.
- Edits flow into the same writable store the table reads from; the table re-renders automatically through the reactive data subscription.
- `Enter` commits and exits, `Escape` reverts. Add your own keyboard navigation by wiring `HTMLInputElement` events inside the cell renderer.

### Source

#### Default.svelte

Source file: [src/lib/examples/editable-table/demos/Default.svelte](https://github.com/humanspeak/svelte-headless-table/blob/main/docs/src/lib/examples/editable-table/demos/Default.svelte)

```svelte
<script lang="ts">
    import { writable } from 'svelte/store'
    import {
        Render,
        Subscribe,
        createTable,
        createRender,
        type DataLabel
    } from '@humanspeak/svelte-headless-table'

    import { createSamples, type Sample } from '$lib/utils/createSamples'
    import EditableCell from './EditableCell.svelte'

    const data = writable(createSamples(100, 1, 0, { seed: 11 }))

    const updateData = (rowDataId: string, columnId: string, newValue: unknown) => {
        let coerced: unknown = newValue
        if (['age', 'visits', 'progress'].includes(columnId)) {
            const n = parseInt(String(newValue), 10)
            if (isNaN(n)) {
                $data = $data
                return
            }
            coerced = n
        }
        if (columnId === 'status') {
            if (!['relationship', 'single', 'complicated'].includes(String(newValue))) {
                $data = $data
                return
            }
        }
        const idx = parseInt(rowDataId, 10)
        const currentItem = $data[idx]
        const key = columnId as keyof Sample
        $data[idx] = { ...currentItem, [key]: coerced } as Sample
        $data = $data
    }

    const table = createTable(data)

    const EditableCellLabel: DataLabel<Sample> = ({ column, row, value }) =>
        createRender(EditableCell, {
            row,
            column,
            value,
            onUpdateValue: updateData
        })

    const columns = table.createColumns([
        table.group({
            header: 'Name',
            columns: [
                table.column({
                    header: 'First Name',
                    cell: EditableCellLabel,
                    accessor: 'firstName'
                }),
                table.column({
                    header: () => 'Last Name',
                    cell: EditableCellLabel,
                    accessor: 'lastName'
                })
            ]
        }),
        table.group({
            header: 'Info',
            columns: [
                table.column({
                    header: 'Age',
                    cell: EditableCellLabel,
                    accessor: 'age'
                }),
                table.column({
                    header: 'Status',
                    cell: EditableCellLabel,
                    id: 'status',
                    accessor: (item) => item.status
                }),
                table.column({
                    header: 'Visits',
                    cell: EditableCellLabel,
                    accessor: 'visits'
                }),
                table.column({
                    header: 'Profile Progress',
                    cell: EditableCellLabel,
                    accessor: 'progress'
                })
            ]
        })
    ])

    const { headerRows, pageRows, tableAttrs, tableBodyAttrs } = table.createViewModel(columns)
</script>

<div class="editable-shell">
    <table {...$tableAttrs} class="editable-table">
        <thead>
            {#each $headerRows as headerRow (headerRow.id)}
                <Subscribe attrs={headerRow.attrs()} let:attrs>
                    <tr {...attrs}>
                        {#each headerRow.cells as cell (cell.id)}
                            <Subscribe attrs={cell.attrs()} let:attrs>
                                <th {...attrs}>
                                    <div class="th-inner">
                                        <Render of={cell.render()} />
                                    </div>
                                </th>
                            </Subscribe>
                        {/each}
                    </tr>
                </Subscribe>
            {/each}
        </thead>
        <tbody {...$tableBodyAttrs}>
            {#each $pageRows as row (row.id)}
                <Subscribe attrs={row.attrs()} let:attrs>
                    <tr {...attrs}>
                        {#each row.cells as cell (cell.id)}
                            <Subscribe attrs={cell.attrs()} let:attrs>
                                <td {...attrs}>
                                    <Render of={cell.render()} />
                                </td>
                            </Subscribe>
                        {/each}
                    </tr>
                </Subscribe>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .editable-shell {
        border: 1px solid var(--border);
        background: var(--background);
        overflow: auto;
        max-height: 560px;
    }

    .editable-table {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.85em;
        color: var(--foreground);
    }

    /* Group + leaf header rows. The first thead row groups columns, the
       second row labels the leaves. Sticky so the table can scroll inside
       the shell without losing context. */
    .editable-table thead {
        position: sticky;
        top: 0;
        z-index: 1;
        background: color-mix(in srgb, var(--muted, var(--foreground)) 6%, var(--background));
    }
    .editable-table thead tr:first-child th {
        text-align: center;
        background: color-mix(in srgb, var(--muted, var(--foreground)) 12%, var(--background));
    }

    .editable-table th,
    .editable-table td {
        border-bottom: 1px solid var(--border);
        border-right: 1px solid var(--border);
        padding: 6px 10px;
        text-align: left;
        vertical-align: middle;
        white-space: nowrap;
    }
    .editable-table th:last-child,
    .editable-table td:last-child {
        border-right: 0;
    }

    .editable-table thead th {
        font-family:
            var(--prose-sans),
            system-ui,
            -apple-system,
            sans-serif;
        font-weight: 600;
        font-size: 0.7em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--foreground) 70%, transparent);
    }
    .th-inner {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .editable-table tbody tr {
        transition: background 80ms ease;
    }
    .editable-table tbody tr:hover {
        background: color-mix(in srgb, var(--color-brand-500, var(--foreground)) 5%, transparent);
    }
    .editable-table tbody tr:nth-child(even) {
        background: color-mix(in srgb, var(--muted, var(--foreground)) 3%, transparent);
    }
    .editable-table tbody tr:nth-child(even):hover {
        background: color-mix(in srgb, var(--color-brand-500, var(--foreground)) 6%, transparent);
    }

    .editable-table tbody td {
        position: relative;
    }
</style>
```

#### EditableCell.svelte

Source file: [src/lib/examples/editable-table/demos/EditableCell.svelte](https://github.com/humanspeak/svelte-headless-table/blob/main/docs/src/lib/examples/editable-table/demos/EditableCell.svelte)

```svelte
<script lang="ts">
    import type { DataColumn, BodyRow } from '@humanspeak/svelte-headless-table'
    import { Check, X } from '@lucide/svelte'

    type Props = {
        // `any` (not `unknown`) so the cell accepts a column/row of any table
        // data shape — `createRender` can't carry a caller's generic through
        // `ComponentProps`, and `DataColumn<T>` is invariant in `T`.
        // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        row: BodyRow<any>
        // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        column: DataColumn<any>
        value: unknown
        onUpdateValue: (_rowDataId: string, _columnId: string, _newValue: unknown) => void
    }

    const { row, column, value, onUpdateValue }: Props = $props()

    let isEditing = $state(false)
    let inputElement: HTMLInputElement | undefined = $state(undefined)

    // Local draft. We deliberately do NOT bind back to the `value` prop —
    // committing happens through `onUpdateValue`, which writes the change
    // to the parent store. Keeping `draft` local avoids reactive
    // round-trips that would re-render the cell mid-typing.
    let draft = $state<string>('')

    const startEditing = () => {
        draft = value == null ? '' : String(value)
        isEditing = true
    }

    // Focus + select once per edit session. The effect only reads
    // `isEditing` (and `inputElement` for the imperative call), NOT
    // `draft` — so subsequent keystrokes don't re-run it. A naive
    // `if (isEditing) { ... select() }` block that read `draft` would
    // re-select on every character and wipe the user's input.
    $effect(() => {
        if (isEditing && inputElement) {
            inputElement.focus()
            inputElement.select()
        }
    })

    const commit = () => {
        isEditing = false
        if (row.isData()) {
            onUpdateValue(row.dataId, column.id, draft)
        }
    }

    const cancel = () => {
        isEditing = false
    }

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
        }
    }
</script>

{#if !isEditing}
    <button type="button" class="cell-display" onclick={startEditing} title="Click to edit">
        <span class="cell-value">{value}</span>
    </button>
{:else}
    <form
        class="cell-edit"
        onsubmit={(e) => {
            e.preventDefault()
            commit()
        }}
    >
        <input bind:this={inputElement} bind:value={draft} type="text" onkeydown={onKeydown} />
        <button type="submit" class="icon-btn icon-btn--commit" title="Commit (Enter)">
            <Check size={14} strokeWidth={2.25} />
        </button>
        <button
            type="button"
            class="icon-btn icon-btn--cancel"
            onclick={cancel}
            title="Cancel (Esc)"
        >
            <X size={14} strokeWidth={2.25} />
        </button>
    </form>
{/if}

<style>
    .cell-display {
        all: unset;
        display: inline-block;
        width: 100%;
        padding: 4px 8px;
        margin: -4px -8px;
        cursor: text;
        border: 1px solid transparent;
        border-radius: 0;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.85em;
        color: var(--foreground);
        transition: border-color 100ms ease;
    }
    .cell-display:hover {
        border-color: var(--border);
        background: color-mix(in srgb, var(--muted, var(--foreground)) 4%, transparent);
    }
    .cell-display:focus-visible {
        outline: 2px solid var(--color-brand-500, currentColor);
        outline-offset: -2px;
    }
    .cell-value {
        display: inline-block;
        min-width: 1ch;
    }

    .cell-edit {
        display: inline-flex;
        align-items: stretch;
        gap: 4px;
        width: 100%;
    }
    .cell-edit input {
        flex: 1 1 0;
        min-width: 0;
        padding: 3px 8px;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.85em;
        color: var(--foreground);
        background: var(--background);
        border: 1px solid var(--color-brand-500, var(--border));
        border-radius: 0;
        outline: none;
    }
    .cell-edit input:focus {
        box-shadow:
            inset 0 0 0 1px var(--color-brand-500, var(--border)),
            0 0 0 2px color-mix(in srgb, var(--color-brand-500, currentColor) 25%, transparent);
    }

    .icon-btn {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        flex: 0 0 auto;
        cursor: pointer;
        border: 1px solid var(--border);
        background: var(--background);
        color: var(--foreground);
        transition:
            background 100ms ease,
            color 100ms ease,
            border-color 100ms ease;
    }
    .icon-btn:hover {
        background: var(--foreground);
        color: var(--background);
        border-color: var(--foreground);
    }
    .icon-btn--commit:hover {
        background: var(--color-brand-500, var(--foreground));
        border-color: var(--color-brand-500, var(--foreground));
        color: var(--background);
    }
</style>
```
