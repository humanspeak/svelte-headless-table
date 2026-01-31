import { BodyRow, DataBodyRow, getBodyRows, getColumnedBodyRows } from '$lib/bodyRows.js'
import { FlatColumn, getFlatColumns, type Column } from '$lib/columns.js'
import type { Table } from '$lib/createTable.js'
import { getHeaderRows, HeaderRow } from '$lib/headerRows.js'
import type {
    AnyPlugins,
    DeriveFlatColumnsFn,
    DeriveFn,
    DeriveRowsFn,
    PluginStates
} from '$lib/types/TablePlugin.js'
import { finalizeAttributes } from '$lib/utils/attributes.js'
import { nonUndefined } from '$lib/utils/filter.js'
import { derived, readable, writable, type Readable, type Writable } from 'svelte/store'

/* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
export type TableAttributes<Item, Plugins extends AnyPlugins = AnyPlugins> = Record<
    string,
    unknown
> & {
    role: 'table'
}

/* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
export type TableHeadAttributes<Item, Plugins extends AnyPlugins = AnyPlugins> = Record<
    string,
    unknown
>

/* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
export type TableBodyAttributes<Item, Plugins extends AnyPlugins = AnyPlugins> = Record<
    string,
    unknown
> & {
    role: 'rowgroup'
}

export interface ViewModelDebug {
    /** Number of plugins active */
    pluginCount: number
    /** Names of active plugins */
    pluginNames: string[]
    /** Number of derived stores in each chain */
    derivedStoreCount: {
        tableAttrs: number
        tableHeadAttrs: number
        tableBodyAttrs: number
        visibleColumns: number
        rows: number
        pageRows: number
    }
    /** Counters that increment on each derivation execution */
    derivationCalls: {
        tableAttrs: number
        tableHeadAttrs: number
        tableBodyAttrs: number
        visibleColumns: number
        columnedRows: number
        rows: number
        injectedRows: number
        pageRows: number
        injectedPageRows: number
        headerRows: number
    }
    /** Reset all derivation call counters to 0 */
    resetCounters: () => void
    /** Get total derivation calls since last reset */
    getTotalCalls: () => number
}

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

export type ReadOrWritable<T> = Readable<T> | Writable<T>
export interface PluginInitTableState<Item, Plugins extends AnyPlugins = AnyPlugins> extends Omit<
    TableViewModel<Item, Plugins>,
    'pluginStates' | '_debug'
> {
    data: ReadOrWritable<Item[]>
    columns: Column<Item, Plugins>[]
}

export interface TableState<Item, Plugins extends AnyPlugins = AnyPlugins> extends Omit<
    TableViewModel<Item, Plugins>,
    '_debug'
> {
    data: ReadOrWritable<Item[]>
    columns: Column<Item, Plugins>[]
}

export interface CreateViewModelOptions<Item> {
    /* trunk-ignore(eslint/no-unused-vars) */
    rowDataId?: (item: Item, index: number) => string
}

export const createViewModel = <Item, Plugins extends AnyPlugins = AnyPlugins>(
    table: Table<Item, Plugins>,
    columns: Column<Item, Plugins>[],
    { rowDataId }: CreateViewModelOptions<Item> = {}
): TableViewModel<Item, Plugins> => {
    const { data, plugins } = table

    // Initialize derivation call counters for debug instrumentation
    const derivationCalls = {
        tableAttrs: 0,
        tableHeadAttrs: 0,
        tableBodyAttrs: 0,
        visibleColumns: 0,
        columnedRows: 0,
        rows: 0,
        injectedRows: 0,
        pageRows: 0,
        injectedPageRows: 0,
        headerRows: 0
    }

    const $flatColumns = getFlatColumns(columns)
    const flatColumns = readable($flatColumns)

    const originalRows = derived([data, flatColumns], ([$data, $flatColumns]) => {
        return getBodyRows($data, $flatColumns, { rowDataId })
    })

    // _stores need to be defined first to pass into plugins for initialization.
    const _visibleColumns = writable<FlatColumn<Item, Plugins>[]>([])
    const _headerRows = writable<HeaderRow<Item, Plugins>[]>()
    const _rows = writable<DataBodyRow<Item, Plugins>[]>([])
    const _pageRows = writable<DataBodyRow<Item, Plugins>[]>([])
    const _tableAttrs = writable<TableAttributes<Item>>({
        role: 'table' as const
    })
    const _tableHeadAttrs = writable<TableHeadAttributes<Item>>({})
    const _tableBodyAttrs = writable<TableBodyAttributes<Item>>({
        role: 'rowgroup' as const
    })
    const pluginInitTableState: PluginInitTableState<Item, Plugins> = {
        data,
        columns,
        flatColumns: $flatColumns,
        tableAttrs: _tableAttrs,
        tableHeadAttrs: _tableHeadAttrs,
        tableBodyAttrs: _tableBodyAttrs,
        visibleColumns: _visibleColumns,
        headerRows: _headerRows,
        originalRows,
        rows: _rows,
        pageRows: _pageRows
    }

    const pluginInstances = Object.fromEntries(
        Object.entries(plugins).map(([pluginName, plugin]) => {
            const columnOptions = Object.fromEntries(
                $flatColumns
                    .map((c) => {
                        const option = c.plugins?.[pluginName]
                        if (option === undefined) return undefined
                        return [c.id, option] as const
                    })
                    .filter(nonUndefined)
            )
            return [
                pluginName,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                plugin({ pluginName, tableState: pluginInitTableState as any, columnOptions })
            ]
        })
    ) as {
        [K in keyof Plugins]: ReturnType<Plugins[K]>
    }

    const pluginStates = Object.fromEntries(
        Object.entries(pluginInstances).map(([key, pluginInstance]) => [
            key,
            pluginInstance.pluginState
        ])
    ) as PluginStates<Plugins>

    const tableState: TableState<Item, Plugins> = {
        data,
        columns,
        flatColumns: $flatColumns,
        tableAttrs: _tableAttrs,
        tableHeadAttrs: _tableHeadAttrs,
        tableBodyAttrs: _tableBodyAttrs,
        visibleColumns: _visibleColumns,
        headerRows: _headerRows,
        originalRows,
        rows: _rows,
        pageRows: _pageRows,
        pluginStates
    }

    const deriveTableAttrsFns: DeriveFn<TableAttributes<Item>>[] = Object.values(pluginInstances)
        .map((pluginInstance) => pluginInstance.deriveTableAttrs)
        .filter(nonUndefined)
    let tableAttrs = readable<TableAttributes<Item>>({
        role: 'table'
    })
    deriveTableAttrsFns.forEach((fn) => {
        tableAttrs = fn(tableAttrs)
    })
    const finalizedTableAttrs = derived(tableAttrs, ($tableAttrs) => {
        derivationCalls.tableAttrs++
        const $finalizedAttrs = finalizeAttributes($tableAttrs) as TableAttributes<Item>
        _tableAttrs.set($finalizedAttrs)
        return $finalizedAttrs
    })

    const deriveTableHeadAttrsFns: DeriveFn<TableHeadAttributes<Item>>[] = Object.values(
        pluginInstances
    )
        .map((pluginInstance) => pluginInstance.deriveTableBodyAttrs)
        .filter(nonUndefined)
    let tableHeadAttrs = readable<TableHeadAttributes<Item>>({})
    deriveTableHeadAttrsFns.forEach((fn) => {
        tableHeadAttrs = fn(tableHeadAttrs)
    })
    const finalizedTableHeadAttrs = derived(tableHeadAttrs, ($tableHeadAttrs) => {
        derivationCalls.tableHeadAttrs++
        const $finalizedAttrs = finalizeAttributes($tableHeadAttrs) as TableHeadAttributes<Item>
        _tableHeadAttrs.set($finalizedAttrs)
        return $finalizedAttrs
    })

    const deriveTableBodyAttrsFns: DeriveFn<TableBodyAttributes<Item>>[] = Object.values(
        pluginInstances
    )
        .map((pluginInstance) => pluginInstance.deriveTableBodyAttrs)
        .filter(nonUndefined)
    let tableBodyAttrs = readable<TableBodyAttributes<Item>>({
        role: 'rowgroup'
    })
    deriveTableBodyAttrsFns.forEach((fn) => {
        tableBodyAttrs = fn(tableBodyAttrs)
    })
    const finalizedTableBodyAttrs = derived(tableBodyAttrs, ($tableBodyAttrs) => {
        derivationCalls.tableBodyAttrs++
        const $finalizedAttrs = finalizeAttributes($tableBodyAttrs) as TableBodyAttributes<Item>
        _tableBodyAttrs.set($finalizedAttrs)
        return $finalizedAttrs
    })

    const deriveFlatColumnsFns: DeriveFlatColumnsFn<Item>[] = Object.values(pluginInstances)
        .map((pluginInstance) => pluginInstance.deriveFlatColumns)
        .filter(nonUndefined)

    let visibleColumns = flatColumns
    deriveFlatColumnsFns.forEach((fn) => {
        // Variance of generic type here is unstable. Not sure how to fix.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visibleColumns = fn(visibleColumns as any) as any
    })

    const injectedColumns = derived(visibleColumns, ($visibleColumns) => {
        derivationCalls.visibleColumns++
        _visibleColumns.set($visibleColumns)
        return $visibleColumns
    })

    const columnedRows = derived(
        [originalRows, injectedColumns],
        ([$originalRows, $injectedColumns]) => {
            derivationCalls.columnedRows++
            return getColumnedBodyRows(
                $originalRows,
                $injectedColumns.map((c) => c.id)
            )
        }
    )

    const deriveRowsFns: DeriveRowsFn<Item>[] = Object.values(pluginInstances)
        .map((pluginInstance) => pluginInstance.deriveRows)
        .filter(nonUndefined)

    let rows = columnedRows
    deriveRowsFns.forEach((fn) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows = fn(rows as any) as any
    })

    const injectedRows = derived(rows, ($rows) => {
        derivationCalls.injectedRows++
        // Inject state.
        $rows.forEach((row) => {
            row.injectState(tableState)
            row.cells.forEach((cell) => {
                cell.injectState(tableState)
            })
        })
        // Apply plugin component hooks.
        Object.entries(pluginInstances).forEach(([pluginName, pluginInstance]) => {
            $rows.forEach((row) => {
                if (pluginInstance.hooks?.['tbody.tr'] !== undefined) {
                    row.applyHook(pluginName, pluginInstance.hooks['tbody.tr'](row))
                }
                row.cells.forEach((cell) => {
                    if (pluginInstance.hooks?.['tbody.tr.td'] !== undefined) {
                        cell.applyHook(pluginName, pluginInstance.hooks['tbody.tr.td'](cell))
                    }
                })
            })
        })
        _rows.set($rows)
        return $rows
    })

    const derivePageRowsFns: DeriveRowsFn<Item>[] = Object.values(pluginInstances)
        .map((pluginInstance) => pluginInstance.derivePageRows)
        .filter(nonUndefined)

    // Must derive from `injectedRows` instead of `rows` to ensure that `_rows` is set.
    let pageRows = injectedRows
    derivePageRowsFns.forEach((fn) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pageRows = fn(pageRows as any) as any
    })

    const injectedPageRows = derived(pageRows, ($pageRows) => {
        derivationCalls.injectedPageRows++
        // Inject state.
        $pageRows.forEach((row) => {
            row.injectState(tableState)
            row.cells.forEach((cell) => {
                cell.injectState(tableState)
            })
        })
        // Apply plugin component hooks.
        Object.entries(pluginInstances).forEach(([pluginName, pluginInstance]) => {
            $pageRows.forEach((row) => {
                if (pluginInstance.hooks?.['tbody.tr'] !== undefined) {
                    row.applyHook(pluginName, pluginInstance.hooks['tbody.tr'](row))
                }
                row.cells.forEach((cell) => {
                    if (pluginInstance.hooks?.['tbody.tr.td'] !== undefined) {
                        cell.applyHook(pluginName, pluginInstance.hooks['tbody.tr.td'](cell))
                    }
                })
            })
        })
        _pageRows.set($pageRows)
        return $pageRows
    })

    const headerRows = derived(injectedColumns, ($injectedColumns) => {
        derivationCalls.headerRows++
        const $headerRows = getHeaderRows(
            columns,
            $injectedColumns.map((c) => c.id)
        )
        // Inject state.
        $headerRows.forEach((row) => {
            row.injectState(tableState)
            row.cells.forEach((cell) => {
                cell.injectState(tableState)
            })
        })
        // Apply plugin component hooks.
        Object.entries(pluginInstances).forEach(([pluginName, pluginInstance]) => {
            $headerRows.forEach((row) => {
                if (pluginInstance.hooks?.['thead.tr'] !== undefined) {
                    row.applyHook(pluginName, pluginInstance.hooks['thead.tr'](row))
                }
                row.cells.forEach((cell) => {
                    if (pluginInstance.hooks?.['thead.tr.th'] !== undefined) {
                        cell.applyHook(pluginName, pluginInstance.hooks['thead.tr.th'](cell))
                    }
                })
            })
        })
        _headerRows.set($headerRows)
        return $headerRows
    })

    const _debug: ViewModelDebug = {
        pluginCount: Object.keys(plugins).length,
        pluginNames: Object.keys(plugins),
        derivedStoreCount: {
            tableAttrs: deriveTableAttrsFns.length + 1, // +1 for finalized
            tableHeadAttrs: deriveTableHeadAttrsFns.length + 1,
            tableBodyAttrs: deriveTableBodyAttrsFns.length + 1,
            visibleColumns: deriveFlatColumnsFns.length + 1, // +1 for injected
            rows: deriveRowsFns.length + 2, // +2 for columned + injected
            pageRows: derivePageRowsFns.length + 1 // +1 for injected
        },
        derivationCalls,
        resetCounters: () => {
            Object.keys(derivationCalls).forEach((key) => {
                derivationCalls[key as keyof typeof derivationCalls] = 0
            })
        },
        getTotalCalls: () => {
            return Object.values(derivationCalls).reduce((sum, count) => sum + count, 0)
        }
    }

    return {
        tableAttrs: finalizedTableAttrs,
        tableHeadAttrs: finalizedTableHeadAttrs,
        tableBodyAttrs: finalizedTableBodyAttrs,
        visibleColumns: injectedColumns,
        flatColumns: $flatColumns,
        headerRows,
        originalRows,
        rows: injectedRows,
        pageRows: injectedPageRows,
        pluginStates,
        _debug
    }
}
