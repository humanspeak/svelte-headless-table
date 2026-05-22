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
